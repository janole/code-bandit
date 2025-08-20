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

async function gitTag({ pattern, sortKey }: { pattern?: string; sortKey?: string }, _config?: RunnableConfig): Promise<string>
{
    const args = ["tag", "--list"];

    if (sortKey)
    {
        args.push("--sort", sortKey);
    }

    if (pattern)
    {
        args.push(pattern);
    }

    const tagList = await execGit(args);

    return tagList || "No tags found.";
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
    createTool(gitTag, {
        description: "A read-only tool to list git tags, with optional filtering and sorting. The sort key can be prefixed with '-' for descending order (e.g., '-version:refname').",
        schema: z.object({
            pattern: z.string().describe("An optional pattern to filter the tag list (e.g., 'v1.*'). If omitted, all tags are listed.").optional(),
            sortKey: z.string().describe("Optional key to sort tags. Common keys: 'refname', 'version:refname', 'creatordate'. Prefix with '-' for descending order.").optional(),
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

