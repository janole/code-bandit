/**
 * File-based session storage implementation
 */

import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { ChatSession, SessionSummary, SessionListOptions } from "./types.js";

export class SessionStorage
{
    private readonly sessionsDir: string;

    constructor(baseDir?: string)
    {
        this.sessionsDir = join(baseDir || homedir(), ".code-bandit", "sessions");
    }

    /**
     * Ensure the sessions directory exists
     */
    private async ensureSessionsDir(): Promise<void>
    {
        try
        {
            await fs.mkdir(this.sessionsDir, { recursive: true });
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

    /**
     * Get the file path for a session
     */
    private getSessionFilePath(sessionId: string): string
    {
        return join(this.sessionsDir, `${sessionId}.json`);
    }

    /**
     * Save a session to disk
     */
    async saveSession(session: ChatSession): Promise<void>
    {
        await this.ensureSessionsDir();

        const filePath = this.getSessionFilePath(session.id);
        const sessionData = {
            ...session,
            // Convert dates to ISO strings for JSON serialization
            createdAt: session.createdAt.toISOString(),
            lastAccessedAt: session.lastAccessedAt.toISOString(),
            messages: session.messages.map(msg => ({
                ...msg,
                timestamp: msg.timestamp.toISOString(),
            })),
        };

        await fs.writeFile(filePath, JSON.stringify(sessionData, null, 2), "utf-8");
    }

    /**
     * Load a session from disk
     */
    async loadSession(sessionId: string): Promise<ChatSession | null>
    {
        try
        {
            const filePath = this.getSessionFilePath(sessionId);
            const content = await fs.readFile(filePath, "utf-8");
            const sessionData = JSON.parse(content);

            // Convert ISO strings back to dates
            return {
                ...sessionData,
                createdAt: new Date(sessionData.createdAt),
                lastAccessedAt: new Date(sessionData.lastAccessedAt),
                messages: sessionData.messages.map((msg: any) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp),
                })),
            };
        }
        catch (error)
        {
            if ((error as NodeJS.ErrnoException).code === "ENOENT")
            {
                return null;
            }
            throw error;
        }
    }

    /**
     * List all sessions with optional filtering
     */
    async listSessions(options: SessionListOptions = {}): Promise<SessionSummary[]>
    {
        try
        {
            await this.ensureSessionsDir();
            const files = await fs.readdir(this.sessionsDir);
            const sessionFiles = files.filter(file => file.endsWith(".json"));

            const sessions: SessionSummary[] = [];

            for (const file of sessionFiles)
            {
                try
                {
                    const sessionId = file.replace(".json", "");
                    const session = await this.loadSession(sessionId);

                    if (!session) continue;

                    // Apply filters
                    if (options.workDir && session.workDir !== options.workDir) continue;
                    if (options.provider && session.provider !== options.provider) continue;
                    if (options.model && session.model !== options.model) continue;

                    const lastMessage = session.messages[session.messages.length - 1]?.content.slice(0, 100);

                    sessions.push({
                        id: session.id,
                        name: session.name,
                        workDir: session.workDir,
                        provider: session.provider,
                        model: session.model,
                        createdAt: session.createdAt,
                        lastAccessedAt: session.lastAccessedAt,
                        messageCount: session.messages.length,
                        lastMessage,
                    });
                }
                catch (error)
                {
                    // Skip corrupted session files
                    console.warn(`Warning: Could not load session ${file}:`, error);
                }
            }

            // Sort by last accessed date (most recent first)
            sessions.sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime());

            // Apply limit
            if (options.limit && options.limit > 0)
            {
                return sessions.slice(0, options.limit);
            }

            return sessions;
        }
        catch (error)
        {
            // If sessions directory doesn't exist, return empty array
            if ((error as NodeJS.ErrnoException).code === "ENOENT")
            {
                return [];
            }
            throw error;
        }
    }

    /**
     * Delete a session
     */
    async deleteSession(sessionId: string): Promise<boolean>
    {
        try
        {
            const filePath = this.getSessionFilePath(sessionId);
            await fs.unlink(filePath);
            return true;
        }
        catch (error)
        {
            if ((error as NodeJS.ErrnoException).code === "ENOENT")
            {
                return false;
            }
            throw error;
        }
    }

    /**
     * Clear all sessions
     */
    async clearAllSessions(): Promise<number>
    {
        try
        {
            const sessions = await this.listSessions();
            let deletedCount = 0;

            for (const session of sessions)
            {
                const success = await this.deleteSession(session.id);
                if (success) deletedCount++;
            }

            return deletedCount;
        }
        catch (error)
        {
            throw error;
        }
    }

    /**
     * Get sessions directory path
     */
    getSessionsDirectory(): string
    {
        return this.sessionsDir;
    }
}