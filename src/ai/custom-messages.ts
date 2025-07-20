import { BaseMessage } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";

export type TMessage = BaseMessage | CustomMessage;

type TCustomMessageType = "error" | "tool-progress";

export type TMessageType = ReturnType<BaseMessage["getType"]> | TCustomMessageType;

export class CustomMessage
{
    _type: TCustomMessageType;

    constructor(type: TCustomMessageType)
    {
        this._type = type;
    }

    getType(): string
    {
        return this._type;
    }

    static fromObject(obj: any): CustomMessage
    {
        if (obj._type === "error")
        {
            return new ErrorMessage(obj.content, obj.error);
        }
        else if (obj._type === "tool-progress")
        {
            return new ToolProgressMessage(obj.toolCall, obj.status, obj.content);
        }

        throw new Error(`Unknown custom message type: ${obj._type}`);
    }
}

class ErrorMessage extends CustomMessage
{
    content: string;

    error?: {
        name: string;
        message: string;
        stack?: string;
    };

    constructor(content: string, error?: Error | ErrorMessage["error"])
    {
        super("error");

        this.content = content;

        if (error)
        {
            this.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            }
        }
    }
}

class ToolProgressMessage extends CustomMessage
{
    toolCall: ToolCall;
    status: "pending" | "success" | "error";
    content?: string;

    constructor(toolCall: ToolCall, status: ToolProgressMessage["status"], content?: string)
    {
        super("tool-progress");

        this.toolCall = toolCall;
        this.status = status;
        this.content = content;
    }
}

/**
 * @deprecated This function is deprecated and will be removed in a future version.
 * Use the `isCustomMessage` type guard instead.
 */
const getCustomMessageType = (message: any): TCustomMessageType | undefined =>
{
    if (message instanceof CustomMessage)
    {
        return message.getType() as TCustomMessageType;
    }
    else if (message && typeof message === 'object' && '_type' in message)
    {
        const type = (message as any)._type;
        if (type === "error" || type === "tool-progress")
        {
            return type;
        }
    }

    return undefined;
};

/**
 * A type guard to check if a message is a CustomMessage.
 *
 * @param message The message to check.
 * @returns True if the message is a CustomMessage, false otherwise.
 */
export const isCustomMessage = (message: any): message is CustomMessage =>
{
    return message instanceof CustomMessage || (
        message && typeof message === 'object' && '_type' in message &&
        (message._type === "error" || message._type === "tool-progress")
    );
};

export
{
    ErrorMessage,
    getCustomMessageType,
    ToolProgressMessage,
};
