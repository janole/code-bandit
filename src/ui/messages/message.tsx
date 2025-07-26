import { BaseMessage, MessageType } from "@langchain/core/messages";
import React, { memo } from "react";

import { ErrorMessage, ToolProgressMessage } from "../../ai/custom-messages.js";
import { BaseMessageView } from "./base-message-view.js";
import { ErrorMessageView } from "./error-message-view.js";
import { ToolMessageView } from "./tool-message-view.js";
import { MessageDebugLog, MessageProps } from "./types.js";

function Message(props: MessageProps)
{
    const { msg, debug } = props;

    const type = msg.getType();

    if (type === "tool-progress")
    {
        return <ToolMessageView msg={msg as ToolProgressMessage} selected={props.selected} updateMessage={props.updateMessage} />;
    }

    if (type === "error")
    {
        return <ErrorMessageView msg={msg as ErrorMessage} />;
    }

    return (<>

        {(msg instanceof BaseMessage) &&
            <BaseMessageView msg={msg} type={type as MessageType} />}

        {debug &&
            <MessageDebugLog msg={msg} />
        }

    </>);
}

const MemoMessage = memo(Message);

export default MemoMessage;

export { Message };
