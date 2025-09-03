// A simple, configurable client library for the documents and links APIs.

import { createClient, RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export interface AuthData
{
    user_id: string;
    access_token: string;
    api_url: string;
    api_key: string;
    channel: string;
}

export interface ClientStatus
{
    type: "consumer-client" | "super-client";
    user_id: string;
    external_id: string;
    status: "idle" | "working";
}

export interface Document 
{
    id: string; // Internal UUID
    external_id: string | null;
    user_id: string;
    schema_id: string | null;
    data: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface Link 
{
    id: string;
    user_id: string;
    from_id: string;
    to_id: string;
    type: string;
    created_at: string;
}

// Type for creating a new document, with optional external_id and links
export interface NewDocument 
{
    data: Record<string, any>;
    external_id?: string;
    schema_id?: string | null;
    links?: Array<{ to_id: string; type?: string } | { from_id: string; type?: string }>;
}

export type NewLink = {
    from_id: string;
    to_id: string;
    type?: string;
};

export interface ApiClientOptions 
{
    baseUrl?: string;
    token?: string;
}

export type SSESubscription = {
    close: () => void;
};

type TCommandListenerFunc = (payload: any) => void;

// export class Mutex
// {
//     private _locked = false;
//     private _queue: (() => void)[] = [];

//     async acquire(): Promise<() => void>
//     {
//         while (this._locked)
//         {
//             await new Promise<void>(resolve => this._queue.push(resolve));
//         }

//         this._locked = true;

//         return () =>
//         {
//             this._locked = false;
//             // resume the next waiter (if any)
//             this._queue.shift()?.();
//         };
//     }
// }

class ApiClient 
{
    private baseUrl: string;
    private token?: string;

    private authData?: AuthData;

    private supabase?: SupabaseClient;
    private channel?: RealtimeChannel;

    private commandListeners: TCommandListenerFunc[] = [];

    constructor(options: ApiClientOptions = {}) 
    {
        this.baseUrl = options.baseUrl || "";
        this.token = options.token;
    }

    private async _request<T>(path: string, options: RequestInit): Promise<T> 
    {
        const url = new URL(path, this.baseUrl).href;
        const headers = new Headers(options.headers || {});
        headers.set("Content-Type", "application/json");

        if (this.token) 
        {
            headers.set("Authorization", `Bearer ${this.token}`);
        }

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) 
        {
            const errorBody = await response.json().catch(() => ({ error: `Request failed with status ${response.status}` }));
            throw new Error(errorBody.error || "An unknown error occurred");
        }

        const text = await response.text();
        return text ? JSON.parse(text) as T : {} as T;
    }

    // --- ----
    addCommandListener(f: TCommandListenerFunc)
    {
        if (!this.commandListeners.includes(f))
        {
            this.commandListeners.push(f);
        }
    };

    removeCommandListener(f: TCommandListenerFunc)
    {
        const i = this.commandListeners.indexOf(f);

        if (i !== -1)
        {
            this.commandListeners.splice(i, 1);
        }
    };

    private pushCommand(payload: any)
    {
        console.log("PAYLOAD", payload);

        for (const f of this.commandListeners)
        {
            if (payload.table === "documents" && payload.eventType === "INSERT" && payload.new?.data?.external_id)
            {
                f(payload.new.data);
            }
        }
    }

    // --- Auth API ---

    getAuthData(): Promise<AuthData>
    {
        return this._request<AuthData>("api/auth/access-token", { method: "POST" });
    }

    // --- Realtime API ---

    private async ensureSupabaseClient()
    {
        if (this.supabase)
        {
            return this.supabase;
        }

        const authData = await this.getAuthData();

        const supabase = createClient(authData.api_url, authData.api_key, {
            accessToken: async () => 
            {
                console.log("GET ACCESS-TOKEN");
                return authData.access_token;
            },
        });

        this.supabase = supabase;
        this.authData = authData;

        this.channel = await supabase.channel(authData.channel)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "documents",
                    filter: `user_id=eq.${authData.user_id}`,
                },
                (payload: any) => this.pushCommand(payload),
            )
            .on("broadcast", { event: "command" }, (args: any) => this.pushCommand({ args }))
            .on("presence", { event: "sync" }, () => this.pushCommand({ presenceState: this.channel?.presenceState() }))
            .on("presence", { event: "join" }, (args: any) => this.pushCommand({ args, presenceState: this.channel?.presenceState() }))
            .on("presence", { event: "leave" }, (args: any) => this.pushCommand({ args, presenceState: this.channel?.presenceState() }));

        this.channel.subscribe(async (status: any) =>
        {
            console.log("SUBSCRIBE", status);

            // if (status !== "SUBSCRIBED")
            // {
            //     return;
            // }

            // const presenceTrackStatus = await this.channel?.track({ userId: authData.user_id, type: "super-client" });
            // console.log(presenceTrackStatus);
        });

        // await this.channel.track(currentStatus);

        return this.supabase;
    }

    async start()
    {
        await this.ensureSupabaseClient();
    }

    async setStatus(status: ClientStatus["status"], external_id: ClientStatus["external_id"])
    {
        await this.ensureSupabaseClient();

        await this.channel?.track({
            user_id: this.authData!.user_id,
            type: "super-client",
            external_id,
            status,
        } satisfies ClientStatus);
    }

    // --- Documents API ---

    listDocuments(): Promise<Document[]> 
    {
        return this._request<Document[]>("api/documents", { method: "GET" });
    }

    /**
     * List documents that directly link to the given parent/target document.
     * i.e., rows in `links` where links.to_id = targetDocumentId.
     * Optionally filter by link `type`.
     *
     * Note: The server route `GET /api/documents` must support the
     * `linked_to` (and optional `type`) query parameters.
     */
    listDocumentsLinkingTo(targetDocumentId: string, opts?: { type?: string }): Promise<Document[]> 
    {
        const searchParams = new URLSearchParams({ linked_to: targetDocumentId });
        if (opts?.type) { searchParams.set("type", opts.type); }
        return this._request<Document[]>(`api/documents?${searchParams.toString()}`, { method: "GET" });
    }

    /** Convenience alias for readability when treating the target as a parent node. */
    listChildrenOf(parentDocumentId: string, opts?: { type?: string }): Promise<Document[]> 
    {
        return this.listDocumentsLinkingTo(parentDocumentId, opts);
    }

    // --- Document access by internal UUID ---

    getDocumentById(id: string): Promise<Document> 
    {
        return this._request<Document>(`api/documents?id=${id}`, { method: "GET" });
    }

    updateDocumentById(id: string, updates: { data?: Record<string, any>, schema_id?: string | null }): Promise<Document> 
    {
        return this._request<Document>("api/documents", {
            method: "PUT",
            body: JSON.stringify({ id, ...updates }),
        });
    }

    deleteDocumentById(id: string): Promise<Document> 
    {
        return this._request<Document>(`api/documents?id=${id}`, { method: "DELETE" });
    }

    // --- Document access by external_id ---

    getDocumentByExternalId(externalId: string): Promise<Document> 
    {
        return this._request<Document>(`api/documents/external/${externalId}`, { method: "GET" });
    }

    /**
     * Creates a document if it doesn't exist, or updates it if it does.
     * @param externalId The external ID of the document to upsert.
     * @param documentData The data for the document.
     */
    upsertDocument(externalId: string, documentData: { data: Record<string, any>, schema_id?: string | null }): Promise<Document> 
    {
        return this._request<Document>(`api/documents/external/${externalId}`, {
            method: "PUT",
            body: JSON.stringify(documentData),
        });
    }

    deleteDocumentByExternalId(externalId: string): Promise<Document> 
    {
        return this._request<Document>(`api/documents/external/${externalId}`, { method: "DELETE" });
    }

    // --- Document Creation ---

    createDocument(doc: NewDocument): Promise<Document> 
    {
        return this._request<Document>("api/documents", {
            method: "POST",
            body: JSON.stringify(doc),
        });
    }

    // --- Links API ---

    createLinks(links: NewLink[]): Promise<Link[]> 
    {
        return this._request<Link[]>("api/links", {
            method: "POST",
            body: JSON.stringify(links),
        });
    }

    deleteLinkById(id: string): Promise<Link> 
    {
        return this._request<Link>(`api/links?id=${id}`, { method: "DELETE" });
    }

    deleteLinkByFromTo(params: { from_id: string; to_id: string; type?: string }): Promise<Link> 
    {
        const searchParams = new URLSearchParams({ from_id: params.from_id, to_id: params.to_id });
        if (params.type) 
        {
            searchParams.set("type", params.type);
        }
        return this._request<Link>(`api/links?${searchParams.toString()}`, { method: "DELETE" });
    }
}

export { ApiClient };
