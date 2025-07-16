import { RunnableConfig } from "@langchain/core/runnables";
import { DynamicStructuredTool, tool } from "@langchain/core/tools";
import { mkdirSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from "fs";
import { globbySync } from "globby";
import path from "path";
import { z } from "zod";

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

function listDirectory({ directory = "." }: { directory: string }, config?: RunnableConfig): string
{
    try
    {
        const resolvedPath = resolveWithinWorkDir(directory, config?.metadata?.["workDir"]);
        const combinedPath = path.join(resolvedPath, "*");

        const files = globbySync(combinedPath, {
            dot: true,
            onlyFiles: false,
            objectMode: true,
            stats: true,
        });

        const output = files
            .filter((f) => f.dirent.isDirectory() || f.dirent.isFile())
            .map((f) => `${f.dirent.isDirectory() ? "[DIR]  " : "[FILE] "} ${f.name} ${f.stats?.size}`)
            .join("\n");

        return output || `The directory ${directory} is empty.`;
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

        const content = readFileSync(resolvedPath).toString().slice(0, maxLength);

        return content || `The file "${fileName}" is empty.`;
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

function searchInFiles({ pattern, glob: globPattern, directory = ".", isCaseSensitive = false }: { pattern: string; glob: string; directory?: string, isCaseSensitive?: boolean }, config?: RunnableConfig): string
{
    try
    {
        const workDir = config?.metadata?.["workDir"] as string || ".";
        const resolvedPath = resolveWithinWorkDir(directory, workDir);
        const combinedGlob = path.join(resolvedPath, globPattern);

        const files = globbySync(combinedGlob, {
            dot: true,
            onlyFiles: true,
            gitignore: true,
        });

        const searchResults = [];

        for (const file of files)
        {
            const fileContent = readFileSync(file, "utf-8");
            const lines = fileContent.split("\n");

            for (let i = 0; i < lines.length; i++)
            {
                const line = lines[i] || "";
                const lineToSearch = isCaseSensitive ? line : line.toLowerCase();
                const patternToSearch = isCaseSensitive ? pattern : pattern.toLowerCase();

                if (lineToSearch.includes(patternToSearch))
                {
                    searchResults.push({
                        fileName: path.relative(workDir, file),
                        lineNumber: i + 1,
                        lineContent: line.trim(),
                    });
                }
            }
        }

        if (searchResults.length === 0)
        {
            return `No matches found for pattern "${pattern}" in files matching "${globPattern}".`;
        }

        return JSON.stringify(searchResults, null, 2);
    }
    catch (error: any)
    {
        return "ERROR: Tool `searchInFiles` failed with: " + error.message;
    }
}

const _tools = [
    tool(listDirectory, {
        name: "listDirectory",
        description: "List the files and folders inside a given directory (relative to the working directory). Use ONLY when the user wants to browse or inspect the contents of a folder.",
        schema: z.object({
            directory: z.string().describe("Path to the directory to list, relative to the working directory.").optional().default("."),
        }),
    }),
    tool(readFile, {
        name: "readFile",
        description: "Read the contents of a file. Use ONLY when the user wants to retrieve or inspect saved content (e.g., source code, configuration files, etc.).",
        schema: z.object({
            fileName: z.string().describe("Path to the file to read, relative to the working directory."),
            maxLength: z.number().optional().describe("Optionally limit the number of characters to read."),
        }),
    }),
    tool(writeFile, {
        name: "writeFile",
        description: "Write content to a file (create or overwrite). Use ONLY when the user wants to persist generated or modified content to disk.",
        schema: z.object({
            fileName: z.string().describe("Path to the file to write, relative to the working directory."),
            fileData: z.string().describe("The content to write into the file."),
        }),
        metadata: {
            destructive: true,
        },
    }),
    tool(deleteFile, {
        name: "deleteFile",
        description: "Delete a file from disk. Use ONLY when the user clearly wants to remove a file permanently.",
        schema: z.object({
            fileName: z.string().describe("Path to the file to delete, relative to the working directory."),
        }),
        metadata: {
            destructive: true,
        },
    }),
    tool(moveFile, {
        name: "moveFile",
        description: "Rename or move a file within the working directory. Use ONLY when the user asks to rename or move a file.",
        schema: z.object({
            sourceFileName: z.string().describe("Path of the file to move or rename, relative to the working directory."),
            destinationFileName: z.string().describe("New path or name for the file, relative to the working directory."),
        }),
        metadata: {
            destructive: true,
        },
    }),
    tool(createDirectory, {
        name: "createDirectory",
        description: "Create a directory (and any necessary parent directories) at the given path. Use ONLY when the user wants to make a new folder.",
        schema: z.object({
            fileName: z.string().describe("Path to the directory to create, relative to the working directory."),
        }),
    }),
    tool(searchInFiles, {
        name: "searchInFiles",
        description: "Search for a pattern within files in the project. This is much more efficient than reading each file manually.",
        schema: z.object({
            pattern: z.string().describe("The string or regex pattern to search for."),
            glob: z.string().describe("A glob pattern to filter which files to search in (e.g., 'src/**/*.ts', '*.md')."),
            directory: z.string().describe("The base directory to start the search from. Defaults to the current working directory.").optional().default("."),
            isCaseSensitive: z.boolean().describe("Whether the search should be case-sensitive. Defaults to false.").optional().default(false),
        }),
    }),
];

const tools: { [key: string]: DynamicStructuredTool } = _tools.reduce((tools, t) => ({ ...tools, [t.name]: t }), {});

export { tools };
