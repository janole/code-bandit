import { DynamicStructuredTool } from "langchain/tools";

import { IChatSession } from "../session/session.js";

export type TTools = { [key: string]: DynamicStructuredTool };

export interface IToolProvider
{
    getTools: (session: IChatSession) => TTools;
}