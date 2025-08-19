# 🏴‍☠️ Code Bandit

**Your AI-powered codebase companion that speaks your language**

[![npm version](https://badge.fury.io/js/@janole%2Fcode-bandit.svg)](https://badge.fury.io/js/@janole%2Fcode-bandit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Code Bandit** transforms how you interact with your codebase. Instead of memorizing complex commands or digging through documentation, just tell your AI assistant what you want to do in plain English – and watch the magic happen.

![Code Bandit Demo](docs/demo.webp)

---

## 🚀 Why Code Bandit?

**Stop context switching. Start conversing.**

- 💬 **Chat with your codebase** — Ask questions like "What does this function do?" or "Add error handling to this API"
- 🔍 **Instant code analysis** — "Find all unused imports" or "Show me the database schema"
- ⚡ **AI-powered refactoring** — "Convert this class to TypeScript" or "Add unit tests for this module"
- 🛠️ **Smart automation** — "Set up ESLint" or "Generate API documentation"
- 🔒 **Safe by default** — Built-in safety modes and confirmation prompts
- 🎯 **Multiple interfaces** — CLI, VS Code extension, and programmatic API

**Perfect for:**
- 🧑‍💻 Developers exploring new codebases
- 🏗️ Code reviews and refactoring sessions  
- 📚 Learning from existing projects
- 🐛 Debugging and troubleshooting
- 📝 Documentation and analysis
- 🔄 Automated commit message generation

---

## ⚡ Quick Start

### 1. Install globally
```bash
npm install -g @janole/code-bandit
```

### 2. Jump into any project
```bash
cd your-awesome-project
coba -p ollama -m llama3.2:3b
```

### 3. Start chatting!
```
You: Show me the main entry points of this project
AI: I found 3 main entry points...

You: Add error handling to the API routes
AI: I'll add comprehensive error handling. Let me update the files...
```

---

## 🛠️ Installation & Setup

### Global Installation
```bash
npm install -g @janole/code-bandit
```

### One-time Usage
```bash
npx @janole/code-bandit -p ollama -m magistral:24b
```

### VS Code Extension
```bash
# Install the official VS Code extension
coba install-extension

# Or install a specific version
coba install-extension --tag v0.3.6
```

### Quick Examples

**With OpenAI:**
```bash
# Set your API key
export OPENAI_API_KEY="your-key-here"
coba -p openai -m gpt-5
```

**With Ollama (local):**
```bash
# Install Ollama first: https://ollama.ai
ollama pull llama3.2:3b
coba -p ollama -m llama3.2:3b
```

**With Google Gemini:**
```bash
export GOOGLE_API_KEY="your-key-here"
coba -p gemini -m gemini-2.5-pro
```

**With Anthropic Claude:**
```bash
export ANTHROPIC_API_KEY="your-key-here"
coba -p anthropic -m claude-sonnet-4-20250514
```

---

## 🎯 What Can Code Bandit Do?

### 🔍 **Code Analysis & Exploration**
```
You: "What's the architecture of this project?"
You: "Find all TODO comments"
You: "Explain this complex function in simple terms"
```

### ✏️ **Smart Code Generation**
```
You: "Add TypeScript types to this JavaScript file"
You: "Generate unit tests for the user service"
You: "Create a README for this component"
```

### 🔧 **Refactoring & Cleanup**
```
You: "Extract this logic into a reusable utility"
You: "Remove unused imports from all files"
You: "Convert this callback to async/await"
```

### 🚀 **Project Setup & Tooling**
```
You: "Set up ESLint with TypeScript"
You: "Add a pre-commit hook for formatting"
You: "Configure Jest for testing"
```

### 📝 **Git & Documentation**
```bash
# One-shot commit message generation
echo "Brief context about changes" | coba exec "Generate a conventional commit message" -o -

# Interactive documentation help
You: "Update the API documentation for the new endpoints"
You: "Generate a changelog from recent commits"
```

---

## 🎛️ Command Options

### Commands

- `coba` or `coba chat [options]` — Start an interactive chat session (default command)
- `coba exec <message...> [options]` — Run a one-off, non-interactive request
- `coba install-extension [--tag <tag>]` — Install the official VS Code extension

### Global/chat options

| Option | Description | Default / Examples |
|--------|-------------|--------------------|
| `-p, --provider <provider>` | Model provider to use | env: `CODE_BANDIT_PROVIDER` (e.g. `ollama`, `openai`, `anthropic`, `gemini`) |
| `-m, --model <model>` | Model identifier | env: `CODE_BANDIT_MODEL` (e.g. `gpt-5`, `gpt-oss`, `claude-sonnet-4-20250514`) |
| `-u, --api-url <url>` | API base URL for provider | e.g. self-hosted endpoint |
| `-k, --api-key <key>` | API key passed to the provider | Your API key |
| `--context-size <size>` | Max context window (tokens) used for chat history | Default: `8192` for `ollama`, provider default otherwise |
| `--max-messages <count>` | Max number of messages to retain in history | Default: `10` |
| `-R, --repo-path <path>` | Git repository directory to work in | Default: `.` |
| `--read-only` | Use read-only tool mode (no file changes) | Safe exploration |
| `--write-mode` | Enable YOLO write mode for tools (destructive) | Use with caution |
| `--no-agent-rules` | Disable loading of AGENTS.md, .cursorrules, etc. | — |
| `--debug` | Show debug information | — |

### Chat-only options

| Option | Description |
|--------|-------------|
| `-C, --continue-session <filename>` | Continue with a previous session file |
| `--start-message <message>` | Start the chat by sending an initial message |
| `--no-stream` | Disable streaming responses |

### Exec-only options

| Option | Description |
|--------|-------------|
| `-o <file>` | Write the model's final text output to a file (`-` for stdout) |

**Notes:**
- `exec` also reads from stdin and appends it to the message. Example: `echo "extra context" | coba exec "Summarize this" -p openai -m gpt-4o`.
- Environment variables `CODE_BANDIT_PROVIDER` and `CODE_BANDIT_MODEL` can be used to set default provider/model.

### VS Code extension

| Command | Description |
|---------|-------------|
| `coba install-extension --tag <tag>` | Download and install the official VS Code extension. Use `--tag vX.Y.Z` for a specific version or omit for `latest`. Requires the `code` CLI in PATH. |

**Extension Features:**
- **Smart Commit Messages**: Auto-generate conventional commit messages from your staged changes
- **Keyboard Shortcut**: `Ctrl+Alt+C` (Windows/Linux) or `Cmd+Alt+C` (Mac)
- **Configurable Models**: Choose your preferred AI model for commit generation

---

## 🔒 Safety First

Code Bandit is designed with safety in mind:

### 🛡️ **Three Safety Modes**

- **`confirm` (Default)** — Asks permission before any file changes
- **`read-only`** — Pure analysis mode, no modifications allowed  
- **`yolo`** — Full automation mode (use in git repositories!)

### 🐳 **Docker Sandboxing**
- All shell commands run in isolated Docker containers, protecting your system from potentially harmful operations.

### 📋 **Always Available Tools**
- `list-directory` — Browse project structure
- `read-file` — Examine file contents  
- `find-files` — Search by patterns (`**/*.ts`, `src/**/*.js`)
- `search-in-files` — Find text across your codebase
- `git-diff` — View git changes
- `git-log` — Check commit history
- `copy-to-clipboard` — Copy content for external use

### ⚡ **Write Mode Tools** *(requires `--write-mode`)*
- `write-file` — Create or modify files
- `delete-file` — Remove files permanently  
- `move-file` — Rename or relocate files
- `create-directory` — Create new folders
- `execute-command` — Run shell commands

### 🎯 **Best Practices**
- **Always use git**: Work in git repositories so you can easily review and revert changes
- **Review changes**: Use `git diff` to review all modifications before committing
- **Session continuity**: Use `--continue-session` to maintain context across multiple interactions

---

## 🏗️ Built With Modern Tech

- **🔥 TypeScript** — Type-safe development experience
- **⚛️ Ink + React** — Beautiful, responsive terminal UI
- **🦜 LangChain.js** — Multi-provider AI integration with tool calling
- **⚡ ESBuild** — Lightning-fast builds and bundling
- **🎯 Commander.js** — Robust CLI argument parsing
- **📱 VS Code API** — Native editor integration

---

## 🤝 Contributing

We love contributions! Code Bandit is actively developed and there's exciting work ahead.

```bash
git clone https://github.com/janole/code-bandit.git
cd code-bandit
npm install
npm run dev
```

Check out our [development guide](AGENTS.md) for more details.

---

## 📈 Project Status

🚧 **Alpha Release** — Code Bandit is experimental but rapidly evolving. We recommend using it in git repositories so you can easily review and revert changes.

**Recent Additions:**
- 🎯 VS Code extension with smart commit messages
- 📝 Comprehensive command options and session management  
- 🔧 Enhanced tool safety and file system operations
- 📊 Multiple output formats and stdin support
- 🌐 Expanded AI provider support

**Roadmap:**
- 🌐 Web interface and dashboard
- 🔌 Plugin ecosystem for custom tools
- 📱 Mobile companion app
- 🤖 Advanced code understanding and suggestions

---

## 📄 License

MIT © [Jan Ole Suhr](https://janole.com)

---

<div align="center">

**⭐ Star us on GitHub if Code Bandit makes your coding life easier!**

[🛠️ Report Issues](https://github.com/janole/code-bandit/issues) • [💬 Discussions](https://github.com/janole/code-bandit/discussions) • [📚 Wiki](https://github.com/janole/code-bandit/wiki)

</div>

<!-- This file was initially generated by the AI agent claude-sonnet-4-20250514. -->
