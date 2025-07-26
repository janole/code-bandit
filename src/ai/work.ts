import { BaseChatModelCallOptions } from "@langchain/core/language_models/chat_models";
import { AIMessageChunk, BaseMessage, ToolMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import { concat } from "@langchain/core/utils/stream";
import { DynamicStructuredTool } from "langchain/tools";

import tryCatch from "../utils/try-catch.js";
import { ChatService } from "./chat-service.js";
import { IChatSession } from "./chat-session.js";
import { ErrorMessage, TMessage, ToolProgressMessage } from "./custom-messages.js";
import { getTools } from "./tools/loader.js";

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

    const tools = getTools({ includeDestructiveTools: session.toolMode !== "read-only" });

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
    llm: Runnable<BaseMessage[], AIMessageChunk>;
    tools: { [key: string]: DynamicStructuredTool };
}

async function workInternal(props: WorkInternalProps)
{
    const { session, llm, send, signal } = props;

    const messages = await workTools({ ...props, session });

    if (needsToolConfirmation(messages))
    {
        return messages;
    }

    const metadata = { workDir: session.workDir };

    let { stream, error } = await getStream(llm, messages, { metadata, signal });

    if (!stream)
    {
        messages.push(new ErrorMessage(`ERROR: ${error?.message || error?.toString() || "llm.stream(...) failed."}`, error));
        return messages;
    }

    let aiMessage: AIMessageChunk | undefined = undefined;
    let toolProgressMessages: ToolProgressMessage[] = [];

    for await (const chunk of stream)
    {
        aiMessage = aiMessage !== undefined ? concat(aiMessage, chunk) : chunk;

        if (!aiMessage?.tool_calls?.length && !aiMessage?.tool_call_chunks?.length)
        {
            send([...messages, aiMessage]); // TODO: check for race conditions
        }
        else
        {
            toolProgressMessages = ToolProgressMessage.createFromChunks(aiMessage.tool_call_chunks);

            if (toolProgressMessages.length)
            {
                send([...messages, aiMessage, ...toolProgressMessages]);
            }
        }
    }

    if (aiMessage)
    {
        messages.push(aiMessage);
    }

    if (!aiMessage?.tool_calls?.length)
    {
        return messages;
    }

    // add pending toolCall(s)
    toolProgressMessages = aiMessage.tool_calls.map(toolCall => new ToolProgressMessage(toolCall)) || [];
    messages.push(...toolProgressMessages);

    return workInternal({ ...props, session: { ...session, messages } });
}

async function workTools(props: Pick<WorkInternalProps, "session" | "tools" | "send" | "signal">)
{
    const { session: { workDir, messages, toolMode }, tools, send } = props;

    const toolProgressMessages = messages.filter(m => ToolProgressMessage.isTypeOf(m) && (m.status === "pending" || m.status === "confirmed" || m.status === "declined")) as ToolProgressMessage[];

    if (toolProgressMessages.length === 0)
    {
        return messages;
    }

    const metadata = { workDir };

    for (const toolProgressMessage of toolProgressMessages)
    {
        const toolCall = toolProgressMessage.toolCall!;
        const selectedTool = tools[toolCall.name];

        if (!selectedTool)
        {
            toolProgressMessage.status = "error";
            toolProgressMessage.content = "Tool not found";

            addFailedToolCallMessage(toolProgressMessage.content, toolCall, messages);

            continue;
        }

        if (toolProgressMessage.status === "pending" && selectedTool.metadata?.["destructive"])
        {
            if (toolMode === "read-only")
            {
                toolProgressMessage.status = "error";
                toolProgressMessage.content = "Tool call denied by security policy";

                addFailedToolCallMessage(toolProgressMessage.content, toolCall, messages);

                continue;
            }
            else if (toolMode !== "yolo")
            {
                toolProgressMessage.status = "pending-confirmation";

                continue;
            }
        }

        if (toolProgressMessage.status === "declined")
        {
            toolProgressMessage.status = "error";
            toolProgressMessage.content = "User declined tool call";

            addFailedToolCallMessage(toolProgressMessage.content, toolCall, messages);

            continue;
        }

        send([...messages]);

        const { result, error } = await tryCatch<ToolMessage>(selectedTool.invoke(toolCall, { metadata }));

        if (result)
        {
            messages.push(result);

            toolProgressMessage.status = result.text.startsWith("ERROR: ") ? "error" : (result.status || "success");
            toolProgressMessage.content = result.text;

            continue;
        }

        addFailedToolCallMessage(error || "Unknown Error", toolCall, messages);

        toolProgressMessage.status = "error";
        toolProgressMessage.content = error?.message || "Unknown Error";
    }

    send([...messages]);

    return [...messages];
}

export function needsToolConfirmation(messages: TMessage[])
{
    return messages.find(m => ToolProgressMessage.isTypeOf(m) && m.status === "pending-confirmation");
}

export { work };
