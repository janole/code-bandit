import React from 'react';
import { Text } from 'ink';
import { marked } from 'marked';
import TerminalRenderer from "marked-terminal";

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
        // @ts-expect-error
        const parsed = marked.parse(children, { async: false }).trim();

        return parsed;
    }, [
        children,
    ]);

    return (
        <Text color={color}>
            {rendered}
        </Text>
    );
}
