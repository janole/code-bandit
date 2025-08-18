import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BaseMessage, mapChatMessagesToStoredMessages, mapStoredMessageToChatMessage, SystemMessage, trimMessages } from "@langchain/core/messages";

import { getAppTitle, getGithubRepoUrl, getUserAgent } from "../utils/info.js";
import tryCatch from "../utils/try-catch.js";
import { IPromptLoader } from "./prompts/types.js";
import { IChatSession } from "./session/session.js";
import { IToolProvider, TTools } from "./tools/types.js";

const defaultHeaders = {
    "HTTP-Referer": getGithubRepoUrl(),
    "X-Title": getAppTitle(),
    "User-Agent": getUserAgent(),
};

export type TProvider = "ollama" | "openai" | "anthropic" | "gemini" | "openrouter" | "groq";

export interface IChatServiceOptions
{
    provider: TProvider;
    model: string;

    contextSize?: number; // in tokens
    maxMessages?: number;
    disableAgentRules?: boolean;

    apiKey?: string;
    apiUrl?: string;
    headers?: Record<string, string>;
}

class ChatService
{
    promptLoader?: IPromptLoader;
    toolProvider?: IToolProvider;

    current?: {
        llm: BaseChatModel;
        provider: TProvider;
        model: string;

        contextSize?: number;
        maxMessages?: number;

        tools?: TTools;
    };

    constructor(props: { promptLoader?: IPromptLoader; toolProvider?: IToolProvider; })
    {
        this.promptLoader = props.promptLoader;
        this.toolProvider = props.toolProvider;
    }

    private async getLLM(session: IChatSession): Promise<BaseChatModel>
    {
        const { provider, model, contextSize, maxMessages, apiUrl, apiKey } = session.chatServiceOptions;

        // TODO: compare all relevant attributes like apiUrl, apiKey, ... !?
        if (this.current?.provider === provider && this.current.model === model && this.current.contextSize === contextSize && this.current.maxMessages === maxMessages)
        {
            return this.current.llm;
        }

        let llm: BaseChatModel;

        if (provider === "ollama")
        {
            const { ChatOllama } = await import("@langchain/ollama");

            llm = new ChatOllama({
                model,
                baseUrl: apiUrl, // || process.env["OLLAMA_API_URL"],
                numCtx: contextSize,
            });
        }
        else if (provider === "openai")
        {
            const { ChatOpenAI } = await import("@langchain/openai");

            llm = new ChatOpenAI({
                model,
                openAIApiKey: apiKey, // || process.env["OPENAI_API_KEY"],
                configuration: {
                    baseURL: apiUrl, // || process.env["OPENAI_API_BASE_URL"],
                    defaultHeaders,
                },
            });
        }
        else if (provider === "anthropic")
        {
            const { ChatAnthropic } = await import("@langchain/anthropic");

            llm = new ChatAnthropic({
                model,
                maxTokens: 16384,
                anthropicApiKey: apiKey,
                anthropicApiUrl: apiUrl,
            });
        }
        else if (provider === "gemini")
        {
            const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");

            llm = new ChatGoogleGenerativeAI({
                model,
                apiKey,
            });
        }
        else if (provider === "openrouter")
        {
            const { ChatOpenAI } = await import("@langchain/openai");

            llm = new ChatOpenAI({
                model,
                configuration: {
                    baseURL: apiUrl || "https://openrouter.ai/api/v1", // || process.env["OPENROUTER_API_BASE_URL"],
                    apiKey: apiKey || process.env["OPENROUTER_API_KEY"],
                    defaultHeaders,
                },
            });
        }
        else if (provider === "groq")
        {
            const { ChatGroq } = await import("@langchain/groq");

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

        this.current = {
            llm,
            provider,
            model,

            contextSize,
            maxMessages,

            tools: this.toolProvider?.getTools(session),
        };

        return this.current.llm;
    }

    get tools()
    {
        return this.current?.tools;
    }

    async bindTools(session: IChatSession)
    {
        return await this.getLLM(session).then(llm => 
        {
            if (!this.tools || Object.keys(this.tools).length === 0)
            {
                return llm;
            }

            if (!llm.bindTools)
            {
                throw new Error("LLM does not support binding tools.");
            }

            return llm.bindTools(Object.values(this.tools));
        });
    }

    async stream(session: IChatSession, signal?: AbortSignal)
    {
        const llm = await this.bindTools(session);

        const preparedMessages = await this.prepareMessages(session);

        return llm.stream(preparedMessages, { signal });
    }

    async generate(session: IChatSession, signal?: AbortSignal)
    {
        const llm = await this.bindTools(session);

        const preparedMessages = await this.prepareMessages(session);

        return llm.invoke(preparedMessages, { signal });
    }

    private async prepareMessages(session: IChatSession): Promise<BaseMessage[]>
    {
        if (!this.current)
        {
            throw new Error("ChatService is not initialized. Call getLLM() first.");
        }

        const messages = session.messages;

        let preparedMessages: BaseMessage[] = messages.filter(msg => msg instanceof BaseMessage);

        // Stage 0: Limit message content size to 50.000 - 60.000 characters
        preparedMessages = this.limitMessageContentSize(preparedMessages, 60_000);

        // Stage 1: Trim by message count
        if (this.current.maxMessages)
        {
            const { result } = await tryCatch(trimMessages(preparedMessages, {
                tokenCounter: () => 1,
                maxTokens: this.current.maxMessages,
                strategy: "last",
                allowPartial: false,
                includeSystem: false, // System message is handled separately
                startOn: "human",
            }));

            if (result)
            {
                preparedMessages = result;
            }
        }

        // Stage 2: Trim by token count as a safeguard
        if (this.current.contextSize)
        {
            const { result } = await tryCatch(trimMessages(preparedMessages, {
                tokenCounter: this.current.llm,
                maxTokens: this.current.contextSize,
                strategy: "last",
                allowPartial: false,
                includeSystem: false, // System message is handled separately
                startOn: "human",
            }));

            if (result)
            {
                preparedMessages = result;
            }
        }

        const systemPrompt = session.systemPrompt || await this.promptLoader?.getSystemPrompt(session);

        if (systemPrompt)
        {
            return [new SystemMessage(systemPrompt), ...preparedMessages];
        }

        return preparedMessages;
    }

    private limitMessageContentSize(messages: readonly BaseMessage[], limit: number = 60_000): BaseMessage[]
    {
        const truncLimit = Math.trunc(limit * 0.9);

        return messages.map(msg =>
        {
            if (msg.text.length < limit)
            {
                return msg;
            }

            const stored = mapChatMessagesToStoredMessages([msg])[0]!; // TODO: fix the !

            stored.data.content = stored.data.content.slice(0, truncLimit);

            return mapStoredMessageToChatMessage(stored);
        });
    }
}

export { ChatService };
