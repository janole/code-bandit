import chalk from "chalk";
import { Key, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";

// see https://github.com/vadimdemedes/ink-text-input

interface TextInputProps
{
    /**
     * Text to display when `value` is empty.
     */
    readonly placeholder?: string;

    /**
     * Listen to user's input. Useful in case there are multiple input components
     * at the same time and input must be "routed" to a specific component.
     */
    readonly focus?: boolean;

    /**
     * Replace all chars and mask the value. Useful for password inputs.
     */
    readonly mask?: string;

    /**
     * Whether to show cursor and allow navigation inside text input with arrow keys.
     */
    readonly showCursor?: boolean;

    /**
     * Highlight pasted text
     */
    readonly highlightPastedText?: boolean;

    /**
     * Value to display in a text input.
     */
    readonly value: string;

    /**
     * Function to call when value updates.
     */
    readonly onChange: (value: string) => void;

    /**
     * Function to call when `Enter` is pressed, where first argument is a value of the input.
     */
    readonly onSubmit?: (value: string) => void;

    /**
     * Function to intercept the useInput() call. Must return `true` to prevent processing by text-input.
     */
    readonly onHandleInput?: (input: string, key: Key) => boolean;
};

function TextInput(props: TextInputProps)
{
    const {
        value: originalValue,
        placeholder = "",
        focus = true,
        mask,
        highlightPastedText = false,
        showCursor = true,
        onChange,
        onSubmit,
        onHandleInput,
    } = props;

    const [state, setState] = useState({
        cursorOffset: (originalValue || "").length,
        cursorWidth: 0,
    });

    const { cursorOffset, cursorWidth } = state;

    useEffect(() =>
    {
        setState(previousState =>
        {
            if (!focus || !showCursor)
            {
                return previousState;
            }

            const newValue = originalValue || "";

            if (previousState.cursorOffset > newValue.length - 1)
            {
                return {
                    cursorOffset: newValue.length,
                    cursorWidth: 0,
                };
            }

            return previousState;
        });
    }, [
        originalValue,
        focus,
        showCursor,
    ]);

    const cursorActualWidth = highlightPastedText ? cursorWidth : 0;

    const value = mask ? mask.repeat(originalValue.length) : originalValue;
    let renderedValue = value;
    let renderedPlaceholder = placeholder ? chalk.grey(placeholder) : undefined;

    // Fake mouse cursor, because it's too inconvenient to deal with actual cursor and ansi escapes
    if (showCursor && focus)
    {
        renderedPlaceholder = placeholder.length > 0
            ? chalk.inverse(placeholder[0]) + chalk.grey(placeholder.slice(1))
            : chalk.inverse(" ");

        renderedValue = value.length > 0 ? "" : chalk.inverse(" ");

        let i = 0;

        for (const char of value)
        {
            renderedValue += i >= cursorOffset - cursorActualWidth && i <= cursorOffset
                ? chalk.inverse(char)
                : char;

            i++;
        }

        if (value.length > 0 && cursorOffset === value.length)
        {
            renderedValue += chalk.inverse(" ");
        }
    }

    useInput((input, key) =>
    {
        if (
            onHandleInput?.(input, key) ||
            key.upArrow ||
            key.downArrow ||
            (key.ctrl && input === "c") ||
            key.tab ||
            (key.shift && key.tab)
        )
        {
            return;
        }

        if (key.return)
        {
            if (onSubmit)
            {
                onSubmit(originalValue);
            }

            return;
        }

        let nextCursorOffset = cursorOffset;
        let nextValue = originalValue;
        let nextCursorWidth = 0;

        if (key.leftArrow)
        {
            if (showCursor)
            {
                nextCursorOffset--;
            }
        }
        else if (key.rightArrow)
        {
            if (showCursor)
            {
                nextCursorOffset++;
            }
        }
        else if (key.backspace || key.delete) 
        {
            if (cursorOffset > 0)
            {
                nextValue =
                    originalValue.slice(0, cursorOffset - 1) +
                    originalValue.slice(cursorOffset, originalValue.length);

                nextCursorOffset--;
            }
        }
        else
        {
            nextValue =
                originalValue.slice(0, cursorOffset) +
                input +
                originalValue.slice(cursorOffset, originalValue.length);

            nextCursorOffset += input.length;

            if (input.length > 1)
            {
                nextCursorWidth = input.length;
            }
        }

        if (cursorOffset < 0)
        {
            nextCursorOffset = 0;
        }

        if (cursorOffset > originalValue.length)
        {
            nextCursorOffset = originalValue.length;
        }

        setState({
            cursorOffset: nextCursorOffset,
            cursorWidth: nextCursorWidth,
        });

        if (nextValue !== originalValue)
        {
            onChange(nextValue);
        }
    }, {
        isActive: focus,
    });

    return (
        <Text>
            {placeholder
                ? value.length > 0
                    ? renderedValue
                    : renderedPlaceholder
                : renderedValue
            }
        </Text>
    );
}

export default TextInput;
