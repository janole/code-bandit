import { runCodeBanditCli } from "@code-bandit/core";
import { runBoba } from "@janole/boba";

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
