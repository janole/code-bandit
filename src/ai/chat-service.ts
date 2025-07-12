import { ChatAnthropic } from "@langchain/anthropic";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, BaseMessage, SystemMessage, trimMessages } from "@langchain/core/messages";
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

    contextSize?: number; // in tokens

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

        contextSize?: number;
        systemMessage?: SystemMessage;
    };

    async getLLM(props: IChatServiceOptions): Promise<BaseChatModel>
    {
        let { provider, model, contextSize = 32 * 1024 } = props;

        if (this.current && this.current.provider === provider && this.current.model === model)
        {
            return this.current.llm;
        }

        let llm: BaseChatModel;

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

            contextSize,

            systemMessage: new SystemMessage(
                systemPrompts[provider as keyof typeof systemPrompts] || systemPrompts.default
            ),
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

        if (this.current.contextSize)
        {
            const { result } = await tryCatch(trimMessages(preparedMessages, {
                tokenCounter: this.current.llm,
                maxTokens: this.current.contextSize,

                strategy: "last",
                allowPartial: false,
                includeSystem: true,
                startOn: ["system", "human"],
                // endOn: ["tool", "ai"],
            }));

            if (result)
            {
                preparedMessages = result;
            }
        }

        return [
            ...(this.current.systemMessage ? [this.current.systemMessage] : []),
            ...preparedMessages
        ];
    }
}

export { ChatService };
