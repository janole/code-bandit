import { ChatAnthropic } from "@langchain/anthropic";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BaseMessage, SystemMessage, trimMessages } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";

import tryCatch from "../utils/try-catch.js";
import { IChatSession } from "./chat-session.js";
import { getCustomMessageType } from "./custom-messages.js";
import { PromptLoader } from "./prompt-loader.js";
import { TMessage } from "./work.js";

export type TProvider = "ollama" | "openai" | "anthropic" | "gemini" | "openrouter" | "groq";

export interface IChatServiceOptions
{
    provider: TProvider;
    model: string;

    contextSize?: number; // in tokens
    disableAgentRules?: boolean;

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

    async getLLM(session: IChatSession): Promise<BaseChatModel>
    {
        const { provider, model, contextSize, apiUrl, apiKey } = session.chatServiceOptions;

        // TODO: compare all relevant attributes like apiUrl, apiKey, ... !?
        if (this.current?.provider === provider && this.current.model === model && this.current.contextSize === contextSize)
        {
            return this.current.llm;
        }

        let llm: BaseChatModel;

        if (provider === "ollama")
        {
            llm = new ChatOllama({
                model,
                baseUrl: apiUrl, // || process.env["OLLAMA_API_URL"],
                numCtx: contextSize,
            });
        }
        else if (provider === "openai")
        {
            llm = new ChatOpenAI({
                model,
                openAIApiKey: apiKey, // || process.env["OPENAI_API_KEY"],
                configuration: {
                    baseURL: apiUrl, // || process.env["OPENAI_API_BASE_URL"],
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
                openAIApiKey: apiKey, // || process.env["OPENROUTER_API_KEY"],
                configuration: {
                    baseURL: apiUrl || "https://openrouter.ai/api/v1", // || process.env["OPENROUTER_API_BASE_URL"],
                },
            });
        }
        else if (provider === "groq")
        {
            llm = new ChatGroq({
                model,
                apiKey: apiKey, // || process.env["GROQ_API_KEY"]
                baseUrl: apiUrl,
            });
        }
        else
        {
            throw new Error(`Unknown provider ${provider}`);
        }

        const promptLoader = await PromptLoader.create(session);
        const systemPrompt = promptLoader.getSystemPrompt();

        this.current = {
            llm,
            provider,
            model,

            contextSize,

            systemMessage: new SystemMessage(systemPrompt),
        };

        return this.current.llm;
    }

    async prepareMessages(messages: TMessage[])
    {
        if (!this.current)
        {
            throw new Error("ChatService is not initialized. Call getLLM() first.");
        }

        let preparedMessages = messages.filter(msg => !getCustomMessageType(msg)) as BaseMessage[]; // TODO: fix cast

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

        if (this.current.systemMessage)
        {
            preparedMessages.unshift(this.current.systemMessage);
        }

        return preparedMessages;
    }
}

export { ChatService };
