#!/usr/bin/env node
import { Command } from "commander";
import { render } from "ink";
import { cwd } from "process";
import React from "react";

import { VERSION } from "./.version.js";
import { IChatServiceOptions } from "./ai/chat-service.js";
import { ChatSession } from "./ai/chat-session.js";
import App from "./app.js";

const isEnvTrue = (envVar: string) => ["1", "true", "yes"].includes(process.env[envVar]?.toLocaleLowerCase() || "");

const program = new Command();

program
	.name("coba")
	.description("Code Bandit")
	.version(VERSION)
	.argument("[git-repo-path]", "git repository directory", ".")
	.option("-m, --model <model>", "Specify the model to be used", "magistral:24b")
	.option("-p, --provider <provider>", "Specify the model provider to be used", "ollama")
	.option("-d, --debug", "Show debug information")
	.option("-u, --api-url <url>", "API URL for the model provider")
	.option("-k, --api-key <key>", "API key for the model provider")
	.option("--context-size <size>", "Context size in tokens used for chat history")
	.option("-C, --continue-session <filename>", "Continue with session loaded from filename")
	.option("--write-mode", "Enable write mode. Alternatively set CODE_BANDIT_WRITE_MODE=1")
	.action(async (gitRepoPath: string, options) =>
	{
		gitRepoPath && process.chdir(gitRepoPath);

		const workDir = cwd();

		const contextSize = options.contextSize
			? parseInt(options.contextSize)
			: (options.provider === "ollama" ? 8192 : undefined);

		const chatServiceOptions: IChatServiceOptions = {
			provider: options.provider ?? process.env["CODE_BANDIT_PROVIDER"],
			model: options.model ?? process.env["CODE_BANDIT_MODEL"],
			contextSize,
			apiUrl: options.apiUrl,
			apiKey: options.apiKey,
		};

		const readOnly = !(options.writeMode ?? isEnvTrue("CODE_BANDIT_WRITE_MODE"));

		const session = options.continueSession
			? await ChatSession.createFromFile(options.continueSession)
			: ChatSession.create({ workDir, readOnly, chatServiceOptions });

		render(
			<App
				session={session}
				debug={options.debug}
			/>
		);
	});

program.parse(process.argv);
