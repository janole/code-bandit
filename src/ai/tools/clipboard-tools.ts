import { DynamicStructuredTool, tool } from "@langchain/core/tools";
import clipboard from "clipboardy";
import { z } from "zod";

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
    tool(copyToClipboard, {
        name: "copyToClipboard",
        description: "Copies the given text to the system clipboard. Use this when the user wants to copy content for use outside of the terminal (e.g., sharing code snippets, copying outputs, or saving text for external use).",
        schema: z.object({
            data: z.string().describe("The text content to copy to the clipboard."),
        }),
    }),
];

function getTools(): { [key: string]: DynamicStructuredTool }
{
    return _tools.reduce((tools, t) => ({ ...tools, [t.name]: t }), {});
}

export { getTools };