import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveCodeBanditPaths, runCodeBanditCli } from "../src/index.js";

const HOME_DIR = "/home/code-bandit";
const PATHS = resolveCodeBanditPaths(HOME_DIR);

function createHarness(existingPaths: string[] = [], sessionFiles: string[] = [])
{
    const output: string[] = [];
    const delegated: Array<{ args: string[]; options: unknown }> = [];
    const existing = new Set(existingPaths);

    return {
        delegated,
        dependencies: {
            delegate: (args: readonly string[], options: unknown) =>
            {
                delegated.push({ args: [...args], options });
                return 23;
            },
            exists: (path: string) => existing.has(path),
            homeDir: HOME_DIR,
            readDirectory: (path: string) => path === PATHS.sessionsPath ? sessionFiles : [],
            version: "2.0.0-test",
            write: (text: string) => output.push(text),
        },
        output,
    };
}

describe("Code Bandit CLI", () =>
{
    it("resolves every owned path beneath the isolated Code Bandit home", () =>
    {
        expect(PATHS).toEqual({
            appHome: join(HOME_DIR, ".code-bandit"),
            configPath: join(HOME_DIR, ".code-bandit", "config.yaml"),
            sessionsPath: join(HOME_DIR, ".code-bandit", "sessions"),
        });
    });

    it("owns help", () =>
    {
        const harness = createHarness();
        const status = runCodeBanditCli(["--help"], harness.dependencies);

        expect(status).toBe(0);
        expect(harness.output.join("")).toMatch(/Code Bandit 2\.0\.0-test/);
        expect(harness.delegated).toEqual([]);
    });

    it("shows onboarding for a fresh bare invocation", () =>
    {
        const harness = createHarness();
        const status = runCodeBanditCli([], harness.dependencies);

        expect(status).toBe(0);
        expect(harness.output.join("")).toMatch(/Welcome to Code Bandit 2\.0/);
        expect(harness.output.join("")).toContain(PATHS.configPath);
        expect(harness.delegated).toEqual([]);
    });

    it("requires a configured Boba profile for commands", () =>
    {
        const harness = createHarness();
        const status = runCodeBanditCli(["--api-key", "do-not-echo"], harness.dependencies);

        expect(status).toBe(1);
        expect(harness.output.join("")).toMatch(/Code Bandit profile is required/);
        expect(harness.output.join("")).not.toMatch(/do-not-echo/);
        expect(harness.delegated).toEqual([]);
    });

    it("delegates configured commands unchanged and preserves the exit status", () =>
    {
        const harness = createHarness([PATHS.configPath]);
        const status = runCodeBanditCli(["run", "hello world", "--profile", "coder"], harness.dependencies);

        expect(status).toBe(23);
        expect(harness.delegated).toEqual([{
            args: ["run", "hello world", "--profile", "coder"],
            options: {
                appHome: PATHS.appHome,
                configPath: PATHS.configPath,
                namespace: "coba",
                commandName: "coba",
            },
        }]);
    });

    it("reports an existing config during onboarding without delegating", () =>
    {
        const harness = createHarness([PATHS.configPath]);
        const status = runCodeBanditCli(["onboard"], harness.dependencies);

        expect(status).toBe(0);
        expect(harness.output.join("")).toContain(PATHS.configPath);
        expect(harness.delegated).toEqual([]);
    });

    it("ignores project and Boba home configs", () =>
    {
        const harness = createHarness([
            "/work/project/botbandit.config.yaml",
            join(HOME_DIR, ".botbandit", "botbandit.config.yaml"),
        ]);
        const status = runCodeBanditCli(["run", "hello"], harness.dependencies);

        expect(status).toBe(1);
        expect(harness.delegated).toEqual([]);
    });

    it("blocks incompatible legacy JSON sessions without modifying them", () =>
    {
        const harness = createHarness([PATHS.configPath], ["old-one.json", "old-two.json", "new-session.jsonl"]);
        const status = runCodeBanditCli([], harness.dependencies);

        expect(status).toBe(1);
        expect(harness.output.join("")).toContain(`mv "${PATHS.sessionsPath}" "${PATHS.sessionsPath}.legacy"`);
        expect(harness.output.join("")).toMatch(/Detected 2 legacy \.json session files/);
        expect(harness.delegated).toEqual([]);
    });

    it("allows Boba JSONL sessions", () =>
    {
        const harness = createHarness([PATHS.configPath], ["01ABC.jsonl"]);
        const status = runCodeBanditCli(["resume", "01ABC"], harness.dependencies);

        expect(status).toBe(23);
        expect(harness.delegated).toHaveLength(1);
    });
});
