import { RunnableConfig } from "@langchain/core/runnables";
import { DynamicStructuredTool, tool } from "@langchain/core/tools";
import { execa } from "execa";
import { parse } from "shell-quote";
import { z } from "zod";

import tryCatch from "../../utils/try-catch.js";
import { funcName, toolError, toolNoOutput } from "./utils.js";

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
        return toolError(gitDiff, "non-compliant `argsString`.");
    }

    const diff = await execGit(["diff", ...args]);

    return diff || toolNoOutput(gitDiff);
}

const _tools = [
    tool(gitDiff, {
        name: funcName(gitDiff),
        description: "Run git diff <argsString...>",
        schema: z.object({
            argsString: z.string().describe("All the parameters for git diff as a string").optional(),
        }),
    }),
];

function getTools(props: { includeDestructiveTools?: boolean }): { [key: string]: DynamicStructuredTool }
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

