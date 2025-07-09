#!/usr/bin/env node
import { Command } from "commander";
import React from "react";
import { render } from "ink";
import App from "./app.js";
import path from "path";
import { cwd } from "process";

const program = new Command();

program
	.name("coba")
	.description("Code Bandit")
	.version("0.0.1")
	.argument("[git-repo-path]", "git repository directory", ".")
	.option("-m, --model <model>", "Specify the model to be used", "magistral:24b")
	.option("-p, --provider <provider>", "Specify the model provider to be used", "ollama")
	.action(async (gitRepoPath: string, options) =>
	{
		const workDir = path.join(cwd(), gitRepoPath || ".");

		await render(
			<App
				workDir={workDir}
				provider={options.provider}
				model={options.model}
			/>
		);
	});

program.parse(process.argv);
