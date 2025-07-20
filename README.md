# Code Bandit

Code Bandit is an **AI-powered command-line assistant** for interacting with git repositories using AI models.

![Code Bandit Demo](docs/demo.webp)

---

## Features

- **Conversational codebase analysis**: Interact with your codebase through a chat-like CLI powered by popular AI models
- **Supports multiple LLM providers** via [LangChain.js](https://github.com/langchain-ai/langchainjs):
  - [Ollama](https://github.com/ollama/ollama), [OpenAI API](https://openai.com/api/), [Anthropic](https://www.anthropic.com/api/), [Google Gemini](https://ai.google.dev/), and [Groq](https://groq.com/)
- **Session management**:
  Conversations and history are stored per session for easy retrieval

---

## Capabilities

Code Bandit provides the AI with a set of tools to interact with your project.

### File System (read-only)

- `listDirectory`: List files and folders.
- `readFile`: Inspect the contents of a file.
- `createDirectory`: Make new folders.
- `findFiles`: Find files recursively by name or pattern (e.g., `**/*.ts`).
- `searchInFiles`: Search for text or a regex pattern within a set of files.

### Command Execution (read-only)

- `executeCommandReadOnly`: Execute arbitrary shell commands like `git status`, `npm test`, or `ls -l`. This allows the agent to perform a wide range of tasks.

### Destructive Operations

The following tools can modify or delete your files and are only enabled in **write mode**:

- `writeFile`: Create or **overwrite** files.
- `deleteFile`: Permanently remove any file.
- `moveFile`: Rename or move files.
- `executeCommand`: When write mode is enabled, commands can modify the file system (e.g., `npm install`).

> [!NOTE]
> By default, Code Bandit starts in **read-only mode** to prevent accidental file modifications.
>
> To enable destructive tools, you can either:
> - Start the app with the `--write-mode` flag.
> - Press `ctrl-w` during a session to toggle write mode on or off.

---

## Getting Started

### Installation

Install the CLI globally:
```bash
npm install -g @janole/code-bandit
```

Or run directly with `npx`:
```bash
npx @janole/code-bandit -p ollama -m magistral:24b
```

### Usage

Basic invocation:
```bash
coba [git-repo-path] [options]
```
- If you omit `git-repo-path`, it uses the current directory.

#### Common Options

- `-p, --provider <provider>`: Choose your LLM backend (e.g. `openai` or `ollama`)
- `-m, --model <model>`: Pick a language model (e.g. `gpt-4.1-mini` or `magistral:24b`)
- `-k, --api-key <key>`: Supply API key for remote providers
- `-u, --api-url <url>`: Set custom API URL
- `-C, --continue-session <file>`: Continue a saved conversation
- `--write-mode`: Enable write mode from the start

Example:
```bash
coba -p gemini -m gemini-2.5-pro     # Requires GOOGLE_API_KEY env var set
```

---

## Architecture Overview

- **`src/app.tsx`**: Main Ink-React app for terminal chat UI.
- **`src/ai/**`**: AI orchestration, tool implementations, and session management.
- **`src/ui/**`**: UI components for chat messages, markdown, and spinners.

### Sandboxed Command Execution

To ensure a secure environment, all commands executed by the AI via the `executeCommand` tool are run inside a temporary Docker container. This sandboxing prevents the agent from accessing files or services outside the current project directory.

- **Isolated Environment**: A minimal Docker image (`janole/codebandit-node:0`) is used, containing common tools like `git`, `jq`, `curl`, `grep`, and `tree`.
- **Volume Mounting**: The current working directory is mounted into the container's `/data` directory.
- **Read-Only by Default**: In the default read-only mode, the directory is mounted with the `:ro` flag, preventing any modifications by the commands.
- **Write Mode**: When write mode is enabled, the volume is mounted without the read-only flag, allowing commands like `npm install` or `git apply` to modify the project files.

---

## Security & Responsibility

- Code Bandit is powerful. When in write mode, it can overwrite or delete files. It is highly recommended to use it in a version-controlled (`git`) directory to safeguard your work.
- Always review changes made by the assistant before committing. `git diff` is your friend.

---

## Status

This project is in **alpha** and highly experimental. Expect rough edges and breaking changes.

---

## License

MIT
