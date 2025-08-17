#!/usr/bin/env node
import { Command } from "commander";

import { COMMIT_HASH, VERSION } from "./.version.js";
import { chat, exec } from "./commands/chat.js";
import { installVscodeExtension } from "./commands/install-extension.js";
import { getAppTitle } from "./utils/info.js";

const program = new Command();

program
    .name("coba")
    .version(`${VERSION}+${COMMIT_HASH}`);

program
    .command("chat", { isDefault: true })
    .configureHelp({
        commandUsage: () => `${program.name()} [options]`,
    })
    .description(`Start an interactive chat session with ${getAppTitle()}.`)
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
    .option("-R, --repo-path <path>", "The git repository directory to work in", ".")
    .option("--no-agent-rules", "Disable loading of AGENTS.md, .cursorrules, etc.")
    .option("--debug", "Show debug information")
    .action(async (options) =>
    {
        return chat(options);
    });

program
    .command("exec <message...>")
    .description("Run ")
    .requiredOption("-p, --provider <provider>", "Specify the model provider to be used", process.env["CODE_BANDIT_PROVIDER"])
    .requiredOption("-m, --model <model>", "Specify the model to be used", process.env["CODE_BANDIT_MODEL"])
    .action(async (messages: string[], options) =>
    {
        const answer = await exec(messages.join(" "), options);
        console.log(answer);
    });

program
    .command("install-extension")
    .description(`Download and install the official ${getAppTitle()} VS Code extension.`)
    .option("--tag <tag>", "Specify a version tag to install (e.g., v0.1.0)", "latest")
    .action(async (options) =>
    {
        await installVscodeExtension(options.tag);
    });

program.helpInformation = () => 
{
    return [
        `${getAppTitle()} - Your AI-powered codebase companion`,
        "",
        ...program.commands.map(cmd => cmd.helpInformation()),
    ].join("\n");
};

program.parse(process.argv);
