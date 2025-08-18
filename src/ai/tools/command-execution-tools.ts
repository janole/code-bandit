import { RunnableConfig } from "@langchain/core/runnables";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { $ } from "execa";
import { z } from "zod";

import { createTool, resolveWithinWorkDir } from "./utils.js";

// TODO:
// - create different images with different toolsets
// - use images based on project / LLM findings?

const dockerImage = "janole/codebandit-node:0";

const Dockerfile = `
FROM node:20-slim
WORKDIR /data
RUN apt-get update && apt-get install -y --no-install-recommends git jq curl grep tree && npm -g i npm
`.trim();

interface ExecuteCommandProps
{
    props: { command: string; args?: string[]; };
    mountFlags: "ro" | "rw";
    config?: RunnableConfig;
}

async function handleExecuteCommand(props: ExecuteCommandProps): Promise<string> 
{
    const { props: { command, args = [] }, mountFlags = "ro", config } = props;

    try 
    {
        // build Docker image on the fly if necessary
        await $({ input: Dockerfile })`docker build -q -t ${dockerImage} -`;

        const workDir = resolveWithinWorkDir(".", config?.metadata?.["workDir"]);

        const execCommand = "docker";
        const execArgs = [
            "run", "--rm", "-v", `${workDir}:/data${mountFlags === "rw" ? "" : ":ro"}`, dockerImage,
            "timeout", "30", // make sure, long running commands terminate after 30 seconds
            command, ...args,
        ];

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

async function executeCommandReadOnly(props: ExecuteCommandProps["props"], config: RunnableConfig): Promise<string> 
{
    return handleExecuteCommand({ props, config, mountFlags: "ro" });
}

async function executeCommand(props: ExecuteCommandProps["props"], config: RunnableConfig): Promise<string> 
{
    return handleExecuteCommand({ props, config, mountFlags: "rw" });
}

const executeCommandReadOnlyTool = createTool(executeCommandReadOnly, {
    description: "Execute an arbitrary command in a read-only shell. You cannot write to the disk. Use ONLY when the user wants to run a command, like 'ls -l' or 'git diff'.",
    schema: z.object({
        command: z.string().describe("The command to execute (e.g., 'ls', 'cat')."),
        args: z.array(z.string()).describe("An array of arguments to pass to the command (e.g., ['-l', '-a']).").optional().default([]),
    }),
});

const executeCommandReadWriteTool = createTool(executeCommand, {
    description: "Execute an arbitrary command in the shell. Use ONLY when the user wants to run a command, like 'ls -l' or 'git diff' or 'npm install'.",
    schema: z.object({
        command: z.string().describe("The command to execute (e.g., 'ls', 'npm', 'mv')."),
        args: z.array(z.string()).describe("An array of arguments to pass to the command (e.g., ['-l', '-a']).").optional().default([]),
    }),
    metadata: {
        destructive: true,
    },
});

function getTools(props: { includeDestructiveTools?: boolean }): { [key: string]: DynamicStructuredTool }
{
    return props.includeDestructiveTools
        ? { [executeCommandReadWriteTool.name]: executeCommandReadWriteTool }
        : { [executeCommandReadOnlyTool.name]: executeCommandReadOnlyTool };
}

export { getTools };
