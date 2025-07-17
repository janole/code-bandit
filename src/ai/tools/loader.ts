import { getTools as getCommandExecutionTools } from "./command-execution-tools.js";
import { getTools as getFileSystemTools } from "./file-system-tools.js";

interface GetToolsProps
{
    includeDestructiveTools?: boolean;
}

function getTools(props: GetToolsProps)
{
    return {
        ...getFileSystemTools(props),
        ...getCommandExecutionTools(props),
    };
}

export { getTools };