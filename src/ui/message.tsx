import { BaseMessage, MessageType } from "@langchain/core/messages";
import { Box, Key, Text, TextProps, useInput } from "ink";
import React, { memo, useState } from "react";

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

function Badge({ children, color, textColor = "white" }: { children: string; color: TextProps["backgroundColor"]; textColor?: TextProps["backgroundColor"] })
{
    return (
        <Text color={textColor} backgroundColor={color}>
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
        ? line.slice(0, 20) + " ... " + line.slice(-20)
        : line;
}

function ToolMessageView(props: MessageProps)
{
    const { selected, updateMessage } = props;

    const msg = props.msg as ToolProgressMessage;

    const [state, setState] = useState<"yes" | "no">("no");

    useInput((_input: string, key: Key) =>
    {
        if (key.leftArrow || key.rightArrow)
        {
            setState(state => state === "yes" ? "no" : "yes");
        }

        if (key.return)
        {
            updateMessage?.(msg.clone({ status: state === "yes" ? "confirmed" : "declined" }));
        }
    }, {
        isActive: selected,
    });

    if (!msg.toolCall)
    {
        return null;
    }

    return (
        <Box width={process.stdout.columns - 2}>
            {selected &&
                <Box
                    flexShrink={0}
                    width={2}
                    borderStyle="bold"
                    borderColor={colors.tool}
                    borderRight={false}
                    borderTop={false}
                    borderBottom={false}
                    marginBottom={1}
                    borderDimColor
                />
            }
            {!selected &&
                <Box flexShrink={0} width={2}>
                    <Text color={colors.tool}>*</Text>
                </Box>
            }
            <Box flexDirection="column" flexGrow={1} width={process.stdout.columns - 2 - 2 - 2}>
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
                    {msg.status === "pending-confirmation" &&
                        <Box marginTop={1}>
                            <Text>
                                {state === "yes" &&
                                    <Text color="green">✔ </Text>
                                }

                                {state === "no" &&
                                    <Text color={colors.error}>✖ </Text>
                                }

                                <Badge color="black">
                                    {`Execute command ${msg.toolCall?.name}?`}
                                </Badge>

                                {" → "}

                                {state === "yes"
                                    ? <Badge color="green">[Yes]</Badge>
                                    : <Text>{"  Yes  "}</Text>
                                }

                                {state === "no"
                                    ? <Badge color={colors.error}>[No]</Badge>
                                    : <Text>{"  No  "}</Text>
                                }
                            </Text>
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

interface MessageProps
{
    msg: TMessage;

    selected?: boolean;
    updateMessage?: (msg: TMessage) => void;

    debug?: boolean;
}

function Message(props: MessageProps)
{
    const { msg, debug } = props;

    const type = msg.getType();

    if (type === "tool-progress")
    {
        return <ToolMessageView msg={msg as ToolProgressMessage} selected={props.selected} updateMessage={props.updateMessage} />;
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
