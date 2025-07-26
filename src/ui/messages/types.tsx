import { Text, TextProps } from "ink";
import React from "react";

import { TMessage } from "../../ai/custom-messages.js";

export const colors = {
    human: "green",
    ai: "black",
    generic: "black",
    tool: "magenta",
    error: "red",
};

export interface MessageProps
{
    msg: TMessage;

    selected?: boolean;
    updateMessage?: (msg: TMessage) => void;

    debug?: boolean;
}

export function Badge({ children, color, textColor = "white" }: { children: string; color: TextProps["backgroundColor"]; textColor?: TextProps["backgroundColor"] })
{
    return (
        <Text color={textColor} backgroundColor={color}>
            {` ${children.trim()} `}
        </Text>
    );
}

export function MessageDebugLog({ msg }: { msg: TMessage })
{
    return (
        <Text color="blackBright">
            {JSON.stringify(msg, null, 2)}
        </Text>
    );
}
