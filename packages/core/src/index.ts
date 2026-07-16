import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const APPLICATION_DIRECTORY_NAME = ".code-bandit";
const CONFIG_FILE_NAME = "config.yaml";

/** Boba application identity owned by Code Bandit. */
export interface BobaLaunchOptions
{
    appHome: string;
    configPath: string;
    namespace: "coba";
    commandName: "coba";
}

/** Code Bandit's application-owned filesystem paths. */
export interface CodeBanditPaths
{
    appHome: string;
    configPath: string;
    sessionsPath: string;
}

export interface CodeBanditCliDependencies
{
    /** Delegate that starts the published Boba CLI. */
    delegate(args: readonly string[], options: BobaLaunchOptions): number;
    /** Home directory beneath which Code Bandit owns its isolated application home. */
    homeDir?: string;
    /** File-existence check; injectable for tests. */
    exists?: (path: string) => boolean;
    /** Directory reader used by the legacy-session migration gate; injectable for tests. */
    readDirectory?: (path: string) => readonly string[];
    /** Package version; injectable for tests. */
    version?: string;
    /** Output sink; defaults to stdout. */
    write?: (text: string) => void;
}

/** Resolves every Code Bandit-owned path beneath its isolated application home. */
export function resolveCodeBanditPaths(homeDir: string = homedir()): CodeBanditPaths
{
    const appHome = join(homeDir, APPLICATION_DIRECTORY_NAME);

    return {
        appHome,
        configPath: join(appHome, CONFIG_FILE_NAME),
        sessionsPath: join(appHome, "sessions"),
    };
}

function readDirectoryFileNames(path: string): readonly string[]
{
    try
    {
        return readdirSync(path, { withFileTypes: true })
            .filter(entry => entry.isFile())
            .map(entry => entry.name);
    }
    catch (error)
    {
        if ((error as NodeJS.ErrnoException).code === "ENOENT")
        {
            return [];
        }

        throw error;
    }
}

/** Returns legacy Code Bandit 1.x JSON session files that Boba cannot read. */
export function findLegacySessionFiles(
    sessionsPath: string,
    readDirectory: (path: string) => readonly string[] = readDirectoryFileNames,
): string[]
{
    return readDirectory(sessionsPath)
        .filter(fileName => fileName.endsWith(".json"))
        .sort();
}

/** Renders Code Bandit's concise CLI help. */
export function renderHelp(version: string): string
{
    return `Code Bandit ${version} — coding with Boba

Usage:
  coba                         Start the interactive terminal UI
  coba daemon                  Start the session-owning daemon
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
export function renderOnboarding(configPath: string, configured: boolean = false): string
{
    if (configured)
    {
        return `Code Bandit is powered by Boba.

Configuration found at:
  ${configPath}

Run \`coba\` to start or \`coba --help\` for the quick reference.
`;
    }

    return `Welcome to Code Bandit 2.0 — coding with Boba.

Create ${configPath} with a coding profile. For example,
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

/** Renders the non-destructive migration block for incompatible Code Bandit 1.x sessions. */
export function renderLegacySessionMigration(paths: CodeBanditPaths, legacyFiles: readonly string[]): string
{
    return `Code Bandit 1.x sessions were found in:
  ${paths.sessionsPath}

Code Bandit 2.0 uses Boba's incompatible JSONL session format and will not mix
the two stores. Archive the old sessions directory, then start Code Bandit again:

  mv "${paths.sessionsPath}" "${paths.sessionsPath}.legacy"

Detected ${legacyFiles.length} legacy .json session file${legacyFiles.length === 1 ? "" : "s"}.
Nothing was moved or deleted automatically.
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
    const paths = resolveCodeBanditPaths(dependencies.homeDir);
    const exists = dependencies.exists ?? existsSync;
    const configured = exists(paths.configPath);

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

    const legacyFiles = findLegacySessionFiles(paths.sessionsPath, dependencies.readDirectory);

    if (legacyFiles.length > 0)
    {
        write(renderLegacySessionMigration(paths, legacyFiles));
        return 1;
    }

    if (command === "onboard" || args.length === 0 && !configured)
    {
        write(renderOnboarding(paths.configPath, configured));
        return 0;
    }

    if (!configured)
    {
        write(`${renderOnboarding(paths.configPath)}\nA Code Bandit profile is required before running this command.\n`);
        return 1;
    }

    return dependencies.delegate(args, {
        appHome: paths.appHome,
        configPath: paths.configPath,
        namespace: "coba",
        commandName: "coba",
    });
}
