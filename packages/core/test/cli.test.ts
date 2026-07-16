import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { findBobaConfig, runCodeBanditCli } from "../src/index.js";

function createHarness(existingPaths: string[] = [])
{
    const output: string[] = [];
    const delegated: string[][] = [];
    const existing = new Set(existingPaths);

    return {
        delegated,
        dependencies: {
            cwd: "/work/project",
            delegate: (args: readonly string[]) =>
            {
                delegated.push([...args]);
                return 23;
            },
            exists: (path: string) => existing.has(path),
            homeDir: "/home/code-bandit",
            version: "2.0.0-test",
            write: (text: string) => output.push(text),
        },
        output,
    };
}

describe("Code Bandit CLI", () =>
{
    it("gives project config precedence over the home config", () =>
    {
        const projectConfig = join("/work/project", "botbandit.config.yml");
        const homeConfig = join("/home/code-bandit", ".botbandit", "botbandit.config.yaml");
        const config = findBobaConfig("/work/project", "/home/code-bandit", (path) =>
        {
            return path === projectConfig || path === homeConfig;
        });

        expect(config).toBe(projectConfig);
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
        expect(harness.output.join("")).toMatch(/botbandit\.config\.yaml/);
        expect(harness.delegated).toEqual([]);
    });

    it("requires a configured Boba profile for commands", () =>
    {
        const harness = createHarness();
        const status = runCodeBanditCli(["--api-key", "do-not-echo"], harness.dependencies);

        expect(status).toBe(1);
        expect(harness.output.join("")).toMatch(/profile is required/);
        expect(harness.output.join("")).not.toMatch(/do-not-echo/);
        expect(harness.delegated).toEqual([]);
    });

    it("delegates configured commands unchanged and preserves the exit status", () =>
    {
        const config = join("/work/project", "botbandit.config.yaml");
        const harness = createHarness([config]);
        const status = runCodeBanditCli(["run", "hello world", "--profile", "coder"], harness.dependencies);

        expect(status).toBe(23);
        expect(harness.delegated).toEqual([["run", "hello world", "--profile", "coder"]]);
    });

    it("reports an existing config during onboarding without delegating", () =>
    {
        const config = join("/home/code-bandit", ".botbandit", "botbandit.config.yml");
        const harness = createHarness([config]);
        const status = runCodeBanditCli(["onboard"], harness.dependencies);

        expect(status).toBe(0);
        expect(harness.output.join("")).toMatch(new RegExp(config));
        expect(harness.delegated).toEqual([]);
    });
});
