/**
 * Core session management types - provider agnostic
 */

export interface SessionMessage
{
    id: string;
    type: "human" | "ai" | "tool" | "system";
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
    // Raw message data for provider-specific reconstruction
    rawMessage?: any;
}

export interface ChatSession
{
    id: string;
    name?: string;
    workDir: string;
    provider: string;
    model: string;
    createdAt: Date;
    lastAccessedAt: Date;
    messages: SessionMessage[];
    metadata?: Record<string, any>;
}

export interface SessionSummary
{
    id: string;
    name?: string;
    workDir: string;
    provider: string;
    model: string;
    createdAt: Date;
    lastAccessedAt: Date;
    messageCount: number;
    lastMessage?: string;
}

export interface SessionListOptions
{
    workDir?: string;
    provider?: string;
    model?: string;
    limit?: number;
}

export interface CreateSessionOptions
{
    name?: string;
    workDir: string;
    provider: string;
    model: string;
    metadata?: Record<string, any>;
}