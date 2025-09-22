import { mapChatMessagesToStoredMessages, mapStoredMessageToChatMessage, StoredMessage } from "@langchain/core/messages";
import { ulid } from "ulid";

import { ChatService, IChatServiceOptions } from "../chat-service.js";
import { CustomMessage, ErrorMessage, isCustomMessage, isMessageStreaming, resetIsStreamingFlag, TMessage, ToolProgressMessage } from "../custom-messages.js";
import { work } from "../work.js";

export type TToolMode = "confirm" | "read-only" | "yolo";

export interface ISessionStorage
{
    saveSession(session: ChatSession): Promise<void>;
}

export function mapMessageToObject(msg: TMessage): CustomMessage | StoredMessage | undefined
{
    try
    {
        return isCustomMessage(msg) ? msg : mapChatMessagesToStoredMessages([msg])[0];
    }
    catch (e)
    {
        // TODO: show warning
        return undefined;
    }
}

export function mapObjectToMessage(obj: any): TMessage | undefined
{
    try
    {
        return isCustomMessage(obj) ? CustomMessage.fromObject(obj) : mapStoredMessageToChatMessage(obj);
    }
    catch (e)
    {
        // TODO: show warning
        return undefined;
    }
}

export function mapSessionToSessionData(session: IChatSession)
{
    return {
        id: session.id,
        workDir: session.workDir,
        toolMode: session.toolMode || "confirm",
        streaming: session.streaming,
        chatServiceOptions: session.chatServiceOptions,
        systemPrompt: session.systemPrompt,
        messages: session.messages.map(mapMessageToObject).filter(m => m),
    };
}

export function mapSessionDataToSession(data: any): IChatSession
{
    return {
        id: data.id,
        workDir: data.workDir,
        toolMode: data.toolMode || "confirm",
        streaming: data.streaming || true,
        chatServiceOptions: data.chatServiceOptions,
        systemPrompt: data.systemPrompt,
        messages: data.messages.map(mapObjectToMessage).filter((m: TMessage | undefined) => m),
    };
}

export interface IChatSession
{
    id: string;

    workDir: string;
    toolMode: TToolMode;
    streaming: boolean;
    chatServiceOptions: IChatServiceOptions;

    systemPrompt?: string; // TODO: extend into service or template like "%{DEFAULT}% ..."

    messages: TMessage[];
}

export interface ICreateChatSession extends Omit<IChatSession, "id" | "messages">
{
    id?: IChatSession["id"];
    messages?: IChatSession["messages"];
}

type TUpdateListener = (props: { messages: TMessage[]; working: boolean; toolMode: TToolMode }) => void;

export class ChatSession implements IChatSession
{
    id: string;

    workDir: string;
    toolMode: TToolMode;
    chatServiceOptions: IChatServiceOptions;
    streaming: boolean;

    systemPrompt?: string;

    messages: TMessage[] = [];

    private chatService?: ChatService;

    storage?: ISessionStorage;
    private onUpdateListeners: TUpdateListener[] = [];

    private abortController?: AbortController;

    private constructor(props: IChatSession, storage: ISessionStorage | undefined)
    {
        this.id = props.id;
        this.workDir = props.workDir;
        this.toolMode = props.toolMode || "confirm";
        this.streaming = props.streaming || true;
        this.chatServiceOptions = props.chatServiceOptions;
        this.systemPrompt = props.systemPrompt;
        this.messages = props.messages || [];

        this.storage = storage;
    }

    static create(props: ICreateChatSession, storage?: ISessionStorage)
    {
        const chatSession = new ChatSession({
            ...props,
            id: props.id || ulid(),
            messages: props.messages || [],
        }, storage);

        return chatSession;
    }

    setChatService = (chatService: ChatService): ChatSession =>
    {
        this.chatService = chatService;
        return this;
    };

    setStorage = (storage: ISessionStorage): ChatSession =>
    {
        this.storage = storage;
        return this;
    };

