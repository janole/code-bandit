import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";

import { findBobaConfig, runCodeBanditCli } from "../dist/cli.js";

function createHarness(existingPaths = [])
{
    const output = [];
    const delegated = [];
    const existing = new Set(existingPaths);

    return {
        delegated,
        dependencies: {
            cwd: "/work/project",
            delegate: (args) =>
            {
                delegated.push([...args]);
                return 23;
            },
            exists: (path) => existing.has(path),
            homeDir: "/home/code-bandit",
            version: "2.0.0-test",
            write: (text) => output.push(text),
        },
        output,
    };
}

test("project config takes precedence over the home config", () =>
{
    const projectConfig = join("/work/project", "botbandit.config.yml");
    const homeConfig = join("/home/code-bandit", ".botbandit", "botbandit.config.yaml");
    const config = findBobaConfig("/work/project", "/home/code-bandit", (path) =>
    {
        return path === projectConfig || path === homeConfig;
    });

    assert.equal(config, projectConfig);
});

test("help is owned by Code Bandit", () =>
{
    const harness = createHarness();
    const status = runCodeBanditCli(["--help"], harness.dependencies);

    assert.equal(status, 0);
    assert.match(harness.output.join(""), /Code Bandit 2\.0\.0-test/);
    assert.deepEqual(harness.delegated, []);
});

test("a fresh bare invocation shows onboarding", () =>
{
    const harness = createHarness();
    const status = runCodeBanditCli([], harness.dependencies);

    assert.equal(status, 0);
    assert.match(harness.output.join(""), /Welcome to Code Bandit 2\.0/);
    assert.match(harness.output.join(""), /botbandit\.config\.yaml/);
    assert.deepEqual(harness.delegated, []);
});

test("commands require a configured Boba profile", () =>
{
    const harness = createHarness();
    const status = runCodeBanditCli(["--api-key", "do-not-echo"], harness.dependencies);

    assert.equal(status, 1);
    assert.match(harness.output.join(""), /profile is required/);
    assert.doesNotMatch(harness.output.join(""), /do-not-echo/);
    assert.deepEqual(harness.delegated, []);
});

test("configured commands delegate unchanged and preserve the exit status", () =>
{
    const config = join("/work/project", "botbandit.config.yaml");
    const harness = createHarness([config]);
    const status = runCodeBanditCli(["run", "hello world", "--profile", "coder"], harness.dependencies);

    assert.equal(status, 23);
    assert.deepEqual(harness.delegated, [["run", "hello world", "--profile", "coder"]]);
});

test("onboarding reports an existing config without delegating", () =>
{
    const config = join("/home/code-bandit", ".botbandit", "botbandit.config.yml");
    const harness = createHarness([config]);
    const status = runCodeBanditCli(["onboard"], harness.dependencies);

    assert.equal(status, 0);
    assert.match(harness.output.join(""), new RegExp(config));
    assert.deepEqual(harness.delegated, []);
});
