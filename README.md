# Code Bandit

`Code Bandit` is a command-line tool for interacting with git repositories using AI models.

## Features
- Conversational interface powered by AI models
  - [Ollama](https://github.com/ollama/ollama) and OpenAI via [langchain.js](https://github.com/langchain-ai/langchainjs)
- Analyze and interact with your code via CLI

## Capabilities

 Currently, Code Bandit supports three main tools for interacting with your codebase:

 - `listDirectory`: List files and directories inside a folder.
 - `readFile`: Read the contents of a specified file.
 - `writeFile`: Write content to a specified file (create or **overwrite**).

> [!WARNING]
> Currently, this tool executes all requested file operations automatically without any confirmation prompts.
> This means **you can overwrite files immediately and without explicit permission — be careful!**
> ... or use `git` :wink:

## Installation

You can install the CLI globally via npm:

```bash
npm install -g @janole/code-bandit
```

Then run the command:

```bash
coba
```

Or use it directly with npx:

```bash
npx @janole/code-bandit
```

## Status

This project is currently in **alpha** stage and considered **experimental**. Expect bugs and frequent changes.

## License

MIT
