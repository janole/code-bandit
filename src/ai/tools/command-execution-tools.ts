import { RunnableConfig } from "@langchain/core/runnables";
import { DynamicStructuredTool, tool } from "@langchain/core/tools";
import { $ } from "execa";
import { z } from "zod";

import { resolveWithinWorkDir } from "./utils.js";

const Dockerfile = `
FROM node:20-slim
WORKDIR /data
RUN apt-get update && apt-get install -y --no-install-recommends git jq curl grep tree && npm -g i npm
`.trim();

async function executeCommand({ command, args = [] }: { command: string; args?: string[] }, config?: RunnableConfig): Promise<string> 
{
	const dockerImage = "codebandit";

	const readOnly = !config?.metadata?.["destructive"] ? ":ro" : "";

	try 
	{
		await $({ input: Dockerfile })`docker build -q -t ${dockerImage} -`;

		const workDir = resolveWithinWorkDir(".", config?.metadata?.["workDir"]);

		const execCommand = "docker";
		const execArgs = ["run", "--rm", "-v", `${workDir}:/data${readOnly}`, dockerImage, command, ...args];

		const { stdout, stderr, exitCode, failed } = await $(execCommand, execArgs, {
			cwd: workDir,
			reject: false, // Don't throw on non-zero exit codes
		});

		const output = [];

		if (stdout) 
		{
			output.push(`STDOUT:\n${stdout}`);
		}

		if (stderr) 
		{
			output.push(`STDERR:\n${stderr}`);
		}

		let result = output.join("\n\n");

		if (failed) 
		{
			return `ERROR: Command "${command} ${args.join(" ")}" failed with exit code ${exitCode}.\n\n${result}`;
		}

		return result || "Command executed successfully with no output.";
	}
	catch (error: any) 
	{
		return `ERROR: Tool 'executeCommand' failed unexpectedly: ${error.message}`;
	}
}

const executeCommandReadOnly = tool(executeCommand, {
	name: "executeCommandReadOnly",
	description: "Execute an arbitrary command in a read-only shell. You cannot write to the disk. Use ONLY when the user wants to run a command, like 'ls -l' or 'git diff'.",
	schema: z.object({
		command: z.string().describe("The command to execute (e.g., 'ls', 'git')."),
		args: z.array(z.string()).describe("An array of arguments to pass to the command (e.g., ['-l', '-a']).").optional().default([]),
	}),
});

const executeCommandReadWrite = tool(executeCommand, {
	name: "executeCommand",
	description: "Execute an arbitrary command in the shell. Use ONLY when the user wants to run a command, like 'ls -l' or 'npm install'.",
	schema: z.object({
		command: z.string().describe("The command to execute (e.g., 'ls', 'npm')."),
		args: z.array(z.string()).describe("An array of arguments to pass to the command (e.g., ['-l', '-a']).").optional().default([]),
	}),
	metadata: {
		destructive: true,
	},
});

function getTools(props: { includeDestructiveTools?: boolean }): { [key: string]: DynamicStructuredTool }
{
	return props.includeDestructiveTools
		? { [executeCommandReadWrite.name]: executeCommandReadWrite }
		: { [executeCommandReadOnly.name]: executeCommandReadOnly };
}

export { getTools };
