import { ChatAnthropic } from "@langchain/anthropic";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, BaseMessage, SystemMessage, trimMessages } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";

import tryCatch from "../utils/try-catch.js";
import ErrorMessage from "./error-message.js";
import { systemPrompts } from "./system-prompt.js";

export type TProvider = "ollama" | "openai" | "anthropic" | "gemini" | "openrouter";

export interface IChatServiceOptions
{
    provider: TProvider;
    model: string;

    apiKey?: string;
    apiUrl?: string;
    headers?: Record<string, string>;
}

class ChatService
{
    current?: {
        llm: BaseChatModel;
        provider: TProvider;
        model: string;

        systemMessage?: SystemMessage;
        trimmer: Runnable<BaseMessage[], BaseMessage[]>;
    };

    async getLLM(props: IChatServiceOptions): Promise<BaseChatModel>
    {
        const { provider, model } = props;

        if (this.current && this.current.provider === provider && this.current.model === model)
        {
            return this.current.llm;
        }

        let llm: BaseChatModel;

        let contextSize = 32 * 1024; // Default to 32k context size

        if (provider === "ollama")
        {
            contextSize = 8192; // 8k context size

            llm = new ChatOllama({
                model,
                baseUrl: props.apiUrl, // || process.env["OLLAMA_API_URL"],
                numCtx: contextSize,
            });
        }
        else if (provider === "openai")
        {
            llm = new ChatOpenAI({
                model,
                openAIApiKey: props.apiKey, // || process.env["OPENAI_API_KEY"],
                configuration: {
                    baseURL: props.apiUrl, // || process.env["OPENAI_API_BASE_URL"],
                },
            });
        }
        else if (provider === "anthropic")
        {
            llm = new ChatAnthropic({ model });
        }
        else if (provider === "gemini")
        {
            llm = new ChatGoogleGenerativeAI({ model });
        }
        else if (provider === "openrouter")
        {
            llm = new ChatOpenAI({
                model,
                openAIApiKey: props.apiKey, // || process.env["OPENROUTER_API_KEY"],
                configuration: {
                    baseURL: props.apiUrl || "https://openrouter.ai/api/v1", // || process.env["OPENROUTER_API_BASE_URL"],
                },
            });
        }
        else
        {
            throw new Error(`Unknown provider ${provider}`);
        }

        this.current = {
            llm,
            provider,
            model,

            systemMessage: new SystemMessage(
                systemPrompts[provider as keyof typeof systemPrompts] || systemPrompts.default
            ),

            trimmer: trimMessages({
                tokenCounter: llm,
                maxTokens: contextSize,

                strategy: "last",
                allowPartial: false,
                includeSystem: true,
                startOn: ["system", "human"],
                // endOn: ["tool", "ai"],
            }),
        };

        return this.current.llm;
    }

    async prepareMessages(messages: BaseMessage[])
    {
        if (!this.current)
        {
            throw new Error("ChatService is not initialized. Call getLLM() first.");
        }

        let preparedMessages = messages.filter(msg => !ErrorMessage.isErrorMessage(msg));

        if (this.current.llm.getName() === "ChatOllama")
        {
            preparedMessages = preparedMessages.map(msg => 
            {
                return msg.getType() !== "tool" ? msg : new AIMessage({
                    content: "Result of tool call " + msg.name + ":\n\n" + (msg.text || "ERROR: No content returned from tool."),
                });
            });
        }

        const { result } = await tryCatch(this.current.trimmer.invoke(preparedMessages));

        if (result)
        {
            preparedMessages = result;
        }

        return [
            ...(this.current.systemMessage ? [this.current.systemMessage] : []),
            ...preparedMessages
        ];
    }
}

export { ChatService };
