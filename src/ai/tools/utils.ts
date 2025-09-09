import { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { realpathSync } from "fs";
import path from "path";

import { ToolProgressMessage } from "../custom-messages.js";

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

/** create tool and automatically infer tool name from function */
export function createTool(f: (p: any, config: RunnableConfig) => unknown, fields: Omit<Parameters<typeof tool>[1], "name">)
{
    return tool(f, { ...fields, name: funcName(f) });
}

export function formatToolError(f: Function, error: string)
{
    return `ERROR: Tool \`${funcName(f)}\` failed with: ${error}.`;
}

export function formatEmptyToolOutput(f: Function)
{
    return `Tool \`${funcName(f)}\` produced no output.`;
}

export function setToolProgressMessageInfo(props: { config?: RunnableConfig; description?: string; fileName?: string; })
{
    const toolProgressMessage = props?.config?.metadata?.["toolProgressMessage"] as (ToolProgressMessage | undefined);

    if (toolProgressMessage)
    {
        toolProgressMessage.info.description = props.description;
        toolProgressMessage.info.fileName = props.fileName;
    }
}
