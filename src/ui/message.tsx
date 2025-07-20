import { Badge, Spinner, UnorderedList } from "@inkjs/ui";
import { BaseMessage, MessageType } from "@langchain/core/messages";
import { Box, Text } from "ink";
import React, { memo } from "react";

import { ErrorMessage, TMessage, TMessageType, ToolProgressMessage } from "../ai/custom-messages.js";
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

function ToolMessageView({ msg }: { msg: ToolProgressMessage })
{
    const items = msg.toolCalls;

    return (
        <Box width={process.stdout.columns - 2}>
            <Box flexShrink={0} width={2}>
                <Text color={colors.tool}>*</Text>
            </Box>
            <Box flexDirection="column" flexGrow={1} width={process.stdout.columns - 2 - 2}>
                {items.map((progress, index) => (
                    <Box key={index} marginBottom={1} flexDirection="column">
                        <Box>
                            <Text color={colors.tool}>
                                {progress.toolCall.name}
                            </Text>

                            {progress.status === "pending" &&
                                <Spinner />
                            }

                            {progress.result &&
                                <Text color="gray">
                                    {" → "}

                                    {progress.status === "error"
                                        ? <Badge color="red">FAIL</Badge>
                                        : <Badge color="green">OK</Badge>
                                    }

                                    {` (${progress.result?.content?.length})`}
                                </Text>
                            }
                        </Box>
                        <Box marginLeft={2}>
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
                        {progress.status === "error" &&
                            <Box marginLeft={2} borderStyle="double" borderColor={colors.error}>
                                <Text>({progress.error?.message})</Text>
                            </Box>
                        }
                    </Box>
                ))}
            </Box>
        </Box>
    );
}

function ErrorMessageView({ msg: { content } }: { msg: ErrorMessage })
{
    const color = colors.error;

    return (
        <Box borderStyle="double" borderColor={color} paddingX={1} marginBottom={1}>
            <Text color={color}>{content}</Text>
        </Box>
    );
}

function BaseMessageView({ msg: { text }, type }: { msg: BaseMessage; type: TMessageType })
{
    const hasText = ["human", "ai", "generic"].includes(type) && text.trim().length > 0;

    if (!hasText)
    {
        return null;
    }

    const color = colors[type as keyof typeof colors];

    return (
        <Box width={process.stdout.columns - 2} marginBottom={1}>
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
    const type = msg.getType();

    if (type === "tool-progress")
    {
        return <ToolMessageView msg={msg as ToolProgressMessage} />;
    }

    if (type === "error")
    {
        return <ErrorMessageView msg={msg as ErrorMessage} />;
    }

    return (<>

        {(msg instanceof BaseMessage) &&
            <BaseMessageView msg={msg} type={type as MessageType} />}

        {debug &&
            <MessageDebugLog msg={msg} />
        }

    </>);
}

const MemoMessage = memo(Message);

export default MemoMessage;

export { Message };
