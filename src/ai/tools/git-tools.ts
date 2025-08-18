import { RunnableConfig } from "@langchain/core/runnables";
import { execa } from "execa";
import { parse } from "shell-quote";
import { z } from "zod";

import tryCatch from "../../utils/try-catch.js";
import { createTool, formatEmptyToolOutput, formatToolError } from "./utils.js";

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

async function getGitStatus(): Promise<string | undefined | null>
{
    const worktrees = await execGit(["worktree", "list"]);

    return worktrees;
}

function parseArgsString(argsString: string)
{
    const args = parse(argsString);

    if (args.find(arg => typeof arg !== "string"))
    {
        return null;
    }

    return args.map(arg => arg.toString());
}

async function gitDiff({ argsString = "" }: { argsString: string }, _config?: RunnableConfig): Promise<string>
{
    const args = parseArgsString(argsString);

    if (!args)
    {
        return formatToolError(gitDiff, "non-compliant `argsString`.");
    }

    const diff = await execGit(["diff", ...args]);

    return diff || formatEmptyToolOutput(gitDiff);
}

const _tools = [
    createTool(gitDiff, {
        description: "Run git diff <args...>",
        schema: z.object({
            argsString: z.string().describe("All the parameters for git diff as a string").optional(),
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
    getGitStatus, getTools,
};

