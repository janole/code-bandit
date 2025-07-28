# 🏴‍☠️ Code Bandit

> **Your AI-powered codebase companion that speaks your language**

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
- 🔒 **Safe by default** — Built-in confirmation prompts and Docker sandboxing

**Perfect for:**
- 🧑‍💻 Developers exploring new codebases
- 🏗️ Code reviews and refactoring sessions  
- 📚 Learning from existing projects
- 🐛 Debugging and troubleshooting
- 📝 Documentation and analysis

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

### Quick Examples

**With OpenAI:**
```bash
# Set your API key
export OPENAI_API_KEY="your-key-here"
coba -p openai -m gpt-4-turbo
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

---

## 🎛️ Command Options

| Option | Description | Example |
|--------|-------------|---------|
| `-p, --provider` | Choose AI provider | `ollama`, `openai`, `anthropic`, `gemini`, `groq` |
| `-m, --model` | Select model | `gpt-4-turbo`, `llama3.2:3b`, `claude-3-5-sonnet` |
| `-k, --api-key` | API key for remote providers | Your API key |
| `-u, --api-url` | Custom API URL | For self-hosted models |
| `--max-messages` | Chat history limit | Default: 10 |
| `-C, --continue-session` | Resume previous chat | `--continue-session ./my-session.json` |
| `--read-only` | Safe mode (no file changes) | Perfect for exploration |
| `--write-mode` | Full access mode | ⚠️ Use with caution! |

---

## 🔒 Safety First

Code Bandit is designed with safety in mind:

### 🛡️ **Three Safety Modes**

- **`confirm` (Default)** — Asks permission before any file changes
- **`read-only`** — Pure analysis mode, no modifications allowed  
- **`yolo`** — Full automation mode (use in git repositories!)

### 🐳 **Docker Sandboxing**
All shell commands run in isolated Docker containers, protecting your system from potentially harmful operations.

### 📋 **Always Available Tools**
- `listDirectory` — Browse project structure
- `readFile` — Examine file contents
- `findFiles` — Search by patterns (`**/*.ts`, `src/**/*.js`)
- `searchInFiles` — Find text across your codebase
- `executeCommandReadOnly` — Safe commands (`git status`, `npm test`)

### ⚠️ **Destructive Tools** *(with confirmation)*
- `writeFile` — Create or modify files
- `deleteFile` — Remove files permanently
- `moveFile` — Rename or relocate files
- `createDirectory` — Create new folders
- `executeCommand` — Run any shell command

---

## 🏗️ Built With Modern Tech

- **🔥 TypeScript** — Type-safe development
- **⚛️ Ink + React** — Beautiful terminal UI
- **🦜 LangChain.js** — Multi-provider AI integration
- **🐳 Docker** — Secure command execution
- **⚡ ESBuild** — Lightning-fast builds

---

## 🤝 Contributing

We love contributions! Code Bandit is in active development and there's lots of exciting work ahead.

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

**Coming Soon:**
- 🌐 Web interface
- 📱 Mobile companion app
- 🔌 Plugin ecosystem
- 📊 Analytics dashboard

---

## 📄 License

MIT © [Jan Ole Suhr](https://janole.com)

---

<div align="center">

**⭐ Star us on GitHub if Code Bandit makes your coding life easier!**

[🛠️ Report Issues](https://github.com/janole/code-bandit/issues) • [💬 Discussions](https://github.com/janole/code-bandit/discussions) • [📚 Wiki](https://github.com/janole/code-bandit/wiki)

</div>

<!-- This file was initially generated by the AI agent claude-sonnet-4-20250514. -->
