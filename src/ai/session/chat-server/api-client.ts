// A simple, configurable client library for the documents and links APIs.

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

class ApiClient 
{
    private baseUrl: string;
    private token?: string;

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

    // --- Documents API ---

    listDocuments(): Promise<Document[]> 
    {
        return this._request<Document[]>("api/documents", { method: "GET" });
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

    // --- Realtime (SSE) consumer for documents ---
    /**
     * Subscribes to server-sent events for document changes.
     * The server SSE endpoint is expected at `api/documents/realtime`.
     *
     * Usage:
     *   const sub = await apiClient.subscribeDocuments((payload) => { ... });
     *   // later: sub.close();
     *
     * Notes:
     * - In browsers EventSource does not support custom headers; the token will be passed
     *   via the `token` query parameter when running in the browser.
     * - In Node, this will try to dynamically import the `eventsource` package and set
     *   the Authorization header.
     */
    async subscribeDocuments(
        onPayload: (payload: any) => void,
        opts?: { onOpen?: () => void; onError?: (err: any) => void; eventName?: string },
    ): Promise<SSESubscription> 
    {
        const path = "api/documents/realtime";
        const urlObj = new URL(path, this.baseUrl);

        let es: any = null;
        const eventName = opts?.eventName ?? "document";

        // Browser: use native EventSource. Native EventSource cannot set headers, so pass token in query.
        if (typeof window !== "undefined" && (window as any).EventSource) 
        {
            if (this.token) 
            {
                urlObj.searchParams.set("token", this.token);
            }
            es = new (window as any).EventSource(urlObj.href);
        }
        else 
        {
            // Node environment: try to dynamically load `eventsource` package (or `eventsource` polyfill)
            try 
            {
                // prefer dynamic import                 
                // @ts-ignore
                const mod = await import("eventsource");
                const EventSourceImpl = mod.default ?? mod;

                const headers: Record<string, string> = {};
                if (this.token) 
                {
                    headers["authorization"] = `Bearer ${this.token}`;
                }

                es = new EventSourceImpl(urlObj.href, { headers });
            }
            catch 
            {
                throw new Error("EventSource is not available in this environment. Install the `eventsource` package in Node to use SSE.");
            }
        }

        const onMessage = (evt: any) => 
        {
            try 
            {
                console.log("EVT", evt);
                // evt.data may contain comments like ': ping' which should be ignored
                if (!evt?.data) { return; }
                // Some SSE libraries deliver comments as data starting with ':'. Ignore those.
                if (typeof evt.data === "string" && evt.data.trim().startsWith(":")) { return; }

                // The server uses named events like `document`; we listen to the specific event below.
                // For `message` events, parse JSON if possible and forward.
                let parsed = null;
                try 
                {
                    parsed = JSON.parse(evt.data);
                }
                catch 
                {
                    parsed = evt.data;
                }
                onPayload(parsed);
            }
            catch (err) 
            {
                // swallow user handler errors
                console.error("Error in SSE onMessage handler:", err);
            }
        };

        const onError = (err: any) => 
        {
            if (opts?.onError) { opts.onError(err); }
        };

        const onOpen = () => 
        {
            if (opts?.onOpen) { opts.onOpen(); }
        };

        // Attach listeners
        es.addEventListener("message", onMessage);
        es.addEventListener(eventName, onMessage);
        es.addEventListener("open", onOpen);
        es.addEventListener("error", onError);

        return {
            close: () => 
            {
                try 
                {
                    es.removeEventListener("message", onMessage);
                    es.removeEventListener(eventName, onMessage);
                    es.removeEventListener("open", onOpen);
                    es.removeEventListener("error", onError);
                }
                catch
                {
                    // ignore
                }
                try { es.close(); }
                catch { /* ignore */ }
            },
        };
    }
}

export { ApiClient };
