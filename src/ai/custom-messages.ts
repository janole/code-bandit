import { BaseMessage, MessageType, ToolMessage } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";

export interface CustomMessage
{
    type: "custom";
}

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
    result?: { /* tool_call_id: string; name: string; */ content: ToolMessage["content"]; }
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

    result(index: number, result: ToolMessage)
    {
        if (this.response_metadata["toolCalls"][index])
        {
            const status = result?.content?.toString().startsWith("ERROR: ")
                ? "error"
                : result.status || "success";

            if (status === "error")
            {
                this.fail(index, result.content.toString());

                return;
            }

            this.response_metadata["toolCalls"][index] = {
                ...this.response_metadata["toolCalls"][index],
                status,
                result: {
                    // tool_call_id: result.tool_call_id,
                    // name: result.name || "(no name)",
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

    static items(msg: ToolProgressMessage): IToolProgress[] 
    {
        return msg.response_metadata["toolCalls"];
    }
}

const getCustomMessageType = (message: BaseMessage) => message.additional_kwargs["__coba_type"] as ("error" | "tool-progress" | undefined);

export
{
    ErrorMessage,
    getCustomMessageType,
    ToolProgressMessage,
};
