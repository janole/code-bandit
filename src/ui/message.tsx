import React, { memo } from "react";
import { Box, Text } from "ink";
import { AIMessage } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { TMessage } from "../ai/work.js";
import ErrorMessage from "../ai/error-message.js";

const colors = {
    human: "green",
    ai: "black",
    generic: "black",
    tool: "magenta",
    error: "red",
};

function MessageText({ msg }: { msg: TMessage })
{
    if (msg instanceof ErrorMessage)
    {
        const color = colors.error;

        return (
            <Box borderStyle="double" borderColor={color} paddingX={1} width="100%">
                <Text color={color}>{msg.text}</Text>
            </Box>
        );
    }

    const type = msg.getType();
    const color = type in colors ? colors[type as keyof typeof colors] : "black";

    if (["ai", "generic", "human"].includes(type) && msg.text.length > 0)
    {
        return <Text color={color}>{msg.text}</Text>;
    }

    return null;
}

function ToolCallDisplay({ toolCall }: { toolCall: ToolCall })
{
    return (
        <Box borderStyle="single" borderColor="red" paddingX={1} width="100%">
            <Text color="red">
                Tool: {toolCall.name}({Object.entries(toolCall.args).map(([name, value]) =>
                    `${name}: ${value.toString().slice(0, 60)}`
                ).join(", ")})
            </Text>
        </Box>
    );
}

function ToolCalls({ msg }: { msg: TMessage })
{
    const aiMessage: AIMessage | undefined = msg.getType() === "ai" ? msg : undefined;

    if (!aiMessage?.tool_calls?.length)
    {
        return null;
    }

    return (
        <Box flexDirection="column" width="100%">
            {aiMessage?.tool_calls?.map((toolCall, index) => (
                <ToolCallDisplay key={toolCall.id ?? index} toolCall={toolCall} />
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
    return (
        <Box flexDirection="column" paddingBottom={1} width="100%">
            <MessageText msg={msg} />

            <ToolCalls msg={msg} />

            {debug &&
                <MessageDebugLog msg={msg} />
            }
        </Box>
    );
}

const MemoMessage = memo(Message);

export default MemoMessage;

export { Message };
