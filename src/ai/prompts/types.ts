import { IChatSession } from "../session/session.js";

export interface IPromptLoader
{
    getSystemPrompt: (session: IChatSession) => string;
}
