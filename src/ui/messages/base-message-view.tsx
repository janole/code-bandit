import { BaseMessage } from "@langchain/core/messages";
import { Box, Text } from "ink";
import React from "react";

import { TMessageType } from "../../ai/custom-messages.js";
import { Markdown } from "../markdown.js";
import { colors } from "./types.js";

export function BaseMessageView({ msg: { text }, type }: { msg: BaseMessage; type: TMessageType })
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
