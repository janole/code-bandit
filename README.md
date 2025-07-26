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
- `--max-messages <count>`: Limit the number of messages kept in history (default: 10)
- `-C, --continue-session <file>`: Continue a saved conversation
- `--read-only`: Starts the session in `read-only` mode, disabling any file system modifications.
- `--write-mode`: Starts the session in `yolo` mode, allowing the AI to execute all tools without confirmation.

Example:
```bash
coba -p gemini -m gemini-2.5-pro     # Requires GOOGLE_API_KEY env var set
```

---

## Capabilities

Code Bandit provides the AI with a set of tools to interact with your project. The availability of these tools depends on the current [Tool Mode](#tool-modes--safety).

### Always-Available Tools

These tools do not modify the file system and are always available to the AI.

- `listDirectory`: List files and folders.
- `readFile`: Inspect the contents of a file.
- `findFiles`: Find files recursively by name or pattern (e.g., `**/*.ts`).
- `searchInFiles`: Search for text or a regex pattern within a set of files.
- `executeCommandReadOnly`: Execute arbitrary, non-destructive shell commands like `git status`, `npm test`, or `ls -l`.

### Destructive Tools

The following tools can modify or delete your files. They are only available when the Tool Mode is set to `yolo` (`--write-mode`) or when explicitly approved in the `confirm` mode.

- `writeFile`: Create or **overwrite** files.
- `deleteFile`: Permanently remove any file.
- `moveFile`: Rename or move files.
- `createDirectory`: Make new folders.
- `executeCommand`: Execute arbitrary shell commands that **can** modify the file system (e.g., `npm install` or `git apply`).

---

### Tool Modes & Safety

Code Bandit operates in one of three tool modes to ensure user control and safety. If no mode is specified, it defaults to `confirm`.

-   **`confirm` (Default)**: By default, Code Bandit will ask for your permission before executing a destructive tool (like `writeFile` or `executeCommand`). An interactive prompt will appear, allowing you to approve or deny the action. The `executeCommandReadOnly` tool is always available.
-   **`read-only`**: This mode disables all destructive tools, including `executeCommand`. Only safe, read-only tools like `readFile` and `executeCommandReadOnly` are available. You can enable this mode by starting the application with the `--read-only` flag.
-   **`yolo`**: This mode allows the AI to execute all tools, including destructive ones, without asking for confirmation. This is powerful but can be risky. Use with caution. You can enable this mode by starting the application with the `--write-mode` flag.

---

## Architecture Overview

- **`src/app.tsx`**: Main Ink-React app for terminal chat UI.
- **`src/ai/**`**: AI orchestration, tool implementations, and session management.
- **`src/ui/**`**: UI components for chat messages, markdown, and spinners.

### Sandboxed Command Execution

To ensure a secure environment, all shell commands are run inside a temporary Docker container. This sandboxing prevents the agent from accessing files or services outside the current project directory.

- **Isolated Environment**: A minimal Docker image (`janole/codebandit-node:0`) is used, containing common tools like `git`, `jq`, `curl`, `grep`, and `tree`.
- **Volume Mounting**: The current working directory is mounted into the container's `/data` directory.
- **Read-Only by Default**: The `executeCommandReadOnly` tool mounts the directory with the `:ro` flag, preventing any modifications by the commands.
- **Write Access**: The `executeCommand` tool mounts the volume without the read-only flag, allowing commands like `npm install` to modify project files. This tool is only available in `yolo` mode or after explicit user confirmation in `confirm` mode.
- **Timeout**: Commands are automatically terminated after 30 seconds to prevent long-running or hung processes.

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
