# Code Bandit

Code Bandit is a coding-focused entry point for the Boba agent CLI. It keeps
the familiar `coba` command while delegating the runtime, tools, approvals,
sessions, providers, and terminal UI to `@janole/boba`.

```bash
npm install -g @janole/code-bandit
coba
```

Code Bandit uses its own `~/.code-bandit` application home, including an
explicit `~/.code-bandit/config.yaml`, sessions, authentication, daemon socket,
documents, extensions, and generated state. It does not share `~/.botbandit`
with a regular Boba installation.

Legacy Code Bandit 1.x `sessions/*.json` files are detected before Boba starts.
The CLI prints a non-destructive archive command rather than mixing incompatible
session formats.

See the repository README for commands and migration details.
