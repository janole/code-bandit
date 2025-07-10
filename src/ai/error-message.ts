import { BaseMessage, MessageType } from "@langchain/core/messages";

class ErrorMessage extends BaseMessage
{
    override _getType(): MessageType
    {
        return "generic";
    }

    static isErrorMessage(message: BaseMessage): message is ErrorMessage
    {
        return message instanceof ErrorMessage;
    }

    constructor(content: string)
    {
        super({ content });
    }
}

export default ErrorMessage;
