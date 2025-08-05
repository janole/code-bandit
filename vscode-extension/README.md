# Code Bandit (VS Code Extension)

This is the companion VS Code extension for Code Bandit. Code Bandit itself is currently a CLI tool, and this extension is a **work in progress** that exposes just one feature from the CLI today:

- AI-generated commit messages

Over time, this may evolve into (or be complemented by) a fully-featured VS Code *experience* ...

---

## Current Status

- **Alpha/Experimental**: this extension is early-stage and may change rapidly.
- **Work in progress**: the extension currently provides **only the AI-generated commit message feature**.
- Code Bandit’s primary interface today is the command-line (CLI).
- Additional in-editor AI features (code understanding, generation, refactoring, etc.) are planned but not yet implemented.

---

## Features (today)

- 🚀 **AI-Powered Git Commit Message Generation**  
  Automatically create relevant commit messages based on your **staged changes**.

## How To Use

1. Open the Source Control view (`Ctrl+Shift+G` or `Cmd+Shift+G`).
2. Stage your changes.
3. Click the ✨ "Code Bandit: Generate Commit Message" ✨ button either next to or above the commit input box.
4. Code Bandit uses AI to generate a suggested commit message, which you can review and edit.

## Requirements

- **VS Code v1.102.0** or newer is required, as the special commit message button uses recent extension APIs.

## Provider Configuration (Environment Variables)

This extension follows LangChain.js conventions for provider credentials. Set the appropriate environment variables for the model provider you choose. Common examples:

- OpenAI: `OPENAI_API_KEY`
- Anthropic: `ANTHROPIC_API_KEY`
- OpenRouter: `OPENROUTER_API_KEY`
- Google Gemini: `GOOGLE_API_KEY`
- Groq: `GROQ_API_KEY`

Make sure these variables are available in the VS Code environment (e.g., your shell profile or system environment) before launching VS Code. If you change them, fully restart VS Code so the extension can pick them up.

## Extension Settings

This extension contributes the following settings:

- `codeBandit.aI.models.gitCommit`:  
  *(string)*  
  The Large Language Model provider/model used for commit message generation.  
  _Example:_ `"openai/gpt-4.1-mini"`

More settings may be added as the extension evolves.

## Known Issues

- Configuration of AI providers is cumbersome ...

## Release Notes

### 0.3.5

- Initial release: AI-powered commit message generation for Git in VS Code.

---

## Contributing

Contributions are welcome. This extension is early-stage; please open issues or PRs with suggestions as we shape the path from the CLI toward a richer VS Code integration.

---

Thanks for trying **Code Bandit**!