import { render } from "ink";
import { cwd } from "process";
import React from "react";

import { ChatService, IChatServiceOptions } from "../ai/chat-service.js";
import { resolveWithinWorkDir } from "../ai/tools/utils.js";
import { FileSessionStorage, NodeToolProvider, PromptLoader, TToolMode } from "../index.node.js";
import ChatApp from "../ui/chat-app.js";

async function chat(options: any)
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

    const props = { chatService, session, startMessage: options.startMessage, debug: options.debug };

    render(<ChatApp {...props} />, { exitOnCtrlC: false });
}

export { chat };
