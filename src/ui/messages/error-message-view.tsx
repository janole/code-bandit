import { Box, Text } from "ink";
import React from "react";

import { ErrorMessage } from "../../ai/custom-messages.js";
import { colors } from "./types.js";

export function ErrorMessageView({ msg: { content, level }, debug }: { msg: ErrorMessage; debug?: boolean })
{
    const color = colors.error;

    if (!debug && level === "debug")
    {
        return null;
    }

    return (
        <Box borderStyle="double" borderColor={color} paddingX={1} marginBottom={1}>
            <Text color={color}>{content}</Text>
        </Box>
    );
}
