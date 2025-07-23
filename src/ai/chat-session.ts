import { mapChatMessagesToStoredMessages, mapStoredMessageToChatMessage, StoredMessage } from "@langchain/core/messages";
import { mkdir, readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { ulid } from "ulid";
import writeFileAtomic from "write-file-atomic";

import { IChatServiceOptions } from "./chat-service.js";
import { CustomMessage, isCustomMessage, TMessage } from "./custom-messages.js";

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
        chatServiceOptions: session.chatServiceOptions,
        messages: session.messages.map(mapMessageToObject).filter(m => m),
    };
}

export function mapSessionDataToSession(data: any): IChatSession
{
    return {
        id: data.id,
        workDir: data.workDir,
        readOnly: data.readOnly,
        chatServiceOptions: data.chatServiceOptions,
        messages: data.messages.map(mapObjectToMessage).filter((m: TMessage | undefined) => m),
    };
}

export interface IChatSession
{
    id: string;

    workDir: string;
    readOnly: boolean;
    chatServiceOptions: IChatServiceOptions;

    messages: TMessage[];
}

export class ChatSession implements IChatSession
{
    id: string;

    workDir: string;
    readOnly: boolean;
    chatServiceOptions: IChatServiceOptions;

    messages: TMessage[] = [];

    storage: ISessionStorage;

    private constructor(props: IChatSession)
    {
        this.id = props.id;
        this.workDir = props.workDir;
        this.readOnly = props.readOnly;
        this.chatServiceOptions = props.chatServiceOptions;
        this.messages = props.messages;

        this.storage = new FileSessionStorage(this.workDir);
    }

    static create(props: Pick<IChatSession, "workDir" | "readOnly" | "chatServiceOptions">)
    {
        const chatSession = new ChatSession({
            id: ulid(),
            messages: [],
            ...props,
        });

        return chatSession;
    }

    static async createFromFile(filePath: string): Promise<ChatSession>
    {
        const chatSessionData = await FileSessionStorage.loadSession(filePath);

        const chatSession = new ChatSession(chatSessionData);

        return chatSession;
    }

    async setMessages(messages: TMessage[], autoSave: boolean = true): Promise<void>
    {
        const empty = messages.length === 0 && this.messages.length === 0;

        this.messages = messages;

        if (autoSave && !empty)
        {
            this.save();
        }
    }

    async save(): Promise<void>
    {
        return this.storage.saveSession(this);
    }
}

interface ISessionStorage
{
    saveSession(session: ChatSession): Promise<void>;
}

class FileSessionStorage implements ISessionStorage
{
    private readonly sessionsDir: string;

    constructor(baseDir?: string)
    {
        this.sessionsDir = join(baseDir || homedir(), ".code-bandit", "sessions");
    }

    static async loadSession(filePath: string): Promise<IChatSession>
    {
        const data = JSON.parse(await readFile(filePath, "utf8"));

        return mapSessionDataToSession(data);
    }

    async saveSession(session: ChatSession): Promise<void>
    {
        await this.ensureSessionsDir();

        const filePath = this.getSessionFilePath(session.id);

        const sessionData = mapSessionToSessionData(session);

        await writeFileAtomic(filePath, JSON.stringify(sessionData, null, 2), "utf-8");
    }

    private getSessionFilePath(sessionId: string): string
    {
        return join(this.sessionsDir, `${sessionId}.json`);
    }

    private async ensureSessionsDir(): Promise<void>
    {
        try
        {
            await mkdir(this.sessionsDir, { recursive: true });
        }
        catch (error)
        {
            // Directory might already exist, ignore EEXIST errors
            if ((error as NodeJS.ErrnoException).code !== "EEXIST")
            {
                throw error;
            }
        }
    }
}
