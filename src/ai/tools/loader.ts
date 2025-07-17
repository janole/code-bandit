import { tools as commandExecutionTools } from "./command-execution-tools.js";
import { tools as fileSystemTools } from "./file-system-tools.js";

const allTools = { ...fileSystemTools, ...commandExecutionTools };
const safeTools = Object.fromEntries(Object.entries(allTools).filter(([_, tool]) => !tool.metadata?.["destructive"]));

interface GetToolsProps
{
    includeDestructiveTools?: boolean;
}

function getTools(props: GetToolsProps)
{
    return props.includeDestructiveTools ? allTools : safeTools;
}

export { getTools };