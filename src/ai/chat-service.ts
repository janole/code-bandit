import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";

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

export { ChatService };
