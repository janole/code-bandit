/**
 * Main session manager - high-level session operations
 */

import { randomUUID } from 'crypto';
import { ChatSession, SessionMessage, CreateSessionOptions, SessionSummary, SessionListOptions } from './types.js';
import { SessionStorage } from './storage.js';

export class SessionManager
{
    private storage: SessionStorage;
    private currentSession: ChatSession | null = null;

    constructor(storageDir?: string)
    {
        this.storage = new SessionStorage(storageDir);
    }

    /**
     * Create a new session
     */
    async createSession(options: CreateSessionOptions): Promise<ChatSession>
    {
        const now = new Date();
        const session: ChatSession = {
            id: this.generateSessionId(),
            name: options.name,
            workDir: options.workDir,
            provider: options.provider,
            model: options.model,
            createdAt: now,
            lastAccessedAt: now,
            messages: [],
            metadata: options.metadata,
        };

        await this.storage.saveSession(session);
        this.currentSession = session;
        return session;
    }

    /**
     * Load an existing session
     */
    async loadSession(sessionId: string): Promise<ChatSession | null>
    {
        const session = await this.storage.loadSession(sessionId);
        if (session)
        {
            // Update last accessed time
            session.lastAccessedAt = new Date();
            await this.storage.saveSession(session);
            this.currentSession = session;
        }
        return session;
    }

    /**
     * Get current session
     */
    getCurrentSession(): ChatSession | null
    {
        return this.currentSession;
    }

    /**
     * Add a message to the current session
     */
    async addMessage(message: Omit<SessionMessage, 'id' | 'timestamp'>): Promise<void>
    {
        if (!this.currentSession)
        {
            throw new Error('No active session. Create or load a session first.');
        }

        const sessionMessage: SessionMessage = {
            ...message,
            id: randomUUID(),
            timestamp: new Date(),
        };

        this.currentSession.messages.push(sessionMessage);
        this.currentSession.lastAccessedAt = new Date();

        await this.storage.saveSession(this.currentSession);
    }

    /**
     * Add multiple messages to the current session
     */
    async addMessages(messages: Omit<SessionMessage, 'id' | 'timestamp'>[]): Promise<void>
    {
        if (!this.currentSession)
        {
            throw new Error('No active session. Create or load a session first.');
        }

        const now = new Date();
        const sessionMessages: SessionMessage[] = messages.map(msg => ({
            ...msg,
            id: randomUUID(),
            timestamp: now,
        }));

        this.currentSession.messages.push(...sessionMessages);
        this.currentSession.lastAccessedAt = now;

        await this.storage.saveSession(this.currentSession);
    }

    /**
     * Update session metadata
     */
    async updateSession(updates: Partial<Pick<ChatSession, 'name' | 'metadata'>>): Promise<void>
    {
        if (!this.currentSession)
        {
            throw new Error('No active session. Create or load a session first.');
        }

        if (updates.name !== undefined)
        {
            this.currentSession.name = updates.name;
        }
        if (updates.metadata !== undefined)
        {
            this.currentSession.metadata = { ...this.currentSession.metadata, ...updates.metadata };
        }

        this.currentSession.lastAccessedAt = new Date();
        await this.storage.saveSession(this.currentSession);
    }

    /**
     * List sessions
     */
    async listSessions(options?: SessionListOptions): Promise<SessionSummary[]>
    {
        return this.storage.listSessions(options);
    }

    /**
     * Delete a session
     */
    async deleteSession(sessionId: string): Promise<boolean>
    {
        const success = await this.storage.deleteSession(sessionId);
        if (success && this.currentSession?.id === sessionId)
        {
            this.currentSession = null;
        }
        return success;
    }

    /**
     * Clear all sessions
     */
    async clearAllSessions(): Promise<number>
    {
        const count = await this.storage.clearAllSessions();
        this.currentSession = null;
        return count;
    }

    /**
     * Get the most recent session for a given work directory
     */
    async getMostRecentSession(workDir: string, provider?: string, model?: string): Promise<ChatSession | null>
    {
        const sessions = await this.listSessions({
            workDir,
            provider,
            model,
            limit: 1
        });

        if (sessions.length === 0)
        {
            return null;
        }

        return this.loadSession(sessions[0].id);
    }

    /**
     * Generate a unique session ID
     */
    private generateSessionId(): string
    {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const shortUuid = randomUUID().split('-')[0];
        return `session-${timestamp}-${shortUuid}`;
    }

    /**
     * Get session storage directory
     */
    getStorageDirectory(): string
    {
        return this.storage.getSessionsDirectory();
    }
}