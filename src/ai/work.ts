import { AIMessageChunk, BaseMessage, ToolMessage } from "@langchain/core/messages";
import { concat } from "@langchain/core/utils/stream";
import { Runnable } from "@langchain/core/runnables";
import { DynamicStructuredTool } from "langchain/tools";
import tryCatch from "../utils/try-catch.js";
import { ChatService, TProvider } from "./chat-service.js";
import { tools } from "./file-system-tools.js";

export type TMessage = BaseMessage;

const chatService = new ChatService();

interface WorkProps
{
    workDir: string;
    provider: TProvider;
    model: string;
    messages: TMessage[];
    send: (messages: TMessage[]) => void;
}

async function work(props: WorkProps)
{
    const { workDir, provider, model, messages, send } = props;

    const llm = await chatService.getLLM(provider, model);
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

    let { result: stream, error } = await tryCatch(llmWithTools.stream(messages, { metadata: { workDir } }));

    if (!stream)
    {
        console.error(error);
        stream = await llm.stream(messages);
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

            if (selectedTool)
            {
                const { result, error } = await tryCatch(selectedTool.invoke(toolCall, { metadata: { workDir } }));

                if (result)
                {
                    messages.push(result);
                }
                else if (toolCall.id)
                {
                    messages.push(new ToolMessage({
                        tool_call_id: toolCall.id,
                        content: error?.message || "ERROR: Tool invocation failed for tool " + toolCall.name,
                    }));
                }
            }
        }

        return workInternal({ ...props, messages });
    }

    return messages;
}

export { work };
