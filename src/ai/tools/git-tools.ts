import { RunnableConfig } from "@langchain/core/runnables";
import { execa } from "execa";
import { z } from "zod";

import tryCatch from "../../utils/try-catch.js";
import { createTool, formatEmptyToolOutput } from "./utils.js";

async function execGit(args: string[] = [], options: { cwd?: string; timeout?: number; } = {}): Promise<string | null>
{
    const { cwd = process.cwd(), timeout = 2000 } = options;

    const { result } = await tryCatch(async () => execa("git", args, { cwd, timeout }));

    return result?.stdout ? result.stdout.toString().trim() : null;
}

async function getGitBranch(): Promise<string | null>
{
    return await execGit(["branch", "--show-current"])
        || await execGit(["rev-parse", "--short", "HEAD"]);
}

async function gitDiff({ args = [] }: { args: string[] }, _config?: RunnableConfig): Promise<string>
{
    const diff = await execGit(["diff", ...args]);

    return diff || formatEmptyToolOutput(gitDiff);
}

async function gitLog({ args = [] }: { args: string[] }, _config?: RunnableConfig): Promise<string>
{
    const diff = await execGit(["log", ...args]);

    return diff || formatEmptyToolOutput(gitLog);
}

const _tools = [
    createTool(gitDiff, {
        description: "Run git diff <args...>",
        schema: z.object({
            args: z.array(z.string()).describe("An array of arguments to pass to the git diff command (e.g., ['main...branch', '--cached']).").optional().default([]),
        }),
    }),
    createTool(gitLog, {
        description: "Run git log <args...>",
        schema: z.object({
            args: z.array(z.string()).describe("An array of arguments to pass to the git log command (e.g., ['-n', '5', '--oneline']).").optional().default([]),
        }),
    }),
];

function getTools(props: { includeDestructiveTools?: boolean })
{
    return _tools
        .filter(t => props.includeDestructiveTools || !t.metadata?.["destructive"])
        .reduce((tools, t) => ({ ...tools, [t.name]: t }), {});
}

export
{
    getGitBranch,
    getTools,
};

