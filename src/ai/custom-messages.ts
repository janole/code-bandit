import { BaseMessage, ToolMessage } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";

export type TMessage = BaseMessage | CustomMessage;
export type TCustomMessageType = "error" | "tool-progress";
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
            return new ToolProgressMessage(obj.toolCalls);
        }

        throw new Error(`Type ${obj._type} not supported.`);
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

    constructor(content: string, error?: Error)
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

interface IToolProgress
{
    toolCall: ToolCall;
    status: "pending" | "success" | "error";
    result?: { content: ToolMessage["content"]; }
    error?: Error;
}

class ToolProgressMessage extends CustomMessage
{
    toolCalls: IToolProgress[];

    constructor(toolCalls?: IToolProgress[])
    {
        super("tool-progress");

        this.toolCalls = toolCalls || [];
    }

    pending(index: number, toolCall: ToolCall)
    {
        this.toolCalls[index] = { toolCall, status: "pending" };
    }

    result(index: number, result: ToolMessage)
    {
        if (this.toolCalls[index])
        {
            const status = result?.content?.toString().startsWith("ERROR: ")
                ? "error"
                : result.status || "success";

            if (status === "error")
            {
                this.fail(index, result.content.toString());

                return;
            }

            this.toolCalls[index] = {
                ...this.toolCalls[index],
                status,
                result: { content: result.content },
            };
        }
    }

    fail(index: number, _error: string | Error)
    {
        if (this.toolCalls[index])
        {
            const error = _error instanceof Error
                ? JSON.parse(JSON.stringify(_error, Object.getOwnPropertyNames(_error)))
                : { message: _error };

            this.toolCalls[index] = {
                ...this.toolCalls[index],
                error,
                status: "error",
                result: undefined,
            };
        }
    }

    static items(msg: ToolProgressMessage): IToolProgress[] 
    {
        return msg.toolCalls;
    }
}

const getCustomMessageType = (message: any) => message._type; // TODO: refactor

export
{
    ErrorMessage,
    getCustomMessageType,
    ToolProgressMessage,
};
