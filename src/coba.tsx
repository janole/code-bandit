#!/usr/bin/env node
import { Command } from "commander";

import { COMMIT_HASH, VERSION } from "./.version.js";
import { addChatCommands } from "./commands/chat.js";
import { installVscodeExtension } from "./commands/install-extension.js";
import { getAppTitle } from "./utils/info.js";

const program = new Command();

program
    .name("coba")
    .version(`${VERSION}+${COMMIT_HASH}`);

addChatCommands(program);

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
