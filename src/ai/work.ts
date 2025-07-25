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
    confirmToolUse: (tool: DynamicStructuredTool) => Promise<boolean>;
    signal: AbortSignal;
}

async function work(props: WorkProps)
{
    const { session, send, confirmToolUse, signal } = props;

    const tools = getTools({ includeDestructiveTools: !session.readOnly });

    const llm = await chatService.getLLM(session).then(llm => 
    {
        if (!llm.bindTools)
        {
            throw new Error("LLM does not support binding tools.");
        }

        return llm.bindTools(Object.values(tools)); // .withFallbacks([llm]);
    });

    return workInternal({ session, llm, tools, send, confirmToolUse, signal });
}

interface WorkInternalProps extends Pick<WorkProps, "session" | "send" | "confirmToolUse" | "signal">
{
    llm: Runnable<BaseMessage[], AIMessageChunk>;
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

    toolProgressMessages = aiMessage.tool_calls.map(toolCall => new ToolProgressMessage(toolCall)) || [];

    for (let i = 0; i < toolProgressMessages.length; i++)
    {
        const toolCall = toolProgressMessages[i]!.toolCall!;
        const selectedTool = tools[toolCall.name];

        send([...messages, ...toolProgressMessages]);

        if (!selectedTool)
        {
            addFailedToolCallMessage("Tool not found", toolCall, messages);
            toolProgressMessages[i] = new ToolProgressMessage(toolCall, "error", "Tool not found");

            continue;
        }

        const confirm = await tryCatch<boolean>(props.confirmToolUse(selectedTool));

        if (!confirm.result)
        {
            addFailedToolCallMessage("Tool execution declined by user!", toolCall, messages);
            toolProgressMessages[i] = new ToolProgressMessage(toolCall, "error", "Tool execution declined!");

            continue;
        }

        const { result, error } = await tryCatch<ToolMessage>(selectedTool.invoke(toolCall, { metadata }));

        if (result)
        {
            messages.push(result);
            toolProgressMessages[i] = new ToolProgressMessage(toolCall, result.text.startsWith("ERROR: ") ? "error" : (result.status || "success"), result.text);
        }
        else
        {
            addFailedToolCallMessage(error || "Unknown Error", toolCall, messages);
            toolProgressMessages[i] = new ToolProgressMessage(toolCall, "error", error?.message || "Unknown Error");
        }
    }

    messages.push(...toolProgressMessages);
    send([...messages]);

    return workInternal({ ...props, session: { ...session, messages } });
}

export { work };
