import { ChatAnthropic } from "@langchain/anthropic";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BaseMessage, SystemMessage, trimMessages } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";

import { COMMIT_HASH, VERSION } from "../.version.js";
import tryCatch from "../utils/try-catch.js";
import { TMessage } from "./custom-messages.js";
import { IPromptLoader } from "./prompts/types.js";
import { IChatSession } from "./session/session.js";
import { IToolProvider, TTools } from "./tools/types.js";

const defaultHeaders = {
    "HTTP-Referer": "https://github.com/janole/code-bandit",
    "X-Title": "Code Bandit",
    "User-Agent": `Code Bandit/${VERSION}+${COMMIT_HASH} (+https://github.com/janole/code-bandit)`,
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

        systemMessage?: SystemMessage;

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
                    defaultHeaders,
                },
            });
        }
        else if (provider === "anthropic")
        {
            llm = new ChatAnthropic({
                model,
                maxTokens: 16384,
                anthropicApiKey: apiKey,
                anthropicApiUrl: apiUrl,
            });
        }
        else if (provider === "gemini")
        {
            llm = new ChatGoogleGenerativeAI({
                model,
                apiKey,
            });
        }
        else if (provider === "openrouter")
        {
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

        const systemPrompt = session.systemPrompt || this.promptLoader?.getSystemPrompt(session);

        this.current = {
            llm,
            provider,
            model,

            contextSize,
            maxMessages,

            systemMessage: systemPrompt ? new SystemMessage(systemPrompt) : undefined,

            tools: this.toolProvider?.getTools(session),
        };

        return this.current.llm;
    }

    get tools()
    {
        return this.current?.tools;
    }

    async stream(session: IChatSession, signal?: AbortSignal)
    {
        const llm = await this.getLLM(session).then(llm => 
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

        const preparedMessages = await this.prepareMessages(session.messages);

        return llm.stream(preparedMessages, { signal });
    }

    private async prepareMessages(messages: readonly TMessage[]): Promise<BaseMessage[]>
    {
        if (!this.current)
        {
            throw new Error("ChatService is not initialized. Call getLLM() first.");
        }

        let preparedMessages: BaseMessage[] = messages.filter(msg => msg instanceof BaseMessage);

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

        if (this.current.systemMessage)
        {
            return [this.current.systemMessage, ...preparedMessages];
        }

        return preparedMessages;
    }
}

export { ChatService };
