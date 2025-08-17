import { execa } from "execa";

import tryCatch from "../../utils/try-catch.js";

async function execGit(args: string[] = [], options: { cwd?: string; timeout?: number; } = {}): Promise<string | null>
{
    const { cwd = process.cwd(), timeout = 2000 } = options;

    const { result } = await tryCatch(async () => execa("git", args, { cwd, timeout }));

    return result?.stdout ? result.stdout.toString().trim() : null;
}

export async function getGitBranch(): Promise<string | null>
{
    return await execGit(["branch", "--show-current"])
        || await execGit(["rev-parse", "--short", "HEAD"]);
}

export async function getGitStatus(): Promise<string | undefined | null>
{
    const worktrees = await execGit(["worktree", "list"]);

    return worktrees;
}
