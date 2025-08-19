import { Box, Text } from "ink";
import React from "react";

import { TTokenUsage } from "../ai/tokens.js";

function TokenUsageText({ tokenUsage }: { tokenUsage: TTokenUsage })
{
    if (tokenUsage.total_tokens / 1000 < 1)
    {
        return null;

    }

    return (
        <Box flexShrink={0} paddingLeft={1}>
            <Text color="blackBright">
                {"["}
            </Text>
            <Text color="magentaBright">
                {(tokenUsage.total_tokens / 1000).toFixed(1)}k
            </Text>
            <Text color="blackBright">
                {"]"}
            </Text>
        </Box>
    );
}

export { TokenUsageText };
