import { DynamicStructuredTool, tool } from "@langchain/core/tools";
import { RunnableConfig } from "@langchain/core/runnables";
import { z } from "zod";
import { mkdirSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import glob from "fast-glob";

function resolveWithinWorkDir(userPath: string, workDir?: unknown): string
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

function listDirectory({ directory }: { directory: string }, config?: RunnableConfig): string
{
    try
    {
        const resolvedPath = resolveWithinWorkDir(directory, config?.metadata?.["workDir"]);
        const combinedPath = path.join(resolvedPath, "*");

        const files = glob.globSync(combinedPath, {
            dot: true,
            onlyFiles: false,
            objectMode: true,
            stats: true,
        });

        return files
            .filter((f) => f.dirent.isDirectory() || f.dirent.isFile())
            .map((f) => `${f.dirent.isDirectory() ? "[DIR]  " : "[FILE] "} ${f.name} ${f.stats?.size}`)
            .join("\n");
    }
    catch (error: any)
    {
        return "ERROR: Tool `listDirectory` failed with: " + error.message;
    }
}

function readFile({ fileName, maxLength }: { fileName: string; maxLength?: number }, config: RunnableConfig): string
{
    try
    {
        const resolvedPath = resolveWithinWorkDir(fileName, config?.metadata?.["workDir"]);
        return readFileSync(resolvedPath).toString().slice(0, maxLength);
    }
    catch (error: any)
    {
        return "ERROR: Tool `readFile` failed with: " + error.message;
    }
};

function writeFile({ fileName, fileData }: { fileName: string; fileData: string }, config: RunnableConfig): string
{
    try
    {
        const resolvedPath = resolveWithinWorkDir(fileName, config?.metadata?.["workDir"]);
        writeFileSync(resolvedPath, fileData);

        return `${fileName} created.`;
    }
    catch (error: any)
    {
        return "ERROR: Tool `writeFile` failed with: " + error.message;
    }
}

function moveFile({ sourceFileName, destinationFileName }: { sourceFileName: string, destinationFileName: string }, config: RunnableConfig): string
{
    try
    {
        const resolvedSourcePath = resolveWithinWorkDir(sourceFileName, config?.metadata?.["workDir"]);
        const resolvedDestinationPath = resolveWithinWorkDir(destinationFileName, config?.metadata?.["workDir"]);

        renameSync(resolvedSourcePath, resolvedDestinationPath);

        return `${sourceFileName} moved to ${destinationFileName}.`;
    }
    catch (error: any)
    {
        return "ERROR: Tool `moveFile` failed with: " + error.message;
    }
}

function deleteFile({ fileName }: { fileName: string }, config: RunnableConfig): string
{
    try
    {
        const resolvedPath = resolveWithinWorkDir(fileName, config?.metadata?.["workDir"]);

        unlinkSync(resolvedPath);

        return `${fileName} deleted.`;
    }
    catch (error: any)
    {
        return "ERROR: Tool `deleteFile` failed with: " + error.message;
    }
}

function createDirectory({ fileName }: { fileName: string }, config: RunnableConfig): string
{
    try
    {
        const resolvedPath = resolveWithinWorkDir(fileName, config?.metadata?.["workDir"]);

        mkdirSync(resolvedPath, { recursive: true });

        return `${fileName} created.`;
    }
    catch (error: any)
    {
        return "ERROR: Tool `createDirectory` failed with: " + error.message;
    }
}

const _tools = [
    tool(listDirectory, {
        name: "listDirectory",
        description: "List file and directory names inside a folder. Use this ONLY when the user wants to see what files or folders exist on disk.",
        schema: z.object({
            directory: z.string(),
        }),
    }),
    tool(readFile, {
        name: "readFile",
        description: "Read the contents of a specified file. Use this ONLY when the user wants to retrieve exact stored data from disk.",
        schema: z.object({
            fileName: z.string().describe("The name of the file to read."),
            maxLength: z.number().optional().describe("Optionally read only [maxLength] bytes of the file."),
        }),
    }),
    tool(writeFile, {
        name: "writeFile",
        description: "Write given content to a specified file (create or overwrite). Use this ONLY if user explicitly wants to save data.",
        schema: z.object({
            fileName: z.string().describe("The name of the file to write."),
            fileData: z.string().describe("The data to be written to the file."),
        }),
    }),
    tool(deleteFile, {
        name: "deleteFile",
        description: "Delete the file. Use this ONLY if user explicitly wants to delete a file.",
        schema: z.object({
            fileName: z.string().describe("The name of the file to delete."),
        }),
    }),
    tool(moveFile, {
        name: "moveFile",
        description: "Rename a file.",
        schema: z.object({
            sourceFileName: z.string().describe("The path of the file to rename."),
            destinationFileName: z.string().describe("The new path of the file after renaming."),
        }),
    }),
    tool(createDirectory, {
        name: "createDirectory",
        description: "Creates a directory at the specified path, including any necessary parent directories (i.e., supports recursive creation like mkdir -p).",
        schema: z.object({
            fileName: z.string().describe("The name of the directory to create."),
        }),
    }),
];

const tools: { [key: string]: DynamicStructuredTool } = _tools.reduce((tools, t) => ({ ...tools, [t.name]: t }), {});

export { tools };
