import { Box, Text } from "ink";
import React from "react";

import { ErrorMessage } from "../../ai/custom-messages.js";
import { colors } from "./types.js";

export function ErrorMessageView({ msg: { content } }: { msg: ErrorMessage })
{
    const color = colors.error;

    return (
        <Box borderStyle="double" borderColor={color} paddingX={1} marginBottom={1}>
            <Text color={color}>{content}</Text>
        </Box>
    );
}
