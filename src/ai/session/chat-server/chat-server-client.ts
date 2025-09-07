import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";

import { ErrorMessage, TMessage, TMessageType, ToolProgressMessage } from "../../custom-messages.js";
import { IChatSession } from "../session.js";
import { ApiClient } from "./api-client.js";
import { IChat, IChatMessage } from "./types.js";

const URL = process.env["CODE_BANDIT_SERVER_URL"];
const PAT = process.env["CODE_BANDIT_SERVER_PAT"];

const chatServerClient = URL && PAT ? new ApiClient({ baseUrl: URL, token: PAT }) : undefined;

chatServerClient?.start();

function mapMessage(message: TMessage): IChatMessage
{
    const type: TMessageType = message.getType();

    const base = {
        history: [],
        historyIndex: 0,
        createdAt: Date.now(),
    };

    if (type === "tool-progress")
    {
        const toolProgressMessage = message as ToolProgressMessage;

        return {
            ...base,
            role: "tool-progress",
            content: toolProgressMessage.content ?? "",
            toolCall: {
                ...toolProgressMessage.toolCall,
                status: toolProgressMessage.status,
                confirmState: toolProgressMessage.confirmState,
            },
        };
    }

    if (type === "error")
    {
        const errorMessage = message as ErrorMessage;

        return {
            ...base,
            role: type,
            content: errorMessage.content,
            privateData: errorMessage,
        };
    }

    if (type === "human")
    {
        const userMessage = message as HumanMessage;

        return {
            ...base,
            role: "user",
            content: userMessage.text,
        };
    }

    if (type === "ai")
    {
        const assistantMessage = message as AIMessage;

        return {
            ...base,
            hidden: assistantMessage.text.length === 0,
            role: "assistant",
            content: assistantMessage.text,
        };
    }

    if (type === "system")
    {
        return {
            ...base,
            role: type,
            content: (message as BaseMessage).text,
        };
    }

    return {
        ...base,
        role: "private",
        hidden: true,
        content: (message as BaseMessage).text,
        privateData: message,
    };
}

function mapSessionToChat(session: IChatSession): IChat
{
    const chat: IChat = {
        id: session.id,
        model: {
            id: "langchain",
            account: {
                id: "langchain",
                name: "langchain",
            },
            name: session.chatServiceOptions.model,
            provider: "langchain",
            state: { ready: true },
        },
        workspace: {
            workDir: session.workDir,
        },
        toolMode: session.toolMode,
        messages: session.messages.map(mapMessage),
        state: "done",
    };

    return chat;
}

export
{
    chatServerClient, mapMessage, mapSessionToChat,
};

