import React from "react";
import { Text } from "ink";
import { marked } from "marked";
import TerminalRenderer from "marked-terminal";
import tryCatch from "../utils/try-catch.js";

marked.setOptions({
    // @ts-expect-error missing parser, space props
    renderer: new TerminalRenderer({ reflowText: false }),
});

interface MarkdownProps
{
    children: string;
    color?: string;
};

export function Markdown(props: MarkdownProps)
{
    const { children, color } = props;

    const rendered = React.useMemo(() =>
    {
        const { result, error } = tryCatch(() =>
        {
            return marked.parse(children, { async: false }).trim() as string;
        });

        if (error)
        {
            return children;
        }

        return result;

    }, [
        children,
    ]);

    return (
        <Text color={color}>
            {rendered}
        </Text>
    );
}
