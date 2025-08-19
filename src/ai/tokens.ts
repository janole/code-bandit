import { UsageMetadata } from "@langchain/core/messages";

import { AIMessage, AIMessageChunk } from "../index.node.js";
import { TMessage } from "./custom-messages.js";

export type TTokenUsage = UsageMetadata;

function countTokens(messages: TMessage[]): TTokenUsage
{
    return messages.filter(m => m instanceof AIMessage || m instanceof AIMessageChunk)
        .reduce((r, m) => ({
            input_tokens: r.input_tokens + (m.usage_metadata?.input_tokens || 0),
            output_tokens: r.output_tokens + (m.usage_metadata?.output_tokens || 0),
            total_tokens: r.total_tokens + (m.usage_metadata?.total_tokens || 0),
        }), {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
        });
}

function lastMessageFromAI(messages: TMessage[]): AIMessage | AIMessageChunk | undefined
{
    return messages.filter(m => m instanceof AIMessage || m instanceof AIMessageChunk)?.at(-1);
}

export
{
    countTokens,
    lastMessageFromAI,
};
