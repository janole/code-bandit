import { AIMessageChunk, BaseMessage, ToolMessage } from "@langchain/core/messages";
import { concat } from "@langchain/core/utils/stream";
import { Runnable } from "@langchain/core/runnables";
import { DynamicStructuredTool } from "langchain/tools";
import tryCatch from "../utils/try-catch.js";
import { ChatService, IChatServiceOptions } from "./chat-service.js";
import { tools } from "./file-system-tools.js";
import ErrorMessage from "./error-message.js";

export type TMessage = BaseMessage;

const filterMessages = (messages: TMessage[]) => messages.filter(msg => !(msg instanceof ErrorMessage));

const chatService = new ChatService();

function addFailedToolCallMessage(errorMessage: string, toolCall: { id?: string; name: string }, messages: TMessage[])
{
    const content = `ERROR: Tool invocation failed for tool ${toolCall.name} with error: ${errorMessage}.`;

    if (toolCall.id)
    {
        messages.push(new ToolMessage({
            tool_call_id: toolCall.id,
            content,
        }));
    }
    else
    {
        messages.push(new ErrorMessage(content));
    }
}

interface WorkProps
{
    workDir: string;
    chatServiceOptions: IChatServiceOptions;
    messages: TMessage[];
    send: (messages: TMessage[]) => void;
}

async function work(props: WorkProps)
{
    const { workDir, chatServiceOptions, messages, send } = props;

    const llm = await chatService.getLLM(chatServiceOptions);
    const llmWithTools = llm.bindTools?.(Object.values(tools)) ?? llm;

    return workInternal({ workDir, llm, llmWithTools, tools, messages, send });
}

interface WorkInternalProps
{
    workDir: string;
    llm: Runnable<TMessage[], AIMessageChunk>;
    llmWithTools: Runnable<TMessage[], AIMessageChunk>;
    tools: { [key: string]: DynamicStructuredTool };
    messages: TMessage[];
    send: (messages: TMessage[]) => void;
}

async function workInternal(props: WorkInternalProps)
{
    const { workDir, llm, llmWithTools, tools, send } = props;

    const messages = [...props.messages];

    let { result: stream, error } = await tryCatch(llmWithTools.stream(filterMessages(messages), { metadata: { workDir } }));

    if (!stream)
    {
        messages.push(new ErrorMessage(`Error: ${error?.message || error?.toString() || "llmWithTools() failed."}`));

        stream = await llm.stream(filterMessages(messages));
    }

    let aiMessage: AIMessageChunk | undefined = undefined;

    for await (const chunk of stream)
    {
        aiMessage = aiMessage !== undefined ? concat(aiMessage, chunk) : chunk;

        if (!aiMessage?.tool_calls || aiMessage.tool_calls.length === 0)
        {
            send([...messages, aiMessage]);
        }
    }

    aiMessage && messages.push(aiMessage) && send([...messages]);

    if (aiMessage?.tool_calls && aiMessage.tool_calls.length > 0)
    {
        for (const toolCall of aiMessage.tool_calls)
        {
            const selectedTool = tools[toolCall.name];

            if (!selectedTool)
            {
                addFailedToolCallMessage("Tool not found", toolCall, messages);

                continue;
            }

            const { result, error } = await tryCatch(selectedTool.invoke(toolCall, { metadata: { workDir } }));

            if (result)
            {
                messages.push(result);
            }
            else
            {
                addFailedToolCallMessage(error?.message || "Unknown Error", toolCall, messages);
            }
        }

        return workInternal({ ...props, messages });
    }

    return messages;
}

export { work };
