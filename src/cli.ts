import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_FILE_NAMES = ["botbandit.config.yaml", "botbandit.config.yml"];

export interface CodeBanditCliDependencies
{
    /** Delegate that starts the published Boba CLI. */
    delegate(args: readonly string[]): number;
    /** Current working directory used for project-local config discovery. */
    cwd?: string;
    /** Home directory used for global config discovery. */
    homeDir?: string;
    /** File-existence check; injectable for tests. */
    exists?: (path: string) => boolean;
    /** Package version; injectable for tests. */
    version?: string;
    /** Output sink; defaults to stdout. */
    write?: (text: string) => void;
}

/** Returns the first Boba config path using Boba's cwd-before-home precedence. */
export function findBobaConfig(
    cwd: string = process.cwd(),
    homeDir: string = homedir(),
    exists: (path: string) => boolean = existsSync,
): string | undefined
{
    const directories = [cwd, join(homeDir, ".botbandit")];

    for (const directory of directories)
    {
        for (const fileName of CONFIG_FILE_NAMES)
        {
            const path = join(directory, fileName);

            if (exists(path))
            {
                return path;
            }
        }
    }

    return undefined;
}

/** Renders Code Bandit's concise CLI help. */
export function renderHelp(version: string): string
{
    return `Code Bandit ${version} — coding with Boba

Usage:
  coba                         Start the interactive terminal UI
  coba run <prompt...>         Run one prompt
  coba resume <session-id>     Resume a session
  coba auth <command>          Manage provider authentication
  coba onboard                 Show first-run setup
  coba --help                  Show this help
  coba --version               Show the Code Bandit version

Other commands and options are passed directly to Boba.
`;
}

/** Renders safe first-run instructions without changing an existing config. */
export function renderOnboarding(configPath?: string): string
{
    if (configPath)
    {
        return `Code Bandit is powered by Boba.

Configuration found at:
  ${configPath}

Run \`coba\` to start or \`coba --help\` for the quick reference.
`;
    }

    return `Welcome to Code Bandit 2.0 — coding with Boba.

Create ~/.botbandit/botbandit.config.yaml with a coding profile. For example,
using a ChatGPT subscription through OpenAI Codex OAuth:

profile: coder

profiles:
  coder:
    provider: openai-codex
    extensions: [approval, memory]

providers:
  openai-codex:
    model: gpt-5.4
    models:
      gpt-5.4:

Then authenticate and start:

  coba auth login openai-codex
  coba

Code Bandit also supports the providers and profile options documented by Boba.
It will never overwrite an existing config automatically.
`;
}

function readPackageVersion(): string
{
    const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version?: unknown };
    return typeof packageJson.version === "string" ? packageJson.version : "unknown";
}

/** Handles Code Bandit-owned commands and delegates the rest to Boba. */
export function runCodeBanditCli(args: readonly string[], dependencies: CodeBanditCliDependencies): number
{
    const write = dependencies.write ?? ((text: string) => process.stdout.write(text));
    const version = dependencies.version ?? readPackageVersion();
    const command = args[0];
    const configPath = findBobaConfig(
        dependencies.cwd,
        dependencies.homeDir,
        dependencies.exists,
    );

    if (command === "--help" || command === "-h" || command === "help")
    {
        write(renderHelp(version));
        return 0;
    }

    if (command === "--version" || command === "-V" || command === "version")
    {
        write(`${version}\n`);
        return 0;
    }

    if (command === "onboard" || args.length === 0 && !configPath)
    {
        write(renderOnboarding(configPath));
        return 0;
    }

    if (!configPath)
    {
        write(`${renderOnboarding()}\nA Boba profile is required before running this command.\n`);
        return 1;
    }

    return dependencies.delegate(args);
}
