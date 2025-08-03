import { promises as fs } from "fs";
import { globbySync } from "globby";
import path from "path";

import { IChatSession } from "../session/session.js";
import { prompt as defaultPrompt } from "./default.js";
import { prompt as ollamaPrompt } from "./ollama.js";
import { IPromptLoader } from "./types.js";

const MAX_PROMPT_LENGTH = 4000; // TODO: make dynamic based on session / contextLength -> promptLength?
const AGENT_RULE_FILES = [".cursorrules", "AGENTS.md", "CLAUDE.md"];

const systemPrompts = {
	default: defaultPrompt,
	ollama: ollamaPrompt,
};

const getSystemPrompt = (key: string) => systemPrompts[key as keyof typeof systemPrompts] || systemPrompts.default;

export class PromptLoader implements IPromptLoader
{
	private basePrompt: string;
	private workDir: string;
	private agentRules: string | null = null;
	private systemPrompt?: string = undefined;
	private disableAgentRules: boolean;

	private constructor(session: IChatSession)
	{
		this.basePrompt = getSystemPrompt(session.chatServiceOptions.provider);
		this.workDir = session.workDir;
		this.systemPrompt = session.systemPrompt;
		this.disableAgentRules = !!session.chatServiceOptions.disableAgentRules;
	}

	private async loadAgentRules(): Promise<void>
	{
		if (this.disableAgentRules)
		{
			return;
		}

		try
		{
			const files = await globbySync(`${this.workDir}/**/{${AGENT_RULE_FILES.join(",")}}`, {
				dot: true,
				gitignore: true,
			});

			if (files.length > 0)
			{
				const sortedFiles = files.sort(
					(a, b) =>
						AGENT_RULE_FILES.indexOf(path.basename(a)) -
						AGENT_RULE_FILES.indexOf(path.basename(b))
				);
				const filePath = sortedFiles[0] as string;
				const content = await fs.readFile(filePath, "utf-8");
				this.agentRules = content.slice(0, MAX_PROMPT_LENGTH);
			}
		}
		catch (error)
		{
			// Silently fail if file search or read fails
		}
	}

	getSystemPrompt(): string
	{
		if (this.systemPrompt)
		{
			// TODO: extend this into a template mechanism like "%{DEFAULT_PROMPT}% ..."?
			return this.systemPrompt;
		}

		return this.agentRules
			? `${this.basePrompt}\n\n--- Project-Specific Instructions ---\n${this.agentRules}\n`
			: this.basePrompt;
	}

	public static async create(session: IChatSession): Promise<PromptLoader>
	{
		const loader = new PromptLoader(session);

		await loader.loadAgentRules();

		return loader;
	}
}
