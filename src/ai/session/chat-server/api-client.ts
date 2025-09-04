// A simple, configurable client library for the documents and links APIs.

import { createClient, RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { Mutex } from "async-mutex";

export interface IAuthData
{
    user_id: string;
    access_token: string;
    api_url: string;
    api_key: string;
    channel: string;
}

export interface IClientStatus
{
    type: "consumer-client" | "super-client";
    user_id: string;
    external_id: string;
    status: "idle" | "working";
}

export interface IDocument 
{
    id: string; // Internal UUID
    external_id: string | null;
    user_id: string;
    schema_id: string | null;
    data: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface ILink 
{
    id: string;
    user_id: string;
    from_id: string;
    to_id: string;
    type: string;
    created_at: string;
}

// Type for creating a new document, with optional external_id and links
export interface INewDocument 
{
    data: Record<string, any>;
    external_id?: string;
    schema_id?: string | null;
    links?: Array<{ to_id: string; type?: string } | { from_id: string; type?: string }>;
}

export type INewLink = {
    from_id: string;
    to_id: string;
    type?: string;
};

export interface IApiClientOptions 
{
    baseUrl?: string;
    token?: string;
}

type TCommandListenerFunc = (payload: any) => void;

class ApiClient 
{
    private baseUrl: string;
    private token?: string;

    private authData?: IAuthData;

    private supabase?: SupabaseClient;
    private channel?: RealtimeChannel;

    private commandListeners: TCommandListenerFunc[] = [];

    constructor(options: IApiClientOptions = {}) 
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
        for (const f of this.commandListeners)
        {
            if (payload.args?.event === "command" && payload.args.payload)
            {
                f({
                    external_id: payload.args.payload?.external_id,
                    message: payload.args.payload?.message,
                });
            }
        }
    }

    // --- Auth API ---

    getAuthData(): Promise<IAuthData>
    {
        return this._request<IAuthData>("api/auth/access-token", { method: "POST" });
    }

    // --- Realtime API ---

    private async createSupabaseClient()
    {
        const authData = await this.getAuthData();

        const supabase = createClient(authData.api_url, authData.api_key, {
            accessToken: async () => 
            {
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

        this.channel.subscribe();

        return this.supabase;
    }

    private _mutex = new Mutex();

    private async ensureSupabaseClient()
    {
        if (!this.supabase)
        {
            const release = await this._mutex.acquire();

            try
            {
                if (!this.supabase)
                {
                    this.supabase = await this.createSupabaseClient();
                }
            }
            finally
            {
                release();
            }
        }
    }

    async start()
    {
        await this.ensureSupabaseClient();
    }

    async setStatus(status: IClientStatus["status"], external_id: IClientStatus["external_id"])
    {
        await this.ensureSupabaseClient();

        await this.channel?.track({
            user_id: this.authData!.user_id,
            type: "super-client",
            external_id,
            status,
        } satisfies IClientStatus);
    }

    // --- Documents API ---

    listDocuments(): Promise<IDocument[]> 
    {
        return this._request<IDocument[]>("api/documents", { method: "GET" });
    }

    /**
     * List documents that directly link to the given parent/target document.
     * i.e., rows in `links` where links.to_id = targetDocumentId.
     * Optionally filter by link `type`.
     *
     * Note: The server route `GET /api/documents` must support the
     * `linked_to` (and optional `type`) query parameters.
     */
    listDocumentsLinkingTo(targetDocumentId: string, opts?: { type?: string }): Promise<IDocument[]> 
    {
        const searchParams = new URLSearchParams({ linked_to: targetDocumentId });
        if (opts?.type) { searchParams.set("type", opts.type); }
        return this._request<IDocument[]>(`api/documents?${searchParams.toString()}`, { method: "GET" });
    }

    /** Convenience alias for readability when treating the target as a parent node. */
    listChildrenOf(parentDocumentId: string, opts?: { type?: string }): Promise<IDocument[]> 
    {
        return this.listDocumentsLinkingTo(parentDocumentId, opts);
    }

    // --- Document access by internal UUID ---

    getDocumentById(id: string): Promise<IDocument> 
    {
        return this._request<IDocument>(`api/documents?id=${id}`, { method: "GET" });
    }

    updateDocumentById(id: string, updates: { data?: Record<string, any>, schema_id?: string | null }): Promise<IDocument> 
    {
        return this._request<IDocument>("api/documents", {
            method: "PUT",
            body: JSON.stringify({ id, ...updates }),
        });
    }

    deleteDocumentById(id: string): Promise<IDocument> 
    {
        return this._request<IDocument>(`api/documents?id=${id}`, { method: "DELETE" });
    }

    // --- Document access by external_id ---

    getDocumentByExternalId(externalId: string): Promise<IDocument> 
    {
        return this._request<IDocument>(`api/documents/external/${externalId}`, { method: "GET" });
    }

    /**
     * Creates a document if it doesn't exist, or updates it if it does.
     * @param externalId The external ID of the document to upsert.
     * @param documentData The data for the document.
     */
    upsertDocument(externalId: string, documentData: { data: Record<string, any>, schema_id?: string | null }): Promise<IDocument> 
    {
        return this._request<IDocument>(`api/documents/external/${externalId}`, {
            method: "PUT",
            body: JSON.stringify(documentData),
        });
    }

    deleteDocumentByExternalId(externalId: string): Promise<IDocument> 
    {
        return this._request<IDocument>(`api/documents/external/${externalId}`, { method: "DELETE" });
    }

    // --- Document Creation ---

    createDocument(doc: INewDocument): Promise<IDocument> 
    {
        return this._request<IDocument>("api/documents", {
            method: "POST",
            body: JSON.stringify(doc),
        });
    }

    // --- Links API ---

    createLinks(links: INewLink[]): Promise<ILink[]> 
    {
        return this._request<ILink[]>("api/links", {
            method: "POST",
            body: JSON.stringify(links),
        });
    }

    deleteLinkById(id: string): Promise<ILink> 
    {
        return this._request<ILink>(`api/links?id=${id}`, { method: "DELETE" });
    }

    deleteLinkByFromTo(params: { from_id: string; to_id: string; type?: string }): Promise<ILink> 
    {
        const searchParams = new URLSearchParams({ from_id: params.from_id, to_id: params.to_id });
        if (params.type) 
        {
            searchParams.set("type", params.type);
        }
        return this._request<ILink>(`api/links?${searchParams.toString()}`, { method: "DELETE" });
    }
}

export { ApiClient };
