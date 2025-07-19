import { BaseChatModelCallOptions } from "@langchain/core/language_models/chat_models";
import { AIMessageChunk, BaseMessage, ToolMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import { concat } from "@langchain/core/utils/stream";
import { DynamicStructuredTool } from "langchain/tools";

import tryCatch from "../utils/try-catch.js";
import { ChatService } from "./chat-service.js";
import { IChatSession } from "./chat-session.js";
import { ErrorMessage, ToolProgressMessage } from "./messages.js";
import { getTools } from "./tools/loader.js";

export type TMessage = BaseMessage;

const chatService = new ChatService();

async function getStream(llm: Runnable<TMessage[], AIMessageChunk>, messages: TMessage[], options?: Partial<BaseChatModelCallOptions>)
{
    const preparedMessages = await chatService.prepareMessages(messages);

    const { result: stream, error } = await tryCatch(llm.stream(preparedMessages, options));

    return { stream, error };
}

interface WorkProps
{
    session: IChatSession;
    send: (messages: TMessage[]) => void;
    signal: AbortSignal;
}

async function work(props: WorkProps)
{
    const { session, send, signal } = props;

    const tools = getTools({ includeDestructiveTools: !session.readOnly });

    const llm = await chatService.getLLM(session).then(llm => 
    {
        if (!llm.bindTools)
        {
            throw new Error("LLM does not support binding tools.");
        }

        return llm.bindTools(Object.values(tools)); // .withFallbacks([llm]);
    });

    return workInternal({ session, llm, tools, send, signal });
}

interface WorkInternalProps extends Pick<WorkProps, "session" | "send" | "signal">
{
    llm: Runnable<TMessage[], AIMessageChunk>;
    tools: { [key: string]: DynamicStructuredTool };
}

async function workInternal(props: WorkInternalProps)
{
    const { session, llm, tools, send, signal } = props;

    const messages = [...session.messages];
    const metadata = { workDir: session.workDir };

    let { stream, error } = await getStream(llm, messages, { metadata, signal });

    if (!stream)
    {
        messages.push(new ErrorMessage(`ERROR: ${error?.message || error?.toString() || "llm.stream(...) failed."}`, error));

        send([...messages]);

        return messages;
    }

    let aiMessage: AIMessageChunk | undefined = undefined;

    try
    {
        for await (const chunk of stream)
        {
            aiMessage = aiMessage !== undefined ? concat(aiMessage, chunk) : chunk;

            if (!aiMessage?.tool_calls?.length && !aiMessage?.tool_call_chunks?.length)
            {
                send([...messages, aiMessage]); // TODO: check for race conditions
            }
        }
    }
    catch (error: any)
    {
        messages.push(new ErrorMessage(`ERROR: ${error?.message || error?.toString() || "for await (...) failed."}`, error));

        send([...messages]);

        return messages;
    }

    aiMessage && messages.push(aiMessage) && send([...messages]);

    if (!aiMessage?.tool_calls?.length)
    {
        return messages;
    }

    const toolProgressMessage = new ToolProgressMessage();

    for (const [index, toolCall] of aiMessage.tool_calls.entries())
    {
        const selectedTool = tools[toolCall.name];

        toolProgressMessage.pending(index, toolCall);
        send([...messages, toolProgressMessage]);

        if (!selectedTool)
        {
            toolProgressMessage.fail(index, "Tool not found");
        }
        else
        {
            const { result, error } = await tryCatch<ToolMessage>(selectedTool.invoke(toolCall, { metadata }));

            if (result)
            {
                toolProgressMessage.success(index, result);
                messages.push(result);
            }
            else
            {
                toolProgressMessage.fail(index, error || "Unknown Error");
            }
        }

        send([...messages, toolProgressMessage]);
    }

    messages.push(toolProgressMessage);

    return workInternal({ ...props, session: { ...session, messages } });
}

export { work };
