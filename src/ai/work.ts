import { AIMessage, AIMessageChunk, BaseMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { concat } from "@langchain/core/utils/stream";
import { Runnable } from "@langchain/core/runnables";
import { BaseChatModelCallOptions } from "@langchain/core/language_models/chat_models";
import { DynamicStructuredTool } from "langchain/tools";
import tryCatch from "../utils/try-catch.js";
import { ChatService, IChatServiceOptions } from "./chat-service.js";
import { tools } from "./file-system-tools.js";
import ErrorMessage from "./error-message.js";
import { systemPrompts } from "./system-prompt.js";

export type TMessage = BaseMessage;

const systemMessage = new SystemMessage(systemPrompts.test);

function prepareMessages(messages: TMessage[], transformToolMessages?: boolean): TMessage[]
{
    let preparedMessages = messages.filter(msg => !(msg instanceof ErrorMessage));

    if (transformToolMessages)
    {
        preparedMessages = preparedMessages.map(msg => 
        {
            return msg.getType() !== "tool" ? msg : new AIMessage({
                content: "Result of tool call " + msg.name + ":\n\n" + (msg.text || "ERROR: No content returned from tool."),
            });
        });
    }

    return [
        systemMessage,
        ...preparedMessages
    ];
}

async function getStream(llm: Runnable<TMessage[], AIMessageChunk>, messages: TMessage[], options?: Partial<BaseChatModelCallOptions>)
{
    const transformToolMessages = llm.getName() === "ChatOllama";

    const { result: stream, error } = await tryCatch(llm.stream(prepareMessages(messages, transformToolMessages), options));

    return { stream, error };
}

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

    const llm = await chatService.getLLM(chatServiceOptions).then(llm => 
    {
        if (!llm.bindTools)
        {
            throw new Error("LLM does not support binding tools.");
        }

        return llm.bindTools(Object.values(tools)); // .withFallbacks([llm]);
    });

    return workInternal({ workDir, llm, tools, messages, send });
}

interface WorkInternalProps
{
    workDir: string;
    llm: Runnable<TMessage[], AIMessageChunk>;
    tools: { [key: string]: DynamicStructuredTool };
    messages: TMessage[];
    send: (messages: TMessage[]) => void;
}

async function workInternal(props: WorkInternalProps)
{
    const { workDir, llm, tools, send } = props;

    const messages = [...props.messages];

    let { stream, error } = await getStream(llm, messages, { metadata: { workDir } });

    if (!stream)
    {
        messages.push(new ErrorMessage(`ERROR: ${error?.message || error?.toString() || "llm.stream(...) failed."}`));

        send([...messages]);

        return messages;
    }

    let aiMessage: AIMessageChunk | undefined = undefined;
    const toolMessages: AIMessageChunk[] = [];

    for await (const chunk of stream)
    {
        // once we detect a tool message, stop streaming chunks to frontend
        if (chunk.tool_calls?.length || toolMessages.length)
        {
            toolMessages.push(chunk);
        }
        else
        {
            aiMessage = aiMessage !== undefined ? concat(aiMessage, chunk) : chunk;
            send([...messages, aiMessage]);
        }
    }

    aiMessage && messages.push(aiMessage);

    if (toolMessages.length === 0)
    {
        return messages;
    }

    for (const toolMessage of toolMessages)
    {
        messages.push(toolMessage);
        send([...messages]);

        for (const toolCall of (toolMessage.tool_calls || []))
        {
            const selectedTool = tools[toolCall.name];

            if (!selectedTool)
            {
                addFailedToolCallMessage("Tool not found", toolCall, messages);
            }
            else
            {
                const { result, error } = await tryCatch<ToolMessage>(selectedTool.invoke(toolCall, { metadata: { workDir } }));

                if (result)
                {
                    messages.push(result);
                }
                else
                {
                    addFailedToolCallMessage(error?.message || "Unknown Error", toolCall, messages);
                }
            }

            send([...messages]);
        }
    }

    return workInternal({ ...props, messages });
}

export { work };
