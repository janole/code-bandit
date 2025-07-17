import { prompt as defaultPrompt } from "./default.js";
import { prompt as ollamaPrompt } from "./ollama.js";

const systemPrompts = {
    default: defaultPrompt,
    ollama: ollamaPrompt,
};

const getSystemPrompt = (key: string) => systemPrompts[key as keyof typeof systemPrompts] || systemPrompts.default;

export { getSystemPrompt };
