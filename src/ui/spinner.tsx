import React, { useEffect, useState } from "react";
import { Text, TextProps } from "ink";

const frames = [
    "····",
    "⏺●··",
    "·⏺●·",
    "··⏺●",
    "··●⏺",
    "·●⏺·",
    "●⏺··",
];

interface SpinnerProps extends TextProps
{
    empty?: boolean;
    spacer?: string;
}

export default function Spinner(props: SpinnerProps)
{
    const { empty, spacer = " ", children, ...textProps } = props;

    const [frame, setFrame] = useState(0);

    useEffect(() => 
    {
        if (empty)
        {
            return undefined;
        }

        const id = setInterval(() => { setFrame(frame => frame + 1); }, 80);

        return () => { clearInterval(id); };
    }, [
        empty,
        setFrame,
    ]);

    return (
        <Text {...textProps}>
            {frames[empty ? 0 : 1 + (frame % (frames.length - 1))]}
            {spacer}
            {children}
        </Text>
    );
}
