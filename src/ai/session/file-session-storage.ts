import { mkdir, readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import writeFileAtomic from "write-file-atomic";

import { chatServerClient, mapSessionToChat } from "./chat-server/chat-server-client.js";
import { ChatSession, IChatSession, ICreateChatSession, ISessionStorage, mapSessionDataToSession, mapSessionToSessionData } from "./session.js";

export class FileSessionStorage implements ISessionStorage
{
    private readonly sessionsDir: string;

    static create(session: ICreateChatSession)
    {
        return ChatSession.create(session, new FileSessionStorage());
    }

    static async createFromFile(filePath: string): Promise<ChatSession>
    {
        const chatSessionData = await FileSessionStorage.loadSession(filePath);

        return ChatSession.create(chatSessionData, new FileSessionStorage());
    }

    private constructor(baseDir?: string)
    {
        this.sessionsDir = join(baseDir || homedir(), ".code-bandit", "sessions");
    }

    private static async loadSession(filePath: string): Promise<IChatSession>
    {
        const data = JSON.parse(await readFile(filePath, "utf8"));

        return mapSessionDataToSession(data);
    }

    async saveSession(session: IChatSession): Promise<void>
    {
        await this.ensureSessionsDir();

        const filePath = this.getSessionFilePath(session.id);

        const sessionData = mapSessionToSessionData(session);

        await writeFileAtomic(filePath, JSON.stringify(sessionData, null, 2), "utf-8");

        if (chatServerClient)
        {
            console.log("UPSERT", session.messages.length, session.finished);
            await chatServerClient.upsertDocument(session.id, { data: mapSessionToChat(session) });
        }
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
