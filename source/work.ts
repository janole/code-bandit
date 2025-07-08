import { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { concat } from "@langchain/core/utils/stream";
import { ChatOpenAI } from "@langchain/openai";
// import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";
import path from "path";
import glob from "fast-glob";
import { readFileSync, writeFileSync } from "fs";

// const llm = new ChatOllama({
//     model: "qwen2.5:3b-instruct-q4_K_M",
//     // temperature: 0,
//     // maxRetries: 2,
// });

const llm = new ChatOpenAI({
    model: "gpt-4.1-mini",
});

let basePath: string | undefined = undefined; // "/Users/ole/projekte/ChatBandit/main";

const listDirectory = tool(
    ({ directory }: { directory: string }): string[] =>
    {
        if (!basePath) return ["ERROR: no basePath configured!"];

        const combinedPath = path.join(basePath, directory, "*");

        // console.log({ combinedPath });

        const files = glob.globSync(combinedPath, {
            dot: true,
            onlyFiles: false,
            objectMode: true,
            stats: true,
        });

        return files
            .filter(f => f.dirent.isDirectory() || f.dirent.isFile())
            .map((f) => `${f.dirent.isDirectory() ? "[DIR]  " : "[FILE] "} ${f.name} ${f.stats?.size}`);
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
        if (!basePath) return "ERROR: no basePath configured!";

        const combinedPath = path.join(basePath, fileName);

        return readFileSync(combinedPath).toString().slice(0, maxLength);
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
        if (!basePath) return "ERROR: no basePath configured!";

        const combinedPath = path.join(basePath, fileName);

        writeFileSync(combinedPath, fileData);

        return `${fileName} created`;
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

const llmWithTools = llm.bindTools(Object.values(tools));

export type TMessage = BaseMessage;

interface WorkProps
{
    workDir: string;
    messages: TMessage[];
    send: (messages: TMessage[]) => void;
}

async function work(props: WorkProps)
{
    const { workDir, send } = props;

    const messages = [...props.messages];

    // TODO: fix this HACK!
    basePath = workDir;

    let stream = await llmWithTools.stream(messages);

    let aiMessage: AIMessageChunk | undefined = undefined;

    for await (const chunk of stream)
    {
        aiMessage = aiMessage !== undefined ? concat(aiMessage, chunk) : chunk;
        send([...messages, aiMessage]);
    }

    aiMessage && messages.push(aiMessage);

    if (aiMessage?.tool_calls)
    {
        for (const toolCall of aiMessage.tool_calls)
        {
            const selectedTool = tools[toolCall.name];

            if (selectedTool)
            {
                // @ts-expect-error
                const toolMessage = await selectedTool.invoke(toolCall);
                messages.push(toolMessage);
            }
        }

        writeFileSync("temp.json", JSON.stringify(messages, null, 2));

        stream = await llmWithTools.stream(messages);

        aiMessage = undefined;

        for await (const chunk of stream)
        {
            aiMessage = aiMessage !== undefined ? concat(aiMessage, chunk) : chunk;
            send([...messages, aiMessage]);

            // // @ts-expect-error
            // process.stdout.write(chunk.content);
        }

        aiMessage && messages.push(aiMessage);

        if (aiMessage?.tool_calls)
        {
            console.error("RECURSIVE TOOL CALL ...");
        }
    }

    return messages;
}

export { work };
