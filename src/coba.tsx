#!/usr/bin/env node
import { Command } from "commander";
import React from "react";
import { render } from "ink";
import path from "path";
import { cwd } from "process";
import App from "./app.js";
import { VERSION } from "./.version.js";

const program = new Command();

program
	.name("coba")
	.description("Code Bandit")
	.version(VERSION)
	.argument("[git-repo-path]", "git repository directory", ".")
	.option("-m, --model <model>", "Specify the model to be used", "magistral:24b")
	.option("-p, --provider <provider>", "Specify the model provider to be used", "ollama")
	.option("-d, --debug", "Show debug information")
	.action(async (gitRepoPath: string, options) =>
	{
		const workDir = path.join(cwd(), gitRepoPath || ".");

		render(
			<App
				workDir={workDir}
				provider={options.provider}
				model={options.model}
				debug={options.debug}
			/>
		);
	});

program.parse(process.argv);
