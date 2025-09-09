import { BaseMessage } from "@langchain/core/messages";
import { ToolCall, ToolCallChunk } from "@langchain/core/messages/tool";

export type TMessage = BaseMessage | CustomMessage;

type TCustomMessageType = "error" | "tool-progress";

export type TMessageType = ReturnType<BaseMessage["getType"]> | TCustomMessageType;

export abstract class CustomMessage
{
    _type: TCustomMessageType;

    constructor(type: TCustomMessageType)
    {
        this._type = type;
    }

    getType(): TCustomMessageType
    {
        return this._type;
    }

    abstract isMessageFinished(): boolean;

    static fromObject(obj: any): CustomMessage
    {
        if (obj._type === "error")
        {
            return new ErrorMessage(obj.content, obj.error);
        }
        else if (obj._type === "tool-progress")
        {
            return new ToolProgressMessage(obj.toolCall, obj.status, obj.content, obj.confirmState, obj.info);
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
            };
        }
    }

    override isMessageFinished(): boolean
    {
        return true;
    }
}

class ToolProgressMessage extends CustomMessage
{
    static readonly CONFIRM_STATES = ["no", "yes", "none", "all"] as const;

    toolCall: ToolCall;
    status: "pending" | "pending-confirmation" | "confirmed" | "declined" | "success" | "error";
    content?: string;
    confirmState: typeof ToolProgressMessage.CONFIRM_STATES[number];
    info: {
        description?: string;
        fileName?: string;
    };

    static isTypeOf = (m: any) => m instanceof ToolProgressMessage;

    clone({ status, confirmState }: Pick<ToolProgressMessage, "status" | "confirmState">)
    {
        return new ToolProgressMessage(this.toolCall, status, this.content, confirmState, this.info);
    }

    toggleConfirmState({ direction }: { direction: -1 | 1 })
    {
        const { CONFIRM_STATES: CS } = ToolProgressMessage;

        const confirmState = CS[(CS.indexOf(this.confirmState) + direction + CS.length) % CS.length] || "no";

        return this.clone({ status: "pending-confirmation", confirmState });
    }

    /**
     * Attempts to create a ToolProgressMessage from a streaming chunk.
     * Gracefully handles incomplete JSON in the arguments.
     */
    static createFromChunk(toolCallChunk: ToolCallChunk)
    {
        if (!toolCallChunk.name)
        {
            return null;
        }

        if (toolCallChunk.args?.trim().endsWith("}"))
        {
            try
            {
                const args = JSON.parse(toolCallChunk.args) || {};

                return new ToolProgressMessage({ name: toolCallChunk.name, args });
            }
            catch (e)
            {
                // Ignore parsing errors for incomplete JSON
            }
        }

        return new ToolProgressMessage({ name: toolCallChunk.name, args: {} });
    }

    /**
     * Creates a list of ToolProgressMessages from a list of chunks.
     */
    static createFromChunks(toolCallChunks?: ToolCallChunk[])
    {
        return toolCallChunks?.map(i => ToolProgressMessage.createFromChunk(i)).filter(i => !!i) || [];
    }

    constructor(toolCall: ToolCall, status?: ToolProgressMessage["status"], content?: string, confirmState?: ToolProgressMessage["confirmState"], info?: ToolProgressMessage["info"])
    {
        super("tool-progress");

        this.toolCall = toolCall;
        this.status = status || "pending";
        this.content = content;
        this.confirmState = confirmState || "no";
        this.info = info || {};
    }

    override isMessageFinished(): boolean
    {
        return this.status !== "pending" && this.status !== "pending-confirmation";
    }
}

/**
 * A type guard to check if a message is a CustomMessage.
 *
 * @param message The message to check.
 * @returns True if the message is a CustomMessage, false otherwise.
 */
export const isCustomMessage = (message: any): message is CustomMessage =>
{
    return message instanceof CustomMessage || (
        message && typeof message === "object" && "_type" in message &&
        (message._type === "error" || message._type === "tool-progress")
    );
};

const setMessageIsStreaming = (msg: BaseMessage, isStreaming: boolean) =>
{
    msg.additional_kwargs["_coba_message_is_streaming"] = isStreaming;
    return msg;
};

const isMessageStreaming = (msg: TMessage): boolean =>
{
    return (msg instanceof BaseMessage) && (msg as BaseMessage).additional_kwargs["_coba_message_is_streaming"] === true;
};

const isMessageFinished = (msg: TMessage): boolean =>
{
    if (msg instanceof BaseMessage)
    {
        return !isMessageStreaming(msg);
    }

    return msg.isMessageFinished();
};

export
{
    ErrorMessage,
    isMessageFinished,
    isMessageStreaming,
    setMessageIsStreaming,
    ToolProgressMessage,
};

