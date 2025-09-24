// A simple, configurable client library for the documents and links APIs.

import type { REALTIME_SUBSCRIBE_STATES, RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import tryCatch from "../../../utils/try-catch.js";

export interface IAuthData
{
    user_id: string;
    access_token: string;
    expires_at: number;
    api_url: string;
    api_key: string;
    channel: string;
}

export type IClientStatusOptional =
    | string
    | number
    | boolean
    | null
    | undefined
    | { [key: string]: IClientStatusOptional | undefined }
    | IClientStatusOptional[];

export interface IClientStatus
{
    type: "consumer-client" | "super-client";
    user_id: string;
    external_id: string;
    status: "idle" | "working";
    optional?: { [key: string]: IClientStatusOptional };
}

export interface IApiClientOptions 
{
    baseUrl?: string;
    token?: string;
}

export interface IApiClientCommandListener
{
    handleCommand: (payload: any) => void;
    handleConnection: (connected: boolean) => void;
    handleError: (message: string, level?: "debug" | "warn" | "error", error?: Error) => void;
}

class ApiClient 
{
    private baseUrl: string;
    private token?: string;

    private authData?: IAuthData;

    private supabase?: SupabaseClient;
    private channel?: RealtimeChannel;

    private commandListeners: IApiClientCommandListener[] = [];

    private _initPromise?: Promise<void>;

    // Reconnection/backoff state
    private reconnectAttempt = 0;
    private reconnectTimer?: NodeJS.Timeout;

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
    addCommandListener(listener: IApiClientCommandListener)
    {
        if (!this.commandListeners.includes(listener))
        {
            this.commandListeners.push(listener);
        }
    };

    removeCommandListener(f: IApiClientCommandListener)
    {
        const i = this.commandListeners.indexOf(f);

        if (i !== -1)
        {
            this.commandListeners.splice(i, 1);
        }
    };

    private pushCommand(payload: any)
    {
        this.commandListeners.forEach(listener => tryCatch(() => listener.handleCommand(payload)));
    }

    private pushConnection(connected: boolean)
    {
        this.commandListeners.forEach(listener => tryCatch(() => listener.handleConnection(connected)));
    }

    private pushError(message: string, level: "debug" | "warn" | "error" = "error", error?: Error)
    {
        this.commandListeners.forEach(listener => tryCatch(() => listener.handleError(message, level, error)));
    }

    // --- Auth API ---

    private getAuthData(): Promise<IAuthData>
    {
        return this._request<IAuthData>("api/auth/access-token", { method: "POST" });
    }

    // --- Realtime API ---

    private getAccessToken = async () =>
    {
        if (!this.supabase || (this.authData?.expires_at || 0) > Date.now() / 1000 + 60)
        {
            return this.authData?.access_token || null;
        }

        const authData = await this.getAuthData();
        this.authData = authData;

        if (this.supabase?.realtime)
        {
            this.supabase.realtime.setAuth(authData.access_token);
        }

        return this.authData.access_token;
    };

    private createSupabaseClient = async () =>
    {
        this.authData = await this.getAuthData();

        this.pushError("AUTHDATA\n\n" + JSON.stringify(this.authData, null, 3), "debug");

        const { createClient } = await import("@supabase/supabase-js");

        const supabase = createClient(this.authData.api_url, this.authData.api_key, {
            accessToken: this.getAccessToken,
        });

        supabase.realtime.setAuth(this.authData.access_token);

        this.supabase = supabase;

        this.channel = supabase.channel(this.authData.channel)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "documents",
                    filter: `user_id=eq.${this.authData.user_id}`,
                },
                (payload: any) => this.pushCommand(payload),
            )
            // .on("broadcast", { event: "command" }, (args: any) => this.pushCommand({ args }))
            .on("presence", { event: "sync" }, () => this.pushCommand({ presenceState: this.channel?.presenceState() }))
            .on("presence", { event: "join" }, (args: any) => this.pushCommand({ args, presenceState: this.channel?.presenceState() }))
            .on("presence", { event: "leave" }, (args: any) => this.pushCommand({ args, presenceState: this.channel?.presenceState() }));

        let closed = false;

        await this.channel.subscribe((status: REALTIME_SUBSCRIBE_STATES, err) =>
        {
            if (closed)
            {
                // console.error("CHANNEL-ERROR: already closed!");
                return;
            }

            if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status))
            {
                closed = true;

                if (err)
                {
                    this.pushError(err.message);
                }

                this.pushConnection(false);

                this.closeSupabaseClient().then(() => this.scheduleReconnect(status));
            }
            else if (status === "SUBSCRIBED")
            {
                this.clearReconnectTimer();
                this.reconnectAttempt = 0;
                this.pushConnection(true);
            }
        });

        return this.supabase;
    };

    private clearReconnectTimer()
    {
        if (this.reconnectTimer)
        {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }
    }

    private scheduleReconnect(reason?: string)
    {
        // If the client is already connected or a reconnect is pending, do nothing.
        if (this.supabase || this.reconnectTimer)
        {
            return;
        }

        const attempt = ++this.reconnectAttempt;
        const base = 1000; // 1s
        const max = 30000; // 30s cap
        const delay = Math.min(max, base * Math.pow(2, attempt - 1));
        const jitter = Math.floor(Math.random() * 250);
        const totalDelay = delay + jitter;

        this.pushError(`Scheduling realtime reconnect in ${totalDelay}ms (attempt ${attempt}${reason ? ", reason: " + reason : ""})`, "debug");

        this.reconnectTimer = setTimeout(async () =>
        {
            this.reconnectTimer = undefined;
            try
            {
                await this.ensureSupabaseClient();
            }
            catch (e: any)
            {
                this.pushError("Reconnect failed.", "error", e);

                // Schedule next attempt if still not connected
                if (!this.supabase)
                {
                    this.scheduleReconnect("ensureSupabaseClient failed");
                }
            }
        }, totalDelay);
    }

    private closeSupabaseClient = async (): Promise<void> =>
    {
        if (!this.channel && !this.supabase && !this._initPromise)
        {
            return;
        }

        // Cancel any pending reconnect when we are explicitly closing
        this.clearReconnectTimer();

        await this.channel?.unsubscribe();
        this.channel = undefined;

        await this.supabase?.removeAllChannels();
        await this.supabase?.realtime?.disconnect();

        this.supabase = undefined;
        this.authData = undefined;
    };

    private async ensureSupabaseClient()
    {
        if (this.supabase)
        {
            return;
        }

        if (!this._initPromise)
        {
            this._initPromise = this.createSupabaseClient()
                .then((_supabase) =>
                {
                    // supabase should be ready now!
                })
                .catch(error =>
                {
                    this.pushError("Failed to create supabase client", "error", error);

                    // If creation fails before subscription, schedule a reconnect
                    this.scheduleReconnect("init-failed");
                })
                .finally(() =>
                {
                    this._initPromise = undefined;
                });
        }

        await this._initPromise;
    }

    async start()
    {
        await this.ensureSupabaseClient();
    }

    async setStatus(status: Pick<IClientStatus, "external_id" | "status" | "optional">)
    {
        await this.ensureSupabaseClient();

        if (this.authData?.user_id)
        {
            await this.channel?.track({
                user_id: this.authData!.user_id,
                type: "super-client",
                external_id: status.external_id,
                status: status.status,
                optional: status.optional,
            } satisfies IClientStatus);
        }
    }

    // --- Direct Supabase API ---

    async directUpsertDocument(externalId: string, documentData: { data: Record<string, any>, schema_id?: string | null })
    {
        const rpcParams = {
            p_external_id: externalId,
            p_data: documentData.data,
            p_schema_id: documentData.schema_id,
        } as const;

        await this.ensureSupabaseClient();
        await this.supabase?.rpc("upsert_document", rpcParams).select().single();
    }
}

export { ApiClient };
