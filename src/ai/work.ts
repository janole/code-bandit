import { AIMessageChunk, ToolMessage } from "@langchain/core/messages";
import { concat } from "@langchain/core/utils/stream";

import tryCatch from "../utils/try-catch.js";
import { ChatService } from "./chat-service.js";
import { ErrorMessage, setMessageIsStreaming, TMessage, ToolProgressMessage } from "./custom-messages.js";
import { ChatSession } from "./session/session.js";

interface WorkProps
{
    chatService: ChatService;
    session: ChatSession;
    streaming?: boolean;
    signal?: AbortSignal;
}

async function work(props: WorkProps)
{
    const { session, chatService, streaming = true, signal } = props;

    const messages = await workTools({ ...props, session });

    if (needsToolConfirmation(messages))
    {
        return messages;
    }

    let aiMessage: AIMessageChunk | undefined = undefined;
    let toolProgressMessages: ToolProgressMessage[] = [];

    if (streaming)
    {
        const { result: stream, error } = await tryCatch(chatService.stream(session, signal));

        if (!stream)
        {
            messages.push(new ErrorMessage(`ERROR: ${error?.message || error?.toString() || "llm.stream(...) failed."}`, error));
            return messages;
        }

        for await (const chunk of stream)
        {
            aiMessage = aiMessage !== undefined ? concat(aiMessage, chunk) : chunk;
            setMessageIsStreaming(aiMessage, true);

            if (!aiMessage?.tool_calls?.length && !aiMessage?.tool_call_chunks?.length)
            {
                session.setMessages([...messages, aiMessage]);
            }
            else
            {
                toolProgressMessages = ToolProgressMessage.createFromChunks(aiMessage.tool_call_chunks);

                if (toolProgressMessages.length)
                {
                    session.setMessages([...messages, aiMessage, ...toolProgressMessages]);
                }
            }
        }
    }
    else
    {
        const { result, error } = await tryCatch(chatService.generate(session, signal));

        if (!result || error)
        {
            messages.push(new ErrorMessage(`ERROR: ${error?.message || error?.toString() || "llm.generate(...) failed."}`, error));
            return messages;
        }

        aiMessage = result;
    }

    if (aiMessage)
    {
        setMessageIsStreaming(aiMessage, false);
        messages.push(aiMessage);
    }

    if (!aiMessage?.tool_calls?.length)
    {
        return messages;
    }

    // add pending toolCall(s)
    toolProgressMessages = aiMessage.tool_calls.map(toolCall => new ToolProgressMessage(toolCall)) || [];
    session.setMessages([...messages, ...toolProgressMessages]);

    await session.flush();

    return work(props);
}

async function workTools(props: Pick<WorkProps, "session" | "chatService" | "signal">)
{
    const { session, chatService } = props;

    const messages = [...session.messages];

    const toolProgressMessages = messages.filter(m => ToolProgressMessage.isTypeOf(m) && (m.status === "pending" || m.status === "confirmed" || m.status === "declined")) as ToolProgressMessage[];

    if (toolProgressMessages.length === 0)
    {
        return messages;
    }

    const metadata = { workDir: session.workDir };

    for (const toolProgressMessage of toolProgressMessages)
    {
        const toolCall = toolProgressMessage.toolCall!;
        const selectedTool = chatService.tools?.[toolCall.name];

        if (!selectedTool)
        {
            toolProgressMessage.status = "error";
            toolProgressMessage.content = "Tool not found";

            addFailedToolCallMessage(toolProgressMessage.content, toolCall, messages);

            continue;
        }

        if (toolProgressMessage.status === "pending" && selectedTool.metadata?.["destructive"])
        {
            if (session.toolMode === "read-only")
            {
                toolProgressMessage.status = "error";
                toolProgressMessage.content = "Tool call denied by security policy";

                addFailedToolCallMessage(toolProgressMessage.content, toolCall, messages);

                continue;
            }
            else if (session.toolMode !== "yolo")
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

        session.setMessages(messages);

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

    session.setMessages(messages);

    return messages;
}

function needsToolConfirmation(messages: TMessage[])
{
    return messages.find(m => ToolProgressMessage.isTypeOf(m) && m.status === "pending-confirmation");
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
            },
        }));
    }
    else
    {
        messages.push(new ErrorMessage(content, (error instanceof Error) ? error : undefined));
    }
}

export { work };
