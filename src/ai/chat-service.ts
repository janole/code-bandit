import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

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
    };

    async getLLM(props: IChatServiceOptions): Promise<BaseChatModel>
    {
        const { provider, model } = props;

        if (this.current && this.current.provider === provider && this.current.model === model)
        {
            return this.current.llm;
        }

        let llm: BaseChatModel;

        if (provider === "ollama")
        {
            llm = new ChatOllama({
                model,
                baseUrl: props.apiUrl, // || process.env["OLLAMA_API_URL"],
                numCtx: 8192, // 8k context size
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
        };

        return this.current.llm;
    }
}

export { ChatService };
