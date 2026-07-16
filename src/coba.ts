#!/usr/bin/env node

import { runBoba } from "@janole/boba";

import { runCodeBanditCli } from "./cli.js";

try
{
    process.exitCode = runCodeBanditCli(process.argv.slice(2), {
        delegate: runBoba,
    });
}
catch (error)
{
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Code Bandit: ${message}\n`);
    process.exitCode = 1;
}
