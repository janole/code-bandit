import { tool } from "@langchain/core/tools";
import { z } from "zod";
import glob from "fast-glob";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

export default function createTools(basePath: string)
{
    const listDirectory = tool(
        ({ directory }: { directory: string }): string =>
        {
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
                return "ERROR: " + error.message;
            }
        },
        {
            name: "listDirectory",
            description: "List the contents of a directory",
            schema: z.object({
                directory: z.string(),
            }),
        },
    );

    const readFile = tool(
        ({ fileName, maxLength }: { fileName: string, maxLength?: number }): string =>
        {
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
            description: "Read a file.",
            schema: z.object({
                fileName: z.string().describe("The name of the file to read. Use absolute paths."),
                maxLength: z.number().optional().describe("Optionally read only [maxLength] bytes of the file."),
            }),
        },
    );

    const writeFile = tool(
        ({ fileName, fileData }: { fileName: string, fileData: string }): string =>
        {
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
            description: "Create or overwrite a file.",
            schema: z.object({
                fileName: z.string().describe("The name of the file to write. Use absolute paths."),
                fileData: z.string().describe("The data to be written to the file."),
            }),
        },
    );

    const tools = {
        [listDirectory.name]: listDirectory,
        [readFile.name]: readFile,
        [writeFile.name]: writeFile,
    };

    return tools;
}
