import { DynamicStructuredTool } from "@langchain/core/tools";

import { IChatSession } from "../session/session.js";

export type TTools = { [key: string]: DynamicStructuredTool };

export interface IToolProvider
{
    getTools: (session: IChatSession) => TTools;
}
