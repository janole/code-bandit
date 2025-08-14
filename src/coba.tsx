#!/usr/bin/env node
import { Command } from "commander";
import { render } from "ink";
import { cwd } from "process";
import React from "react";

import { COMMIT_HASH, VERSION } from "./.version.js";
import { ChatService, IChatServiceOptions } from "./ai/chat-service.js";
import { PromptLoader } from "./ai/prompts/prompt-loader.js";
import { FileSessionStorage } from "./ai/session/file-session-storage.js";
import { TToolMode } from "./ai/session/session.js";
import { NodeToolProvider } from "./ai/tools/node-tool-provider.js";
import App from "./app.js";
import { installVscodeExtension } from "./commands/install-extension.js";

const program = new Command();

program
    .name("coba")
    .description("Code Bandit - Your AI-powered codebase companion")
    .addHelpText("beforeAll", () =>
    {
        return program.commands.map(cmd => cmd.helpInformation()).join("\n");
    })
    .version(`${VERSION}+${COMMIT_HASH}`);

program
    .command("chat", { isDefault: true })
    .configureHelp({
        commandUsage: () => `${program.name()} [options] [git-repo-path]`,
    })
    .description("Start an interactive chat session with Code Bandit.")
    .argument("[git-repo-path]", "The git repository directory to work in", ".")
    .requiredOption("-p, --provider <provider>", "Specify the model provider to be used", process.env["CODE_BANDIT_PROVIDER"])
    .requiredOption("-m, --model <model>", "Specify the model to be used", process.env["CODE_BANDIT_MODEL"])
    .option("-u, --api-url <url>", "API URL for the model provider")
    .option("-k, --api-key <key>", "API key for the model provider")
    .option("--context-size <size>", "Context size in tokens used for chat history")
    .option("--max-messages <count>", "Maximum number of messages to keep in chat history", "10")
    .option("-C, --continue-session <filename>", "Continue with session loaded from filename")
    .option("--start-message <message>", "Start chat with this message")
    .option("--read-only", "Start with read-only mode for tools")
    .option("--write-mode", "Enable (destructive!) write mode for tools")
    .option("--no-agent-rules", "Disable loading of AGENTS.md, .cursorrules, etc.")
    .option("--debug", "Show debug information")
    .action(async (gitRepoPath: string, options) =>
    {
        gitRepoPath && process.chdir(gitRepoPath);

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

        const props = { chatService, session, startMessage: options.startMessage, debug: options.debug };

        render(<App {...props} />, { exitOnCtrlC: false });
    });

program
    .command("install-extension")
    .description("Download and install the official Code Bandit VS Code extension.")
    .option("--tag <tag>", "Specify a version tag to install (e.g., v0.1.0)", "latest")
    .action(async (options) =>
    {
        await installVscodeExtension(options.tag);
    });

program.parse(process.argv);
