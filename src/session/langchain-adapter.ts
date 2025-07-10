/**
 * Adapter layer for LangChain integration
 * Converts between LangChain messages and session messages
 */

import { BaseMessage, AIMessage, HumanMessage, ToolMessage, SystemMessage } from '@langchain/core/messages';
import { SessionMessage } from './types.js';

export class LangChainSessionAdapter
{
    /**
     * Convert LangChain messages to session messages
     */
    static toSessionMessages(langchainMessages: BaseMessage[]): Omit<SessionMessage, 'id' | 'timestamp'>[]
    {
        return langchainMessages.map(msg =>
        {
            const baseMessage: Omit<SessionMessage, 'id' | 'timestamp'> = {
                type: this.getLangChainMessageType(msg),
                content: msg.content.toString(),
                rawMessage: this.serializeLangChainMessage(msg),
                metadata: {
                    langchainType: msg.getType(),
                    // Preserve additional LangChain metadata
                    ...msg.additional_kwargs,
                },
            };

            // Handle tool-specific metadata
            if (msg instanceof ToolMessage)
            {
                baseMessage.metadata = {
                    ...baseMessage.metadata,
                    toolName: msg.name,
                    toolCallId: msg.tool_call_id,
                };
            }

            // Handle AI message with tool calls
            if (msg instanceof AIMessage && msg.tool_calls)
            {
                baseMessage.metadata = {
                    ...baseMessage.metadata,
                    toolCalls: msg.tool_calls,
                };
            }

            return baseMessage;
        });
    }

    /**
     * Convert session messages to LangChain messages
     */
    static toLangChainMessages(sessionMessages: SessionMessage[]): BaseMessage[]
    {
        return sessionMessages.map(msg =>
        {
            // If we have raw message data, try to deserialize it first
            if (msg.rawMessage)
            {
                try
                {
                    return this.deserializeLangChainMessage(msg.rawMessage);
                }
                catch (error)
                {
                    console.warn('Failed to deserialize raw message, falling back to basic conversion:', error);
                }
            }

            // Fallback to basic message conversion
            return this.createBasicLangChainMessage(msg);
        });
    }

    /**
     * Get the session message type from a LangChain message
     */
    private static getLangChainMessageType(msg: BaseMessage): SessionMessage['type']
    {
        const type = msg.getType();

        switch (type)
        {
            case 'human':
                return 'human';

            case 'ai':
                return 'ai';

            case 'tool':
                return 'tool';

            case 'system':
                return 'system';

            default:
                return 'ai'; // Default fallback
        }
    }

    /**
     * Serialize a LangChain message for storage
     */
    private static serializeLangChainMessage(msg: BaseMessage): any
    {
        const type = msg.getType();

        const base = {
            type,
            content: msg.content,
            additional_kwargs: msg.additional_kwargs,
        };

        switch (type)
        {
            case 'human':
                return base;

            case 'ai':
                const aiMsg = msg as AIMessage;
                return {
                    ...base,
                    tool_calls: aiMsg.tool_calls,
                    usage_metadata: aiMsg.usage_metadata,
                };

            case 'tool':
                const toolMsg = msg as ToolMessage;
                return {
                    ...base,
                    name: toolMsg.name,
                    tool_call_id: toolMsg.tool_call_id,
                };

            case 'system':
                return base;

            default:
                return base;
        }
    }

    /**
     * Deserialize a stored message back to LangChain format
     */
    private static deserializeLangChainMessage(rawMessage: any): BaseMessage
    {
        const { type, content, additional_kwargs = {} } = rawMessage;

        switch (type)
        {
            case 'human':
                return new HumanMessage({
                    content,
                    additional_kwargs,
                });

            case 'ai':
                return new AIMessage({
                    content,
                    additional_kwargs,
                    tool_calls: rawMessage.tool_calls,
                    usage_metadata: rawMessage.usage_metadata,
                });

            case 'tool':
                return new ToolMessage({
                    content,
                    name: rawMessage.name,
                    tool_call_id: rawMessage.tool_call_id,
                    additional_kwargs,
                });

            case 'system':
                return new SystemMessage({
                    content,
                    additional_kwargs,
                });

            default:
                // Fallback to AI message
                return new AIMessage({
                    content,
                    additional_kwargs,
                });
        }
    }

    /**
     * Create a basic LangChain message from session message (fallback)
     */
    private static createBasicLangChainMessage(msg: SessionMessage): BaseMessage
    {
        const content = msg.content;
        const additional_kwargs = msg.metadata?.langchainType
            ? { ...msg.metadata }
            : {};

        switch (msg.type)
        {
            case 'human':
                return new HumanMessage({ content, additional_kwargs });

            case 'ai':
                return new AIMessage({
                    content,
                    additional_kwargs,
                    tool_calls: msg.metadata?.toolCalls,
                });

            case 'tool':
                return new ToolMessage({
                    content,
                    name: msg.metadata?.toolName || 'unknown',
                    tool_call_id: msg.metadata?.toolCallId || 'unknown',
                    additional_kwargs,
                });

            case 'system':
                return new SystemMessage({ content, additional_kwargs });

            default:
                return new AIMessage({ content, additional_kwargs });
        }
    }
}