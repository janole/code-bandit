import { Box, Key, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";

import { ToolProgressMessage } from "../../ai/custom-messages.js";
import Spinner from "../spinner.js";
import { Badge, colors, MessageProps } from "./types.js";

const STATES = ["yes", "no", "all", "none"] as const;
type TState = typeof STATES[number];

const STATE_CONFIG /* : { [key in TState]: { color: ForegroundColorName } } */ = {
    yes: { color: "green", symbol: "✔" },
    no: { color: "red", symbol: "✖" },
    all: { color: "green", symbol: "✔" },
    none: { color: "red", symbol: "✖" },
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

export function ToolMessageView(props: MessageProps)
{
    const { selected, updateMessage } = props;

    const msg = props.msg as ToolProgressMessage;

    const [state, setState] = useState<TState>("no");

    useInput((_input: string, key: Key) =>
    {
        if (key.leftArrow)
        {
            setState(state => STATES[(((STATES.indexOf(state) - 1) % STATES.length) + STATES.length) % STATES.length]!);
        }

        if (key.rightArrow)
        {
            setState(state => STATES[(STATES.indexOf(state) + 1) % STATES.length]!);
        }

        if (key.return)
        {
            updateMessage?.(msg.clone({ status: state === "yes" ? "confirmed" : "declined" }));
        }
    }, {
        isActive: selected,
    });

    const [frame, setFrame] = useState(0);

    useEffect(() => 
    {
        if (!selected)
        {
            return undefined;
        }

        const id = setInterval(() => { setFrame(frame => frame + 1); }, 500);

        return () => { clearInterval(id); };
    }, [
        selected,
        setFrame,
    ]);

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
                                    <Text color="black">
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
                        <Box marginTop={1}>
                            <Text>
                                <Text color={STATE_CONFIG[state].color}>
                                    {`${STATE_CONFIG[state].symbol} `}
                                </Text>

                                <Badge color="black">
                                    {`Execute command ${msg.toolCall?.name}?`}
                                </Badge>

                                {" → "}

                                {STATES.map(option => (
                                    <Text key={option}>
                                        {option === state
                                            ? <Badge color={STATE_CONFIG[option].color}>{`${(frame % 2) ? `>· ${option.toLocaleUpperCase()} ·<` : `·> ${option.toLocaleUpperCase()} <·`}`}</Badge>
                                            : <Text>{`  ${option.toLocaleUpperCase()}  `}</Text>
                                        }
                                    </Text>
                                ))}
                            </Text>
                        </Box>
                    }
                </Box>
            </Box>
        </Box>
    );
}