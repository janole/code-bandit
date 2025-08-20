import { RunnableConfig } from "@langchain/core/runnables";
import { execa } from "execa";
import { z } from "zod";

import tryCatch from "../../utils/try-catch.js";
import { createTool, resolveWithinWorkDir } from "./utils.js";

async function runNpm(args: string[] = [], config?: RunnableConfig, opts: { timeout?: number } = {}): Promise<string>
{
    const timeout = opts.timeout ?? 120_000; // npm can be slow, allow up to 2 minutes by default

    const cwd = resolveWithinWorkDir(".", config?.metadata?.["workDir"]);

    const { result, error } = await tryCatch(async () => execa("npm", args, { cwd, timeout, env: { CI: "true", npm_config_color: "always" } }));

    // Prefer including both stdout and stderr to capture warnings/info
    const stdout = result?.stdout?.toString() ?? "";
    const stderr = (result?.stderr?.toString() || (error as any)?.stderr?.toString()) ?? "";

    const output = [stdout && `STDOUT:\n${stdout}`.trim(), stderr && `STDERR:\n${stderr}`.trim()].filter(Boolean).join("\n\n");

    if (!result)
    {
        // If execa failed before producing a result (timeout, spawn error, etc.)
        const message = (error as Error)?.message ?? "Unknown error";
        return `ERROR: npm ${args.join(" ")} failed: ${message}${output ? `\n\n${output}` : ""}`;
    }

    return output || `npm ${args.join(" ")} produced no output.`;
}

async function runNpx(args: string[] = [], config?: RunnableConfig, opts: { timeout?: number } = {}): Promise<string>
{
    const timeout = opts.timeout ?? 120_000;

    const cwd = resolveWithinWorkDir(".", config?.metadata?.["workDir"]);

    const { result, error } = await tryCatch(async () => execa("npx", args, { cwd, timeout, env: { CI: "true", npm_config_color: "always" } }));

    // Prefer including both stdout and stderr to capture warnings/info
    const stdout = result?.stdout?.toString() ?? "";
    const stderr = (result?.stderr?.toString() || (error as any)?.stderr?.toString()) ?? "";

    const output = [stdout && `STDOUT:\n${stdout}`.trim(), stderr && `STDERR:\n${stderr}`.trim()].filter(Boolean).join("\n\n");

    if (!result)
    {
        // If execa failed before producing a result (timeout, spawn error, etc.)
        const message = (error as Error)?.message ?? "Unknown error";
        return `ERROR: npx ${args.join(" ")} failed: ${message}${output ? `\n\n${output}` : ""}`;
    }

    return output || `npx ${args.join(" ")} produced no output.`;
}

// Destructive tools
async function npmInstall(
    { packages = [], dev = false, exact = false, workspace }: { packages?: string[]; dev?: boolean; exact?: boolean; workspace?: string },
    config?: RunnableConfig,
): Promise<string>
{
    const args = [
        "install",
        ...packages,
        dev ? "--save-dev" : "",
        exact ? "--save-exact" : "",
        workspace ? "-w" : "",
        workspace ?? "",
        "--no-audit",
        "--no-fund",
        "--no-progress",
    ].filter(Boolean) as string[];

    return runNpm(args, config);
}

async function npmUninstall(
    { packages = [], workspace }: { packages?: string[]; workspace?: string },
    config?: RunnableConfig,
): Promise<string>
{
    const args = [
        "uninstall",
        ...packages,
        workspace ? "-w" : "",
        workspace ?? "",
        "--no-audit",
        "--no-fund",
    ].filter(Boolean) as string[];

    return runNpm(args, config);
}

async function npmRun(
    { script, args: scriptArgs = [], workspace }: { script: string; args?: string[]; workspace?: string },
    config?: RunnableConfig,
): Promise<string>
{
    const args = [
        "run",
        script,
        workspace ? "-w" : "",
        workspace ?? "",
        "--",
        ...scriptArgs,
    ].filter(Boolean) as string[];

    return runNpm(args, config);
}

async function npmCi(
    { workspace }: { workspace?: string },
    config?: RunnableConfig,
): Promise<string>
{
    const args = [
        "ci",
        workspace ? "-w" : "",
        workspace ?? "",
        "--no-audit",
        "--no-fund",
        "--no-progress",
    ].filter(Boolean) as string[];

    return runNpm(args, config, { timeout: 180_000 });
}

