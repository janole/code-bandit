import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { ChatAnthropic } from "@langchain/anthropic";

export type TProvider = "ollama" | "openai" | "anthropic";
class ChatService
{
    current?: {
        llm: BaseChatModel;
        provider: TProvider;
        model: string;
    };

    async getLLM(provider: TProvider, model: string): Promise<BaseChatModel>
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
        else if (provider === "anthropic")
        {
            llm = new ChatAnthropic({ model });
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
