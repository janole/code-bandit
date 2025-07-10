# Code Bandit

`Code Bandit` is a command-line tool for interacting with git repositories using AI models.

## Features
- Analyze and interact with your code via CLI
- Conversational interface powered by AI models
  - [Ollama](https://github.com/ollama/ollama), [OpenAI API](https://openai.com/api/), [Anthropic](https://www.anthropic.com/api), and [Google Gemini](https://ai.google.dev/)
    (via [langchain.js](https://github.com/langchain-ai/langchainjs))

## Capabilities

Currently, Code Bandit supports the following tools for interacting with your codebase:

- `listDirectory`: List files and directories inside a folder.
- `readFile`: Read the contents of a specified file.
- `writeFile`: Write content to a specified file (create or **overwrite**).
- `deleteFile`: Delete a file from disk.
- `moveFile`: Rename or move a file.
- `createDirectory`: Create a new directory.

> [!WARNING]
> Currently, this tool executes all requested file operations automatically without any confirmation prompts.
> This means **you can overwrite or delete files immediately and without explicit permission — be careful!**
> ... or use `git` :wink:

## Installation

You can install the CLI globally via npm:

```bash
$ npm install -g @janole/code-bandit
```

Then run the command:

```bash
$ coba -p openai -m gpt-4.1-mini   # make sure, your `OPENAI_API_KEY` is properly set
```

Or use it directly with npx:

```bash
$ npx @janole/code-bandit -p ollama -m magistral:24b   # make sure, Ollama is installed on your computer
```

## Status

This project is currently in **alpha** stage and considered **experimental**. Expect bugs and frequent changes.

## License

MIT
