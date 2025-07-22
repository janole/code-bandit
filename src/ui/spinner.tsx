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

    const [frame, setFrame] = useState(0);

    const frames = FRAMES[variant];

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
            {spacerLeft}
            {frames[empty ? 0 : 1 + (frame % (frames.length - 1))]}
            {children ? spacer : undefined}
            {children}
            {spacerRight}
        </Text>
    );
}