    notifyListeners = (): void =>
    {
        const props = { messages: [...this.messages], working: this.#isWorking, toolMode: this.toolMode };
        this.onUpdateListeners.forEach(listener => listener(props));
    };

    onUpdate = (listener: TUpdateListener): (() => void) =>
    {
        this.onUpdateListeners.push(listener);

        return () =>
        {
            this.onUpdateListeners = this.onUpdateListeners.filter(l => l !== listener);
        };
    };

    #isStreaming = false;

    get isStreaming()
    {
        return this.#isStreaming;
    }

    setMessages = (messages: TMessage[]): void =>
    {
        this.messages = [...messages];
        this.#isStreaming = !!messages.find(m => isMessageStreaming(m));

        this.notifyListeners();
    };

    #isWorking = false;

    private set isWorking(isWorking: boolean)
    {
        this.#isWorking = isWorking;
    }

    get isWorking(): boolean
    {
        return this.#isWorking;
    }

    get isAborted(): boolean
    {
        return !!this.abortController?.signal?.aborted;
    }

    generateResponse = (messages: TMessage[]) =>
    {
        if (this.#isWorking || !this.chatService)
        {
            return;
        }

        this.#isWorking = true;
        this.setMessages(messages);

        this.abortController = new AbortController();

        work({
            session: this,
            chatService: this.chatService,  // TODO: can't work use session.chatService?
            signal: this.abortController.signal,
        })
            .then(messages =>
            {
                this.#isWorking = false;
                this.setMessages(messages);
            })
            .catch(error =>
            {
                const newMessages = [
                    ...resetIsStreamingFlag(this.messages),
                    new ErrorMessage(`ERROR: running work({...}) failed with: ${error.message || error.toString()}`, error),
                ];
                this.#isWorking = false;
                this.setMessages(newMessages);
            })
            .then(async () => 
            {
                await this.flush();
            })
            .finally(() =>
            {
                this.abortController = undefined;
            });
    };

    abort = (reason: string) =>
    {
        if (this.abortController && !this.abortController.signal.aborted)
        {
            this.abortController?.abort(reason);
            this.notifyListeners();
        }
    };

    toggleConfirmState = (messageIndex: number, direction: -1 | 1): void =>
    {
        if (ToolProgressMessage.isTypeOf(this.messages[messageIndex]))
        {
            const newMessages = [
                ...this.messages.slice(0, messageIndex),
                (this.messages[messageIndex] as ToolProgressMessage).toggleConfirmState({ direction }),
                ...this.messages.slice(messageIndex + 1),
            ];

            this.setMessages(newMessages);
        }
    };

    confirmToolUse = async (messageIndex: number, confirmState: ToolProgressMessage["confirmState"]): Promise<void> =>
    {
        if (confirmState === "none")
        {
            this.toolMode = "read-only";
        }
        else if (confirmState === "all")
        {
            this.toolMode = "yolo";
        }

        // TODO: reset all other pending tools when toolMode changed!

        this.generateResponse([
            ...this.messages.slice(0, messageIndex),
            (this.messages[messageIndex] as ToolProgressMessage).clone({
                status: (confirmState === "yes" || confirmState === "all") ? "confirmed" : "declined",
                confirmState,
            }),
            ...this.messages.slice(messageIndex + 1),
        ]);
    };

    setToolMode = (toolMode: TToolMode) =>
    {
        this.toolMode = toolMode;
        this.notifyListeners();
    };

    private _saveQueue: Promise<void> = Promise.resolve();
    private _save = async (): Promise<void> =>
    {
        if (!this.storage || !this.#isStreaming)
        {
            return Promise.resolve();
        }

        this._saveQueue = this._saveQueue
            .then(async () =>
            {
                await this.storage!.saveSession(this);
            })
            .catch((error) =>
            {
                console.error("ERROR: Session save failed!", error);
            });

        return this._saveQueue;
    };
    flush = async (): Promise<void> =>
    {
        this._save();
        await this._saveQueue;
    };
}
