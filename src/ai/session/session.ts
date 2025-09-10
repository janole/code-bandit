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

type TUpdateListener = (props: { messages: TMessage[]; finished: number; }) => void;

export class ChatSession implements IChatSession
{
    id: string;

    workDir: string;
    toolMode: TToolMode;
    chatServiceOptions: IChatServiceOptions;
    streaming: boolean;

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

    setStorage(storage: ISessionStorage): ChatSession
    {
        this.storage = storage;
        return this;
    }

    private notifyListeners(): void
    {
        const props = { messages: [...this.messages], finished: this.finished };
        this.onUpdateListeners.forEach(listener => listener(props));
    }

    public onUpdate(listener: TUpdateListener): () => void
    {
        this.onUpdateListeners.push(listener);

        return () =>
        {
            this.onUpdateListeners = this.onUpdateListeners.filter(l => l !== listener);
        };
    }

    #isStreaming = false;

    get isStreaming()
    {
        return this.#isStreaming;
    }

    {
        this.messages = messages;
        this.finished = Math.min(finished, this.messages.length);

        this.notifyListeners();
    }

    private saveQueue: Promise<any> = Promise.resolve();

    async save(): Promise<void>
    {
        if (!this.storage)
        {
            throw new Error("No storage configured!");
        }

        this.saveQueue = this.saveQueue
            .then(async () =>
            {
                await this.storage!.saveSession(this);
            })
            .catch((error) =>
            {
                console.error("ERROR: Session save failed!", error);
            });

        return this.saveQueue;
    }
}
