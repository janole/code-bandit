
import { RunnableConfig } from "@langchain/core/runnables";
import { DynamicStructuredTool, tool } from "@langchain/core/tools";
import fetch from "node-fetch"; // This would be needed for a real implementation
import { z } from "zod";

async function search({ query }: { query: string }, config?: RunnableConfig): Promise<string>
{
    // In a real scenario, you would make an HTTP request to a SearXNG instance here.
    // Example:
    const searxngInstance = "http://localhost:8080"; // Replace with your SearXNG instance
    const response = await fetch(`${searxngInstance}/search?q=${encodeURIComponent(query)}&format=json`);
    const data = await response.json();

    // console.log(`${searxngInstance}/search?q=${encodeURIComponent(query)}&format=json`, data);
    // process.exit();    

    return JSON.stringify(data.results);

    // // For now, return a mock response
    // console.log(`Searching SearXNG for: "${query}"`);
    // if (query.toLowerCase().includes("typescript")) {
    //     return `Mock SearXNG result for "${query}":
    //     [
    //         { "title": "TypeScript Documentation", "url": "https://www.typescriptlang.org/docs/" },
    //         { "title": "TypeScript Playground", "url": "https://www.typescriptlang.org/play" }
    //     ]`;
    // } else {
    //     return `Mock SearXNG result for "${query}": No relevant results found in mock data.`;
    // }
}


const _tools = [
    tool(search, {
        name: "webSearch",
        description: "Search the web",
        schema: z.object({
            query: z.string().describe("The search term to search for."),
        }),
    }),
];

function getTools(): { [key: string]: DynamicStructuredTool }
{
    return _tools.reduce((tools, t) => ({ ...tools, [t.name]: t }), {});
}

export { getTools };
