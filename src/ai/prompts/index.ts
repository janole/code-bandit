import defaultPrompt from "./default.md";
import ollamaPrompt from "./ollama.md";

const systemPrompts = {
    default: defaultPrompt,
    ollama: ollamaPrompt,
};

const getSystemPrompt = (key: string) => systemPrompts[key as keyof typeof systemPrompts] || systemPrompts.default;

export { getSystemPrompt };
