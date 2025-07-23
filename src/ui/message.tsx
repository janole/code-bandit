import { BaseMessage, MessageType } from "@langchain/core/messages";
import { Box, Text, TextProps } from "ink";
import React, { memo } from "react";

import { ErrorMessage, TMessage, TMessageType, ToolProgressMessage } from "../ai/custom-messages.js";
import { Markdown } from "./markdown.js";
import Spinner from "./spinner.js";

const colors = {
    human: "green",
    ai: "black",
    generic: "black",
    tool: "magenta",
    error: "red",
};

function Badge({ children, color }: { children: string; color: TextProps["backgroundColor"] })
{
    return (
        <Text color="white" backgroundColor={color}>
            {` ${children.trim()} `}
        </Text>
    );
}


function MessageDebugLog({ msg }: { msg: TMessage })
{
    return (
        <Text color="blackBright">
            {JSON.stringify(msg, null, 2)}
        </Text>
    );
}

function ellipsizeVal(val: any | any[], limit: number = 50)
{
    const line = Array.isArray(val)
        ? val.filter(a => a).map(a => a.toString().replace(/[\r\n]+/g, " ")).join(" ")
        : val.toString().replace(/[\r\n]+/g, " ");

    return line.length > limit
        ? line.slice(0, 20) + " ... " + val.slice(-20)
        : line;
}

function ToolMessageView({ msg }: { msg: ToolProgressMessage })
{
    if (!msg.toolCall)
    {
        return null;
    }

    return (
        <Box width={process.stdout.columns - 2}>
            <Box flexShrink={0} width={2}>
                <Text color={colors.tool}>*</Text>
            </Box>
            <Box flexDirection="column" flexGrow={1} width={process.stdout.columns - 2 - 2}>
                <Box marginBottom={1} flexDirection="column">
                    <Box>
                        <Text color={colors.tool}>
                            {msg.toolCall?.name}
                        </Text>

                        {msg.status === "pending" &&
                            <Spinner variant="arrow" spacerLeft=" " />
                        }

                        {msg.content &&
                            <Text color="blackBright">
                                {" → "}

                                {msg.status === "error"
                                    ? <Badge color="red">FAIL</Badge>
                                    : <Badge color="green">OK</Badge>
                                }

                                {` (${msg.content?.length})`}
                            </Text>
                        }
                    </Box>
                    <Box marginLeft={2} marginTop={1} flexDirection="column">
                        {Object.entries(msg.toolCall?.args).map(([key, val], index) => !!val && (
                            <Box key={index}>
                                <Box width={2}>
                                    <Text color="blackBright">∙</Text>
                                </Box>
                                <Box>
                                    <Text color="blackBright">{key}: </Text>
                                    <Text color="blackBright">
                                        {ellipsizeVal(val)}
                                    </Text>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                    {msg.status === "error" &&
                        <Box marginLeft={2} marginTop={1}>
                            <Box width={2}>
                                <Text color={colors.error}>✖</Text>
                            </Box>
                            <Box>
                                <Text color="blackBright">{msg.content?.trim()}</Text>
                            </Box>
                        </Box>
                    }
                </Box>
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