// Read-only tools
async function npmLs(
    { depth, json = true, workspace }: { depth?: number; json?: boolean; workspace?: string },
    config?: RunnableConfig,
): Promise<string>
{
    const args = [
        "ls",
        json ? "--json" : "",
        typeof depth === "number" ? "--depth" : "",
        typeof depth === "number" ? String(depth) : "",
        workspace ? "-w" : "",
        workspace ?? "",
    ].filter(Boolean) as string[];

    return runNpm(args, config);
}

async function npmView(
    { packageName, field }: { packageName: string; field?: string },
    config?: RunnableConfig,
): Promise<string>
{
    const args = [
        "view",
        packageName,
        field ?? "",
        "--json",
    ].filter(Boolean) as string[];

    return runNpm(args, config);
}

async function npmOutdated(
    { json = true, workspace }: { json?: boolean; workspace?: string },
    config?: RunnableConfig,
): Promise<string>
{
    const args = [
        "outdated",
        json ? "--json" : "",
        workspace ? "-w" : "",
        workspace ?? "",
    ].filter(Boolean) as string[];

    return runNpm(args, config);
}

async function npx(
    { command, args: npxArgs = [], workspace }: { command: string; args?: string[], workspace?: string },
    config?: RunnableConfig,
): Promise<string>
{
    const args = [
        ...(workspace ? ["-w", workspace] : []),
        command,
        ...npxArgs,
    ].filter(Boolean) as string[];

    return runNpx(args, config);
}

const _tools = [
    // destructive
    createTool(npmInstall, {
        description: "Install dependencies with npm. Supports adding specific packages or performing a full install (no packages). Default flags: --no-audit --no-fund --no-progress.",
        schema: z.object({
            packages: z.array(z.string()).describe("Packages to add (e.g., ['lodash@^4']). If omitted, runs a full install.").optional().default([]),
            dev: z.boolean().describe("Install as devDependency.").optional().default(false),
            exact: z.boolean().describe("Save exact version with --save-exact.").optional().default(false),
            workspace: z.string().describe("Workspace name or path to run the command in.").optional(),
        }),
        metadata: { destructive: true },
    }),
    createTool(npmUninstall, {
        description: "Remove dependencies with npm.",
        schema: z.object({
            packages: z.array(z.string()).describe("Packages to remove.").optional().default([]),
            workspace: z.string().describe("Workspace name or path to run the command in.").optional(),
        }),
        metadata: { destructive: true },
    }),
    createTool(npmRun, {
        description: "Run an npm script (npm run <script> -- <args...>).",
        schema: z.object({
            script: z.string().describe("The script name from package.json to run."),
            args: z.array(z.string()).describe("Additional arguments passed after --.").optional().default([]),
            workspace: z.string().describe("Workspace name or path to run the command in.").optional(),
        }),
        metadata: { destructive: true },
    }),
    createTool(npmCi, {
        description: "Run npm ci for reproducible installs. Default flags: --no-audit --no-fund --no-progress.",
        schema: z.object({
            workspace: z.string().describe("Workspace name or path to run the command in.").optional(),
        }),
        metadata: { destructive: true },
    }),

    // read-only
    createTool(npmLs, {
        description: "List installed dependencies (npm ls). Useful for inspection.",
        schema: z.object({
            depth: z.number().describe("Max depth to traverse dependency tree.").optional(),
            json: z.boolean().describe("Output JSON.").optional().default(true),
            workspace: z.string().describe("Workspace name or path to run the command in.").optional(),
        }),
    }),
    createTool(npmView, {
        description: "View package metadata from the registry (npm view <pkg> [field]). Outputs JSON.",
        schema: z.object({
            packageName: z.string().describe("The package name to query (optionally with version/tag)."),
            field: z.string().describe("Optional field to fetch (e.g., 'versions', 'dist-tags.latest').").optional(),
        }),
    }),
    createTool(npmOutdated, {
        description: "Check for outdated dependencies (npm outdated).",
        schema: z.object({
            json: z.boolean().describe("Output JSON.").optional().default(true),
            workspace: z.string().describe("Workspace name or path to run the command in.").optional(),
        }),
    }),
    createTool(npx, {
        description: "Execute a package command with npx (npx <command> -- <args...>).",
        schema: z.object({
            command: z.string().describe("The package/command to execute."),
            args: z.array(z.string()).describe("Additional arguments passed to the command.").optional().default([]),
            workspace: z.string().describe("Workspace name or path to run the command in.").optional(),
        }),
        metadata: { destructive: true },
    }),
];

function getTools(props: { includeDestructiveTools?: boolean })
{
    return _tools
        .filter(t => props.includeDestructiveTools || !t.metadata?.["destructive"])
        .reduce((tools, t) => ({ ...tools, [t.name]: t }), {} as Record<string, ReturnType<typeof createTool>>);
}

export { getTools };
