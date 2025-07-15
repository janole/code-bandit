import { BaseMessage, MessageType } from "@langchain/core/messages";

class ErrorMessage extends BaseMessage
{
    override _getType(): MessageType
    {
        return "generic";
    }

    static isErrorMessage(message: BaseMessage)
    {
        return message.additional_kwargs["__coba_type"] === "error";
    }

    constructor(content: string, error?: Error)
    {
        super({ content });

        this.additional_kwargs["__coba_type"] = "error";
        this.response_metadata = { error };
    }
}

export default ErrorMessage;
