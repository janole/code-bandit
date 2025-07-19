import { BaseMessage, MessageType, ToolMessage } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";

class ErrorMessage extends BaseMessage
{
    override _getType(): MessageType
    {
        return "generic";
    }

    constructor(content: string, error?: Error)
    {
        super({ content });

        this.additional_kwargs["__coba_type"] = "error";
        this.response_metadata = { error };
    }
}

interface IToolProgress
{
    toolCall: ToolCall;
    status: "pending" | "success" | "error";
    result?: { tool_call_id: string; name: string; content: ToolMessage["content"]; }
    error?: Error;
}

interface IToolProgressMetadata
{
    toolCalls: IToolProgress[];
}

class ToolProgressMessage extends BaseMessage
{
    declare response_metadata: IToolProgressMetadata;

    override _getType(): MessageType
    {
        return "generic";
    }

    constructor()
    {
        super({ content: "" });

        this.additional_kwargs["__coba_type"] = "tool-progress";
        this.response_metadata = { toolCalls: [] };
    }

    pending(index: number, toolCall: ToolCall)
    {
        this.response_metadata["toolCalls"][index] = { toolCall, status: "pending" };
    }

    success(index: number, result: ToolMessage)
    {
        if (this.response_metadata["toolCalls"][index])
        {
            this.response_metadata["toolCalls"][index] = {
                ...this.response_metadata["toolCalls"][index],
                status: result.status || "success",
                result: {
                    tool_call_id: result.tool_call_id,
                    name: result.name || "(no name)",
                    content: result.content,
                },
            };
        }
    }

    fail(index: number, _error: string | Error)
    {
        if (this.response_metadata["toolCalls"][index])
        {
            const error = _error instanceof Error
                ? JSON.parse(JSON.stringify(_error, Object.getOwnPropertyNames(_error)))
                : { message: _error };

            this.response_metadata["toolCalls"][index] = {
                ...this.response_metadata["toolCalls"][index],
                error,
                status: "error",
                result: undefined,
            };
        }
    }

    get items(): IToolProgress[] { return this.response_metadata["toolCalls"]; }
}

const getCustomMessageType = (message: BaseMessage) => message.additional_kwargs["__coba_type"] as ("error" | "tool-progress" | undefined);

export
{
    ErrorMessage,
    getCustomMessageType,
    ToolProgressMessage,
};
