import { IChatSession } from "../session/session.js";
import { getTools as getClipboardTools } from "./clipboard-tools.js";
import { getTools as getCommandExecutionTools } from "./command-execution-tools.js";
import { getTools as getFileSystemTools } from "./file-system-tools.js";
import { getTools as getWebSearchTools } from "./searxng-tools.js";
import { IToolProvider } from "./types.js";

class NodeToolProvider implements IToolProvider
{
    getTools(session: IChatSession)
    {
        const props = { includeDestructiveTools: session.toolMode !== "read-only" };

        return {
            ...getFileSystemTools(props),
            ...getCommandExecutionTools(props),
            ...getClipboardTools(), // Clipboard tools are always available (non-destructive)
            ...getWebSearchTools(),
        };
    }
}

export { NodeToolProvider };
