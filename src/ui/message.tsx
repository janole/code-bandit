import { Badge, OrderedList, Spinner, StatusMessage, UnorderedList } from "@inkjs/ui";
import { MessageType } from "@langchain/core/messages";
import { Box, Text } from "ink";
import React, { memo } from "react";

import { getCustomMessageType, ToolProgressMessage } from "../ai/messages.js";
import { TMessage } from "../ai/work.js";
import { Markdown } from "./markdown.js";

const colors = {
    human: "green",
    ai: "black",
    generic: "black",
    tool: "magenta",
    error: "red",
};

function MessageDebugLog({ msg }: { msg: TMessage })
{
    return (
        <Text color="gray">
            {JSON.stringify(msg, null, 2)}
        </Text>
    );
}

function ToolMessage({ msg }: { msg: TMessage })
{
    const items = (msg as ToolProgressMessage).items;

    return (
        <Box flexDirection="row" marginBottom={1} width={process.stdout.columns - 2}>
            <Box>
                <Badge color={colors.tool}>{"> TOOLS"}</Badge>
            </Box>
            <Box paddingLeft={1}>
                <OrderedList>
                    {items.map((progress, index) => (
                        <OrderedList.Item key={index}>
                            <Box>
                                {progress.status === "pending" ? <Spinner /> : <Text>{" "}</Text>}

                                <StatusMessage variant={progress.status === "pending" ? "info" : progress.status}>
                                    {progress.toolCall.name}
                                </StatusMessage>

                                {progress.result &&
                                    <Text color="gray">
                                        {" → "}({progress.result?.content?.length})
                                    </Text>
                                }
                            </Box>
                            <Box paddingLeft={4}>
                                <UnorderedList>
                                    {Object.entries(progress.toolCall?.args).map(([key, val]) => !!val && (
                                        <UnorderedList.Item key={key}>
                                            <Box width={process.stdout.columns / 2}>
                                                <Text color="gray">{key}: </Text>
                                                <Text color="blackBright">
                                                    {val.length > 40
                                                        ? val.slice(0, 10) + " ... " + val.slice(-20)
                                                        : val
                                                    }
                                                </Text>
                                            </Box>
                                        </UnorderedList.Item>
                                    ))}
                                </UnorderedList>
                            </Box>
                        </OrderedList.Item>
                    ))}
                </OrderedList>
            </Box>
        </Box>
    );
}

function ErrorMessage({ msg: { text } }: { msg: TMessage })
{
    const color = colors.error;

    return (
        <Box borderStyle="double" borderColor={color} paddingX={1}>
            <Text color={color}>{text}</Text>
        </Box>
    );
}

function TextMessage({ msg: { text }, type }: { msg: TMessage; type: MessageType })
{
    const color = colors[type as keyof typeof colors];

    return (
        <Box width={process.stdout.columns - 2}>
            <Box width={2}>
                <Text color={color}>
                    {type === "human"
                        ? ">"
                        : "✦"
                    }
                </Text>
            </Box>
            <Box width={process.stdout.columns - 2 - 2}>
                {type === "ai"
                    ? <Markdown>{text}</Markdown>
                    : <Text color={color}>{text}</Text>
                }
            </Box>
        </Box>
    );
}

function Message({ msg, debug }: { msg: TMessage; debug?: boolean; })
{
    const type = getCustomMessageType(msg) || msg.getType();

    if (type === "tool-progress")
    {
        return <ToolMessage msg={msg} />;
    }

    if (type === "error")
    {
        return <ErrorMessage msg={msg} />;
    }

    const hasText = ["human", "ai", "generic"].includes(type) && msg.text.trim().length > 0;

    if (!debug && !hasText)
    {
        return null;
    }

    return (
        <Box flexDirection="column" marginBottom={1} width={process.stdout.columns - 2}>
            {hasText &&
                <TextMessage type={type} msg={msg} />
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
