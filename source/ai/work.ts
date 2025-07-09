import { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { concat } from "@langchain/core/utils/stream";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { tools } from "./tools.js";
import { Runnable } from "@langchain/core/runnables";
import tryCatch from "../utils/try-catch.js";

export type TMessage = BaseMessage;

class ChatService
{
    current?: {
        llm: BaseChatModel;
        provider: "ollama" | "openai",
        model: string;
    };

    getLLM(provider: "ollama" | "openai", model: string): BaseChatModel
    {
        if (this.current && this.current.provider === provider && this.current.model === model)
        {
            return this.current.llm;
        }

        let llm: BaseChatModel;

        if (provider === "ollama")
        {
            llm = new ChatOllama({ model });
        }
        else if (provider === "openai")
        {
            llm = new ChatOpenAI({ model });
        }
        else
        {
            throw new Error(`Unknown provider ${provider}`);
        }

        this.current = {
            llm,
            provider,
            model,
        };

        return this.current.llm;
    }
}

const chatService = new ChatService();

interface WorkProps
{
    workDir: string;
    provider: "ollama" | "openai";
    model: string;
    messages: TMessage[];
    send: (messages: TMessage[]) => void;
}

async function work(props: WorkProps)
{
    const { workDir, provider, model, messages, send } = props;

    const llm = chatService.getLLM(provider, model);
    const llmWithTools = llm.bindTools?.(Object.values(tools)) ?? llm;

    return workInternal({ workDir, llm, llmWithTools, messages, send });
}

interface WorkInternalProps
{
    workDir: string;
    llm: Runnable<TMessage[], AIMessageChunk>;
    llmWithTools: Runnable<TMessage[], AIMessageChunk>;
    messages: TMessage[];
    send: (messages: TMessage[]) => void;
}

async function workInternal(props: WorkInternalProps)
{
    const { workDir, llm, llmWithTools, send } = props;

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
        send([...messages, aiMessage]);
    }

    aiMessage && messages.push(aiMessage);

    if (aiMessage?.tool_calls && aiMessage.tool_calls.length > 0)
    {
        for (const toolCall of aiMessage.tool_calls)
        {
            const selectedTool = tools[toolCall.name];

            if (selectedTool)
            {
                // @ts-expect-error
                const toolMessage = await selectedTool.invoke(toolCall, { metadata: { workDir } });
                messages.push(toolMessage);
            }
        }

        return workInternal({ ...props, messages });
    }

    return messages;
}

export { work };
