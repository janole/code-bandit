import { realpathSync } from "fs";
import path from "path";

export function resolveWithinWorkDir(userPath: string, workDir?: unknown): string
{
    if (!workDir || typeof workDir !== "string")
    {
        throw new Error("Configuration error! No base path (workDir) available.");
    }

    const absWorkDir = realpathSync(path.resolve(workDir));
    const resolvedPath = path.resolve(workDir, userPath);

    const relative = path.relative(absWorkDir, resolvedPath);

    if (relative.startsWith("..") || path.isAbsolute(relative))
    {
        throw new Error("Access outside of workDir is not allowed.");
    }

    return resolvedPath;
}

export function funcName(f: Function): string
{
    return f.name
        .replace(/([a-z])([A-Z])/g, "$1-$2") // insert hyphen before capitals
        .toLowerCase();                      // down-case everything
}

export function toolError(f: Function, error: string)
{
    return `ERROR: Tool \`${funcName(f)}\` failed with: ${error}.`;
}

export function toolNoOutput(f: Function)
{
    return `Tool \`${funcName(f)}\` produced no output.`;
}
