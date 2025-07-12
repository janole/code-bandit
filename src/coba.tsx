#!/usr/bin/env node
import { Command } from "commander";
import { render } from "ink";
import path from "path";
import { cwd } from "process";
import React from "react";

import { VERSION } from "./.version.js";
import App from "./app.js";

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
	.action(async (gitRepoPath: string, options) =>
	{
		const workDir = path.join(cwd(), gitRepoPath || ".");

		const chatServiceOptions = {
			provider: options.provider,
			model: options.model,
			apiUrl: options.apiUrl,
			apiKey: options.apiKey,
		};

		render(
			<App
				workDir={workDir}
				chatServiceOptions={chatServiceOptions}
				debug={options.debug}
			/>
		);
	});

program.parse(process.argv);
