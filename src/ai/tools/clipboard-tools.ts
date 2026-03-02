import clipboard from "clipboardy";
import { z } from "zod";

import { TTools } from "./types.js";
import { createTool } from "./utils.js";

/**
 * Copy text content to the system clipboard
 */
function copyToClipboard({ data }: { data: string }): string
{
    try
    {
        clipboard.writeSync(data);
        const truncatedData = data.length > 100 ? `${data.slice(0, 100)}...` : data;
        return `Successfully copied to clipboard: ${truncatedData}`;
    }
    catch (error: any)
    {
        return "ERROR: Tool `copyToClipboard` failed with: " + error.message;
    }
}

const _tools = [
    createTool(copyToClipboard, {
        description: "Copies the given text to the system clipboard. Use this when the user wants to copy content for use outside of the terminal (e.g., sharing code snippets, copying outputs, or saving text for external use).",
        schema: z.object({
            data: z.string().describe("The text content to copy to the clipboard."),
        }),
    }),
];

function getTools(): TTools
{
    return _tools.reduce<TTools>((tools, t) => ({ ...tools, [t.name]: t }), {});
}

export { getTools };
