import { Text, TextProps } from "ink";
import React, { useEffect, useState } from "react";

const FRAMES = {
    default: [
        "····",
        "⏺●··",
        "·⏺●·",
        "··⏺●",
        "··●⏺",
        "·●⏺·",
        "●⏺··",
    ],
    bars: [
        "      ",
        "[    ]",
        "[=   ]",
        "[==  ]",
        "[=== ]",
        "[====]",
        "[ ===]",
        "[  ==]",
        "[   =]",
        "[    ]",
        "[   =]",
        "[  ==]",
        "[ ===]",
        "[====]",
        "[=== ]",
        "[==  ]",
        "[=   ]",
    ],
    arrow: [
        "     ",
        "[   ]",
        "[>  ]",
        "[=> ]",
        "[==>]",
        "[ -=]",
        "[  -]",
        "[   ]",
        "[   ]",
        "[  <]",
        "[ <=]",
        "[<==]",
        "[=- ]",
        "[-  ]",
        "[   ]",
    ],
    dots: [
        " ", "⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏",
    ],
    clock: [
        " ", "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛",
    ],
};

export function useFrames(delay: number, enabled: boolean = true)
{
    const [frame, setFrame] = useState(0);

    useEffect(() => 
    {
        if (!enabled)
        {
            return undefined;
        }

        const id = setInterval(() => { setFrame(frame => frame + 1); }, delay);

        return () => { clearInterval(id); };
    }, [
        enabled,
        delay,
        setFrame,
    ]);

    return { frame };
}

interface SpinnerProps extends TextProps
{
    empty?: boolean;
    spacer?: string;
    spacerLeft?: string;
    spacerRight?: string;
    variant?: keyof typeof FRAMES;
}

export default function Spinner(props: SpinnerProps)
{
    const {
        empty,
        spacer = " ",
        spacerLeft = "",
        spacerRight = "",
        variant = "default",
        children,
        ...textProps
    } = props;

    const frames = FRAMES[variant];

    const { frame } = useFrames(80, !empty);

    return (
        <Text {...textProps}>
            {spacerLeft}
            {frames[empty ? 0 : 1 + (frame % (frames.length - 1))]}
            {children ? spacer : undefined}
            {children}
            {spacerRight}
        </Text>
    );
}
