import { tool } from "@langchain/core/tools";
import { z } from "zod";
import glob from "fast-glob";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { RunnableConfig } from "@langchain/core/runnables";

function listDirectory({ directory }: { directory: string }, config?: RunnableConfig): string
{
    const basePath = config?.metadata?.["workDir"] as string;

    try
    {
        if (!basePath) return "ERROR: no basePath configured!";

        const combinedPath = path.join(basePath, directory, "*");

        const files = glob.globSync(combinedPath, {
            dot: true,
            onlyFiles: false,
            objectMode: true,
            stats: true,
        });

        return files
            .filter(f => f.dirent.isDirectory() || f.dirent.isFile())
            .map((f) => `${f.dirent.isDirectory() ? "[DIR]  " : "[FILE] "} ${f.name} ${f.stats?.size}`)
            .join("\n");
    }
    catch (error: any)
    {
        return "ERROR: Tool `listDirectory` failed with: " + error.message;
    }
}

const listDirectoryTool = tool(listDirectory, {
    name: "listDirectory",
    description: "List file and directory names inside a folder. Use this ONLY when the user wants to see what files or folders exist on disk.",
    schema: z.object({
        directory: z.string(),
    }),
});

const readFile = tool(
    ({ fileName, maxLength }: { fileName: string, maxLength?: number }, config: RunnableConfig): string =>
    {
        const basePath = config?.metadata?.["workDir"] as string;

        try
        {
            if (!basePath) return "ERROR: no basePath configured!";

            const combinedPath = path.join(basePath, fileName);

            return readFileSync(combinedPath).toString().slice(0, maxLength);
        }
        catch (error: any)
        {
            return "ERROR: " + error.message;
        }
    },
    {
        name: "readFile",
        description: "Read the contents of a specified file. Use this ONLY when the user wants to retrieve exact stored data from disk.",
        schema: z.object({
            fileName: z.string().describe("The name of the file to read. Use absolute paths."),
            maxLength: z.number().optional().describe("Optionally read only [maxLength] bytes of the file."),
        }),
    },
);

const writeFile = tool(
    ({ fileName, fileData }: { fileName: string, fileData: string }, config: RunnableConfig): string =>
    {
        const basePath = config?.metadata?.["workDir"] as string;

        try
        {
            if (!basePath) return "ERROR: no basePath configured!";

            const combinedPath = path.join(basePath, fileName);

            writeFileSync(combinedPath, fileData);

            return `${fileName} created`;
        }
        catch (error: any)
        {
            return "ERROR: " + error.message;
        }

    },
    {
        name: "writeFile",
        description: "Write given content to a specified file (create or overwrite). Use this ONLY if user explicitly wants to save data.",
        schema: z.object({
            fileName: z.string().describe("The name of the file to write. Use absolute paths."),
            fileData: z.string().describe("The data to be written to the file."),
        }),
    },
);

const tools = {
    [listDirectoryTool.name]: listDirectoryTool,
    [readFile.name]: readFile,
    [writeFile.name]: writeFile,
};

export { tools };
