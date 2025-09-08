import { mapChatMessagesToStoredMessages, mapStoredMessageToChatMessage, StoredMessage } from "@langchain/core/messages";
import { ulid } from "ulid";

import { IChatServiceOptions } from "../chat-service.js";
import { CustomMessage, isCustomMessage, isMessageStreaming, TMessage, ToolProgressMessage } from "../custom-messages.js";
import { chatServerClient, mapSessionToChat } from "./chat-server/chat-server-client.js";

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
    chatServiceOptions: IChatServiceOptions;

    systemPrompt?: string; // TODO: extend into service or template like "%{DEFAULT}% ..."

    messages: TMessage[];
}

export interface ICreateChatSession extends Omit<IChatSession, "id" | "messages">
{
    id?: IChatSession["id"];
    messages?: IChatSession["messages"];
}

type TUpdateListener = (props: { messages: TMessage[]; finished: number; }) => void;

export class ChatSession implements IChatSession
{
    id: string;

    workDir: string;
    toolMode: TToolMode;
    chatServiceOptions: IChatServiceOptions;

    systemPrompt?: string;

    messages: TMessage[] = [];
    finished: number = 0;

    storage?: ISessionStorage;
    private onUpdateListeners: TUpdateListener[] = [];

    private constructor(props: IChatSession, storage: ISessionStorage | undefined)
    {
        this.id = props.id;
        this.workDir = props.workDir;
        this.toolMode = props.toolMode || "confirm";
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

    setStorage = (storage: ISessionStorage): ChatSession =>
    {
        this.storage = storage;
        return this;
    };

    notifyListeners = (): void =>
    {
        const props = { messages: [...this.messages], finished: this.finished };
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

    setMessages = async (messages: TMessage[]): Promise<void> =>
    {
        this.messages = [...messages];

        this._saveOnline();

        this.notifyListeners();
    };

    toggleConfirmState = async (messageIndex: number, direction: -1 | 1): Promise<void> =>
    {
        if (ToolProgressMessage.isTypeOf(this.messages[messageIndex]))
        {
            const newMessages = [
                ...this.messages.slice(0, messageIndex),
                (this.messages[messageIndex] as ToolProgressMessage).toggleConfirmState({ direction }),
                ...this.messages.slice(messageIndex + 1),
            ];

            await this.setMessages(newMessages);
        }
    };

    private _saveQueue: Promise<void> = Promise.resolve();
    save = async (): Promise<void> =>
    {
        this._saveOnline();

        if (!this.storage)
        {
            throw new Error("No storage configured!");
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

    private _saveOnlineQueue: Promise<void> = Promise.resolve();
    _saveOnline = (): Promise<void> =>
    {
        this._saveOnlineQueue = this._saveOnlineQueue
            .then(async () =>
            {
                console.log("SAVE ONLINE?");
                if (this.messages.find(m => isMessageStreaming(m)))
                {
                    return;
                }

                await chatServerClient?.upsertDocument(this.id, { data: mapSessionToChat(this) });
                console.log("SAVED ONLINE!");
            })
            .catch((error) =>
            {
                console.error("ERROR: Session save failed!", error);
            });

        return this._saveOnlineQueue;
    };

    flush = async (): Promise<void> =>
    {
        await this._saveOnlineQueue;
        await this._saveQueue;
    };
}
