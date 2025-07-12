import { AIMessage, MessageType } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { Box, Text } from "ink";
import React, { memo } from "react";

import ErrorMessage from "../ai/error-message.js";
import { TMessage } from "../ai/work.js";
import { Markdown } from "./markdown.js";

const colors = {
    human: "green",
    ai: "black",
    generic: "black",
    tool: "magenta",
    error: "red",
};

function MessageText({ type, text }: { type: MessageType | "error"; text: string })
{
    const color = type in colors ? colors[type as keyof typeof colors] : "black";

    if (type === "error")
    {
        return (
            <Box borderStyle="double" borderColor={color} paddingX={1} width="100%">
                <Text color={color}>{text}</Text>
            </Box>
        );
    }

    if (type === "ai")
    {
        return <Markdown color={color}>{text}</Markdown>;
    }

    return <Text color={color}>{text}</Text>;
}

function ToolCallDisplay({ toolCall }: { toolCall: ToolCall })
{
    return (
        <Box borderStyle="round" borderColor={colors.tool} paddingX={1}>
            <Text color={colors.tool}>
                Tool: {toolCall.name}({Object.entries(toolCall.args).map(([name, value]) =>
                    `${name}: ${value.toString().slice(0, 60)}`
                ).join(", ")})
            </Text>
        </Box>
    );
}

function ToolCalls({ toolCalls }: { toolCalls: ToolCall[] })
{
    return (
        <Box flexDirection="column" width="100%" paddingX={1}>
            {toolCalls.map((toolCall, index) => (
                <ToolCallDisplay key={toolCall.id + index.toString()} toolCall={toolCall} />
            ))}
        </Box>
    );
};

function MessageDebugLog({ msg }: { msg: TMessage })
{
    return (
        <Text color="gray">
            {JSON.stringify(msg, null, 2)}
        </Text>
    );
}

function Message({ msg, debug }: { msg: TMessage; debug?: boolean; })
{
    const type = (msg instanceof ErrorMessage) ? "error" : msg.getType();

    const hasText = ["human", "ai", "generic", "error"].includes(type) && msg.text.trim().length > 0;

    const toolCalls = (msg as AIMessage).tool_calls;

    if (!debug && !hasText && !toolCalls)
    {
        return null;
    }

    return (
        <Box flexDirection="column" paddingBottom={1} width="100%">
            {hasText &&
                <MessageText type={type} text={msg.text} />
            }

            {!!toolCalls &&
                <ToolCalls toolCalls={toolCalls} />
            }

            {debug &&
                <MessageDebugLog msg={msg} />
            }
        </Box>
    );
}

const MemoMessage = memo(Message);

export default MemoMessage;

export { Message };
