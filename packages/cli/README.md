# Code Bandit

Code Bandit is a coding-focused entry point for the Boba agent CLI. It keeps
the familiar `coba` command while delegating the runtime, tools, approvals,
sessions, providers, and terminal UI to `@janole/boba`.

```bash
npm install -g @janole/code-bandit
coba
```

Until the independent Code Bandit home contract lands in Boba, this development
version uses Boba's current configuration and state paths. Do not publish it as
Code Bandit 2.0 with that temporary behavior.

See the repository README for commands and migration details.
