# Code Bandit

**Code Bandit** is your AI-powered coding companion for Visual Studio Code.  
Currently, Code Bandit jumpstarts your development workflow by generating intelligent, contextual Git commit messages with a single click. Future updates will expand Code Bandit’s AI capabilities to assist with code understanding, generation, and refactoring.

---

## Features

- 🚀 **AI-Powered Git Commit Message Generation**  
  Automatically create relevant commit messages based on your staged changes.  
  Just click the “wand” icon next to the Git commit input in the Source Control view.

## How To Use

1. Open the Source Control view (`Ctrl+Shift+G` or `Cmd+Shift+G`).
2. Stage your changes.
3. Click the ✨ "Auto-fill Commit Message" ✨ button either next to or above the commit input box.
4. Code Bandit uses AI to generate a suggested commit message, which you can review and edit.

## Requirements

- **VS Code v1.102.0** or newer is required, as the special commit message button uses recent extension APIs.

## Extension Settings

This extension contributes the following settings:

- `codeBandit.aI.models.gitCommit`:  
  *(string)*  
  The Large Language Model provider/model used for commit message generation.  
  _Example:_ `"openai/gpt-4.1-mini"`

*More AI-relevant settings will be added as the extension evolves.*

## Known Issues

- The commit input box button requires VS Code v1.102.0 or later.
- Only the AI commit message feature is currently available. More AI features are on the roadmap!

## Release Notes

### 0.0.1

- Initial release: AI-powered commit message generation for Git in VS Code.

---

## Contributing

Suggestions and pull requests are welcome as we build out Code Bandit into a full AI code assistant!

---

Enjoy using **Code Bandit**!
