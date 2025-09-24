import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";

import { ErrorMessage, isMessageStreaming, TMessage, TMessageType, ToolProgressMessage } from "../../custom-messages.js";
import { ChatSession, TToolMode } from "../session.js";
import { ApiClient, IApiClientCommandListener } from "./api-client.js";
import { IChat, IChatMessage } from "./types.js";

const MESSAGE_BASE = {
    history: [],
    historyIndex: 0,
    createdAt: Date.now(),
};

function mapMessage(message: TMessage): IChatMessage
{
    const type: TMessageType = message.getType();

    if (type === "tool-progress")
    {
        const toolProgressMessage = message as ToolProgressMessage;

        return {
            ...MESSAGE_BASE,
            role: "tool-progress",
            content: toolProgressMessage.content ?? "",
            toolCall: {
                ...toolProgressMessage.toolCall,
                status: toolProgressMessage.status,
                confirmState: toolProgressMessage.confirmState,
                description: toolProgressMessage.info.description,
                fileName: toolProgressMessage.info.fileName,
            },
        };
    }

    if (type === "error")
    {
        const errorMessage = message as ErrorMessage;

        return {
            ...MESSAGE_BASE,
            role: type,
            content: errorMessage.content,
            privateData: errorMessage,
        };
    }

    if (type === "human")
    {
        const userMessage = message as HumanMessage;

        return {
            ...MESSAGE_BASE,
            role: "user",
            content: userMessage.text,
        };
    }

    if (type === "ai")
    {
        const assistantMessage = message as AIMessage;

        return {
            ...MESSAGE_BASE,
            hidden: assistantMessage.text.length === 0,
            role: "assistant",
            content: assistantMessage.text,
        };
    }

    if (type === "system")
    {
        return {
            ...MESSAGE_BASE,
            role: type,
            content: (message as BaseMessage).text,
        };
    }

    return {
        ...MESSAGE_BASE,
        role: "private",
        hidden: true,
        content: (message as BaseMessage).text,
        privateData: message,
    };
}

function mapSessionToChat(session: ChatSession): IChat
{
    const messages = session.messages.map(mapMessage);

    if (session.isWorking && messages[messages.length - 1]?.role !== "assistant")
    {
        messages.push({ ...MESSAGE_BASE, role: "assistant", "content": "", state: "working" });
    }

    const chat: IChat = {
        id: session.id,
        model: {
            id: "langchain",
            account: {
                id: "langchain",
                name: "langchain",
            },
            name: session.chatServiceOptions.model,
            provider: "langchain",
            state: { ready: true },
        },
        workspace: {
            workDir: session.workDir,
        },
        toolMode: session.toolMode,
        messages,
        state: session.isWorking ? "working" : "done",
    };

    return chat;
}

class ChatServerClient implements IApiClientCommandListener
{
    private apiClient: ApiClient;
    private session: ChatSession;

    private lastStreamingSync = Date.now();
    private isWorking: boolean | undefined = undefined;

    private constructor(apiClient: ApiClient, session: ChatSession)
    {
        this.apiClient = apiClient;
        this.session = session;

        apiClient.addCommandListener(this);
        session.onUpdate(props => this.handleSessionUpdate(props));
    }

    static create(session: ChatSession): ChatServerClient | undefined
    {
        const URL = process.env["CODE_BANDIT_SERVER_URL"];
        const PAT = process.env["CODE_BANDIT_SERVER_PAT"];

        const apiClient = URL && PAT ? new ApiClient({ baseUrl: URL, token: PAT }) : undefined;

        if (!apiClient)
        {
            return undefined;
        }

        const chatServerClient = new ChatServerClient(apiClient, session);

        apiClient.start().then(() => chatServerClient.syncSession());

        return chatServerClient;
    }

    handleCommand = (payload: any) =>
    {
        // console.log("CMD?", payload.new?.external_id);

        if (payload.new?.external_id === `${this.session.id}/cmd`)
        {
            if (!this.session.isWorking && payload.new.data?.content?.length)
            {
                this.session.generateResponse([
                    ...this.session.messages,
                    new HumanMessage(payload.new.data.content),
                ]);
            }
        }
        else if (payload.new?.external_id === `${this.session.id}/confirm`)
        {
            if (!this.session.isWorking && payload.new.data?.message_index)
            {
                this.session.confirmToolUse(payload.new.data.message_index, payload.new.data.confirm_state);
            }
        }
        else if (payload.new?.external_id === `${this.session.id}/abort`)
        {
            if (this.session.isWorking)
            {
                this.session.abort(payload.new.data?.reason || "User cancelled.");
            }
        }
    };

    handleConnection = (connected: boolean) =>
    {
        if (connected)
        {
            this.session.onlineMode = "ONLINE";
            this.session.notifyListeners();
            this.syncSession(true);
        }
        else
        {
            this.session.onlineMode = "OFFLINE";
            this.session.notifyListeners();
        }
    };

    handleError = (message: string, level: "debug" | "warn" | "error" = "error", error?: Error) =>
    {
        this.session.setMessages([
            ...this.session.messages,
            new ErrorMessage(message, level, error),
        ]);
    };

    private handleSessionUpdate = (_props: { messages: TMessage[]; working: boolean; toolMode: TToolMode }) =>
    {
        this._saveOnline();
    };

    private syncSession = async (force: boolean = false) =>
    {
        // update working status online if changed ...
        if (force || this.session.isWorking !== this.isWorking || this.isWorking === undefined)
        {
            this.apiClient.setStatus({
                external_id: this.session.id,
                status: this.session.isWorking ? "working" : "idle",
                optional: { working_message_index: this.session.messages.findIndex(m => isMessageStreaming(m)) },
            });

            this.isWorking = this.session.isWorking;
        }

        const aiMessage = this.session.messages.find(m => isMessageStreaming(m)) as (BaseMessage | undefined);

        // console.log("SYNC", force, aiMessage ? "STREAM" : "SYNC");

        if (aiMessage)
        {
            if (Date.now() > this.lastStreamingSync + 100)
            {
                this.lastStreamingSync = Date.now();

                await this.pushStreamingMessageOnline(aiMessage.text);
            }

            return;
        }

        await this.pushSessionOnline();
    };

    private pushSessionOnline = async () =>
    {
        await this.apiClient.directUpsertDocument(this.session.id, { data: mapSessionToChat(this.session) });
    };

    private pushStreamingMessageOnline = async (content: string) =>
    {
        await this.apiClient.directUpsertDocument(this.session.id + "/rt", {
            data: {
                type: "chunk",
                external_id: this.session.id,
                chat_id: this.session.id,
                message_number: this.session.messages.length - 1,
                content,
            },
        });
    };

    private _saveOnlineQueue: Promise<void> = Promise.resolve();
    _saveOnline = (): Promise<void> =>
    {
        this._saveOnlineQueue = this._saveOnlineQueue
            .then(async () =>
            {
                await this.syncSession();
            })
            .catch((error) =>
            {
                this.handleError("Saving session failed", "error", error);
            });

        return this._saveOnlineQueue;
    };
}

async function startChatServerClient(session: ChatSession)
{
    ChatServerClient.create(session);
}

export
{
    ChatServerClient,
    startChatServerClient,
};

