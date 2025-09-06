type TChatModelProvider =
    | "node-llama-cpp"
    | "ollama"
    | "openai"
    | "googleai"
    | "groq"
    | "xai"
    | "openrouter"
    | "langchain-js"
    | "vercel-ai-sdk"
    | string
    ;

export interface IChatModelFeatures
{
    tools?: boolean;
    vision?: boolean;
    options?: {
        temperature?: boolean;
        num_ctx?: boolean;
        top_k?: boolean;
        top_p?: boolean;
        min_p?: boolean;
        integratedWebSearch?: boolean;
    };
}

interface IChatModelState
{
    ready?: boolean;
    downloadable?: boolean;
    removable?: boolean;
    hasLocalModelFile?: boolean;
}

export interface IChatModelOptions
{
    temperature?: number;
    num_ctx?: number;
    top_k?: number;
    top_p?: number;
    min_p?: number;
    integratedWebSearch?: boolean;
}

export interface IChatModelConfig
{
    favorite?: boolean;
    hidden?: boolean;
    options?: IChatModelOptions;
};

export interface IChatModel
{
    id: string;
    name: string;
    provider: TChatModelProvider;

    account: { id: string; name: string; remote?: boolean; removable?: boolean; };

    displayName?: string;
    description?: string;

    modelUri?: string;
    modelFile?: string;

    state: IChatModelState;

    contextLength?: number;
    size?: number;
    parameterSize?: string;
    quantizationLevel?: string;
    features?: IChatModelFeatures;

    config?: IChatModelConfig;
}

export class ChatModel implements IChatModel
{
    id: string;
    name: string;
    provider: TChatModelProvider;

    account: { id: string; name: string; remote?: boolean; removable?: boolean; };

    displayName?: string;
    description?: string;

    modelUri?: string;
    modelFile?: string;

    state: IChatModelState;

    contextLength?: number;
    size?: number;
    parameterSize?: string;
    quantizationLevel?: string;
    features?: IChatModelFeatures;

    config?: IChatModelConfig;

    constructor(data: IChatModel)
    {
        this.id = data.id;
        this.name = data.name;
        this.provider = data.provider;
        this.account = structuredClone(data.account);
        this.displayName = data.displayName;
        this.description = data.description;
        this.modelUri = data.modelUri;
        this.modelFile = data.modelFile;
        this.state = structuredClone(data.state);
        this.contextLength = data.contextLength;
        this.parameterSize = data.parameterSize;
        this.quantizationLevel = data.quantizationLevel;
        this.features = structuredClone(data.features);
        this.config = structuredClone(data.config);
    }
}

export interface IChatModelInfo
{
    model: Pick<IChatModel, "name" | "provider">;
    options?: IChatModelOptions;
}

export type TAddChatModel = { provider: TChatModelProvider; modelUri: string; startDownload?: boolean; };

export type TRemoveChatModel = { provider: TChatModelProvider; modelUri: string; };

export interface IAddAccountOpenAI
{
    name: string;
    provider: "openai";
    type: "openai";
    apiKey: string;
    baseURL?: string;
}

export interface IAddAccountOpenRouter extends Omit<IAddAccountOpenAI, "type">
{
    type: "openrouter";
}

interface IAddAccountGoogleAI
{
    name: string;
    provider: "googleai";
    apiKey: string;
}

export type TAddAccount = IAddAccountOpenAI | IAddAccountOpenRouter | IAddAccountGoogleAI;

export interface TRemoveAccount
{
    provider: TChatModelProvider;
    id: string;
}

export type TChatMessageRole =
    | "system"
    | "user"
    | "assistant"
    | "tool"
    | "tool-progress"
    | "info"
    | "error"
    | "private"
    ;

export const CONFIRM_STATES = ["no", "yes", "none", "all"] as const;

export type TConfirmState = typeof CONFIRM_STATES[number];

export interface IChatMessageBase
{
    content: string;
    images?: string[];

    toolCall?: {
        name: string;
        args: Record<string, any>;

        description?: string;
        fileName?: string;

        id?: string;

        status: "pending" | "pending-confirmation" | "confirmed" | "declined" | "success" | "error";
        confirmState?: TConfirmState;
    };

    readonly createdAt: number;
    readonly info?: IChatModelInfo;

    showThinking?: boolean;
    showDetails?: boolean;

    privateData?: any;
}

export interface IChatMessage extends IChatMessageBase
{
    role: TChatMessageRole;
    hidden?: boolean;

    state?: TChatState;

    history: IChatMessageBase[];
    historyIndex: number;
}

export interface IWorkspace
{
    workDir?: string;
}

export type TChatState = "working" | "done" | "stopped";

export type TToolMode = "confirm" | "read-only" | "yolo";

export interface IChat
{
    id: string;
    sourceId?: string;
    model: IChatModel;
    title?: string;
    generatedSummary?: string;
    workspace?: IWorkspace;
    messages: IChatMessage[];
    currentPrompt?: { content?: string; images?: string[]; messageIndex?: number; };
    state?: TChatState;
    toolMode?: TToolMode;
    scrollPos?: number;
    favorite?: boolean;
    useSystemPrompt?: boolean;
    showSettings?: boolean;
    updatedAt?: number;
    deletedAt?: number | "deleted";
}

export type TProviderInfo = { [key: string]: any };
