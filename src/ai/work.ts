import { BaseChatModelCallOptions } from "@langchain/core/language_models/chat_models";
import { AIMessageChunk, BaseMessage, ToolMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import { concat } from "@langchain/core/utils/stream";
import { DynamicStructuredTool } from "langchain/tools";

import tryCatch from "../utils/try-catch.js";
import { ChatService } from "./chat-service.js";
import { IChatSession } from "./chat-session.js";
import ErrorMessage from "./error-message.js";
import { getTools } from "./tools/loader.js";

export type TMessage = BaseMessage;

const chatService = new ChatService();

async function getStream(llm: Runnable<TMessage[], AIMessageChunk>, messages: TMessage[], options?: Partial<BaseChatModelCallOptions>)
{
    const preparedMessages = await chatService.prepareMessages(messages);

    const { result: stream, error } = await tryCatch(llm.stream(preparedMessages, options));

    return { stream, error };
}

function addFailedToolCallMessage(error: string | Error, toolCall: { id?: string; name: string }, messages: TMessage[])
{
    const errorMessage = (error instanceof Error) ? error.message : error.toString();

    const content = `ERROR: Tool invocation failed for tool ${toolCall.name} with error: ${errorMessage}.`;

    if (toolCall.id)
    {
        messages.push(new ToolMessage({
            tool_call_id: toolCall.id,
            status: "error",
            content,
            response_metadata: {
                error,
            }
        }));
    }
    else
    {
        messages.push(new ErrorMessage(content, (error instanceof Error) ? error : undefined));
    }
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

    for await (const chunk of stream)
    {
        aiMessage = aiMessage !== undefined ? concat(aiMessage, chunk) : chunk;

        if (!aiMessage?.tool_calls?.length && !aiMessage?.tool_call_chunks?.length)
        {
            send([...messages, aiMessage]); // TODO: check for race conditions
        }
    }

    aiMessage && messages.push(aiMessage) && send([...messages]);

    if (!aiMessage?.tool_calls?.length)
    {
        return messages;
    }

    for (const toolCall of aiMessage.tool_calls)
    {
        const selectedTool = tools[toolCall.name];

        if (!selectedTool)
        {
            addFailedToolCallMessage("Tool not found", toolCall, messages);
        }
        else
        {
            const { result, error } = await tryCatch<ToolMessage>(selectedTool.invoke(toolCall, { metadata }));

            if (result)
            {
                messages.push(result);
            }
            else
            {
                addFailedToolCallMessage(error || "Unknown Error", toolCall, messages);
            }
        }

        send([...messages]);
    }

    return workInternal({ ...props, session: { ...session, messages } });
}

export { work };
