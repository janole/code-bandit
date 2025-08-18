import { Command } from "commander";
import { render } from "ink";
import { cwd } from "process";
import React from "react";

import { ChatService, IChatServiceOptions } from "../ai/chat-service.js";
import { ToolProgressMessage } from "../ai/custom-messages.js";
import { resolveWithinWorkDir } from "../ai/tools/utils.js";
import { BaseMessage, FileSessionStorage, HumanMessage, NodeToolProvider, PromptLoader, TToolMode, work } from "../index.node.js";
import ChatApp from "../ui/chat-app.js";
import { getAppTitle } from "../utils/info.js";

async function initChatSession(options: any)
{
    const gitRepoPath = resolveWithinWorkDir(".", options.repoPath || ".");

    process.chdir(gitRepoPath);

    const workDir = cwd();

    const contextSize = options.contextSize
        ? parseInt(options.contextSize)
        : (options.provider === "ollama" ? 8192 : undefined);

    const maxMessages = options.maxMessages
        ? parseInt(options.maxMessages)
        : undefined;

    const chatServiceOptions: IChatServiceOptions = {
        provider: options.provider,
        model: options.model,
        contextSize,
        maxMessages,
        apiUrl: options.apiUrl,
        apiKey: options.apiKey,
        disableAgentRules: options.noAgentRules,
    };

    const toolMode: TToolMode = options.readOnly ? "read-only" : options.writeMode ? "yolo" : "confirm";

    const session = options.continueSession
        ? await FileSessionStorage.createFromFile(options.continueSession)
        : FileSessionStorage.create({ workDir, toolMode, chatServiceOptions });

    const chatService = new ChatService({
        promptLoader: await PromptLoader.create(session),
        toolProvider: new NodeToolProvider(),
    });

    return {
        chatService,
        session,
    };
}

async function chat(options: any)
{
    const { session, chatService } = await initChatSession(options);

    const props = { chatService, session, startMessage: options.startMessage, debug: options.debug };

    render(<ChatApp {...props} />, { exitOnCtrlC: false });
}

async function exec(message: string, options: any)
{
    const { chatService, session } = await initChatSession(options);

    session.messages.push(new HumanMessage(message));

    const messages = await work({
        chatService,
        session,
    });

    const pendingConfirmation = messages.find(m => ToolProgressMessage.isTypeOf(m) && m.status === "pending-confirmation") as ToolProgressMessage | undefined;

    if (pendingConfirmation)
    {
        return `ERROR: Pending confirmation for tool "${pendingConfirmation.toolCall?.name}".`;
    }

    return messages.filter(m => m instanceof BaseMessage)?.slice(-1)?.[0]?.text
        || "ERROR: No reply received.";
}

function addChatCommands(program: Command)
{
    const addSharedOptions = (command: Command) => 
    {
        return command
            .requiredOption("-p, --provider <provider>", "Specify the model provider to be used", process.env["CODE_BANDIT_PROVIDER"])
            .requiredOption("-m, --model <model>", "Specify the model to be used", process.env["CODE_BANDIT_MODEL"])
            .option("-u, --api-url <url>", "API URL for the model provider")
            .option("-k, --api-key <key>", "API key for the model provider")
            .option("--context-size <size>", "Context size in tokens used for chat history")
            .option("--max-messages <count>", "Maximum number of messages to keep in chat history", "10")
            .option("--read-only", "Start with read-only mode for tools")
            .option("--write-mode", "Enable (destructive!) write mode for tools")
            .option("-R, --repo-path <path>", "The git repository directory to work in", ".")
            .option("--no-agent-rules", "Disable loading of AGENTS.md, .cursorrules, etc.")
            .option("--debug", "Show debug information");
    };

    addSharedOptions(program.command("chat", { isDefault: true }))
        .description(`Start an interactive chat session with ${getAppTitle()}.`)
        .configureHelp({
            commandUsage: () => `${program.name()} [options]`,
        })
        .option("-C, --continue-session <filename>", "Continue with session loaded from filename")
        .option("--start-message <message>", "Start chat with this message")
        .action(async (options) =>
        {
            return chat(options);
        });

    addSharedOptions(program.command("exec <message...>"))
        .description(`Run ${getAppTitle()} non-interactively.`)
        .action(async (messages: string[], options) =>
        {
            const answer = await exec(messages.join(" "), options);
            console.log(answer);
        });
}

export
{
    addChatCommands
};

