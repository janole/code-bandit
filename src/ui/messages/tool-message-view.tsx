import { Box, Text } from "ink";
import React from "react";

import { ToolProgressMessage } from "../../ai/custom-messages.js";
import Spinner, { useFrames } from "../spinner.js";
import { Badge, colors, MessageProps } from "./types.js";

const STATE_CONFIG = {
    yes: { color: "green", symbol: "✔", label: "Yes" },
    no: { color: "red", symbol: "✖", label: "No" },
    all: { color: "green", symbol: "✔", label: "Allow All (YOLO)" },
    none: { color: "red", symbol: "✖", label: "Deny All (Read-Only)" },
};

function ellipsizeVal(val: any | any[], limit: number = 60)
{
    const line = Array.isArray(val)
        ? val.filter(a => a).map(a => a.toString().replace(/[\r\n]+/g, " ")).join(" ")
        : val.toString().replace(/[\r\n]+/g, " ");

    return line.length > limit
        ? line.slice(0, Math.floor(limit / 2)) + " ... " + line.slice(-Math.floor(limit / 2))
        : line;
}

function StateButton(props: { currentState: ToolProgressMessage["confirmState"], state: ToolProgressMessage["confirmState"], selected: boolean })
{
    const { currentState, state, selected } = props;

    const { frame } = useFrames(500, !!selected);

    const label = (STATE_CONFIG[state].label || state);

    if (state === currentState)
    {
        return (
            <Badge color={STATE_CONFIG[state].color}>
                {`${(frame % 2) ? `>· ${label} ·<` : `·> ${label} <·`}`}
            </Badge>
        );
    }

    return (
        <Text>
            {`  ${label}  `}
        </Text>
    );
}

function ConfirmationDialog(props: { currentState: ToolProgressMessage["confirmState"]; msg: ToolProgressMessage; })
{
    const { currentState, msg } = props;

    return (
        <Box marginTop={1}>
            <Text>
                <Text color={STATE_CONFIG[currentState].color}>
                    {`${STATE_CONFIG[currentState].symbol} `}
                </Text>

                <Badge color="black">
                    {`Execute command ${msg.toolCall?.name}?`}
                </Badge>

                {" → "}

                {ToolProgressMessage.CONFIRM_STATES.map(state => (
                    <StateButton key={state} currentState={currentState} state={state} selected />
                ))}
            </Text>
        </Box>
    );
}

export function ToolMessageView(props: MessageProps)
{
    const { selected } = props;

    const msg = props.msg as ToolProgressMessage;

    if (!msg.toolCall)
    {
        return null;
    }

    return (
        <Box width={process.stdout.columns - 2}>
            {msg.status === "pending-confirmation" &&
                <Box
                    flexShrink={0}
                    width={2}
                    borderStyle="bold"
                    borderColor={colors.tool}
                    borderRight={false}
                    borderTop={false}
                    borderBottom={false}
                    marginBottom={1}
                    borderDimColor={!selected}
                />
            }
            {msg.status !== "pending-confirmation" &&
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

                        {msg.status === "pending-confirmation" &&
                            <Text color="blackBright">
                                {" → "}<Badge color="whiteBright" textColor="blackBright">pending confirmation</Badge>
                            </Text>
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
                                    <Text>
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
                    {msg.status === "pending-confirmation" && !!selected &&
                        <ConfirmationDialog currentState={msg.confirmState} msg={msg} />
                    }
                </Box>
            </Box>
        </Box>
    );
}
