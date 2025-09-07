import { mapChatMessagesToStoredMessages, mapStoredMessageToChatMessage, StoredMessage } from "@langchain/core/messages";
import { ulid } from "ulid";

import { IChatServiceOptions } from "../chat-service.js";
import { CustomMessage, isCustomMessage, TMessage } from "../custom-messages.js";

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
        finished: session.finished,
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
        finished: data.finished,
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
    finished: number;
}

export interface ICreateChatSession extends Omit<IChatSession, "id" | "messages" | "finished">
{
    id?: IChatSession["id"];
    messages?: IChatSession["messages"];
    finished?: IChatSession["finished"];
}

type TUpdateListener = (messages: TMessage[], finished: number) => void;

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
        this.finished = Math.min(props.finished || 0, this.messages.length);

        this.storage = storage;
    }

    static create(props: ICreateChatSession, storage?: ISessionStorage)
    {
        const chatSession = new ChatSession({
            ...props,
            id: props.id || ulid(),
            messages: props.messages || [],
            finished: props.finished || 0,
        }, storage);

        return chatSession;
    }

    setStorage(storage: ISessionStorage): ChatSession
    {
        this.storage = storage;
        return this;
    }
    
    private notifyListeners(): void
    {
        for (const listener of this.onUpdateListeners)
        {
            listener([...this.messages], this.finished);
        }
    }

    public onUpdate(listener: TUpdateListener): () => void
    {
        this.onUpdateListeners.push(listener);
        return () =>
        {
            this.onUpdateListeners = this.onUpdateListeners.filter(l => l !== listener);
        };
    }

    async setMessages(messages: TMessage[], finished: number, autoSave: boolean = true): Promise<void>
    {
        const empty = messages.length === 0 && this.messages.length === 0;

        this.messages = messages;
        this.finished = Math.min(finished, this.messages.length);

        this.notifyListeners();

        if (autoSave && !empty)
        {
            await this.save();
        }
    }

    async save(): Promise<void>
    {
        if (!this.storage)
        {
            throw new Error("No storage configured!");
        }

        return this.storage.saveSession(this);
    }
}
