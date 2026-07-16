# Code Bandit

Your coding-focused entry point for Boba.

Code Bandit 2.0 keeps the familiar `coba` command while delegating the agent
runtime, tools, approvals, sessions, providers, and terminal UI to
[`@janole/boba`](https://www.npmjs.com/package/@janole/boba).

## Install

```bash
npm install -g @janole/code-bandit
coba
```

On first run, Code Bandit shows the minimal Boba profile and authentication
steps. Code Bandit owns an application home that is fully independent from
Boba:

- config: `~/.code-bandit/config.yaml`
- sessions: `~/.code-bandit/sessions/`
- auth, docs, extensions, skills, generated images, and state:
  `~/.code-bandit/`
- daemon socket: `~/.code-bandit/daemon.sock`
- tmux session namespace: `coba-`

Code Bandit never discovers project-local Boba configs and never reads or
writes `~/.botbandit`.

## Commands

```bash
coba                         # interactive terminal UI
coba daemon                  # start the Code Bandit daemon
coba run "Explain this repo" # one prompt
coba resume <session-id>     # continue a session
coba auth login openai-codex # authenticate a provider
coba onboard                 # show setup instructions
coba --help                  # Code Bandit quick reference
```

All commands not owned by the onboarding layer are passed directly to Boba.

To use daemon mode, add this to `~/.code-bandit/config.yaml`:

```yaml
service:
  enabled: true
```

Then run `coba daemon`. Other Code Bandit commands wait briefly for that daemon
and fail clearly when it is unavailable; they never fall back to a local
runtime against the same session store.

## Migrating from 1.x

- `coba run "…"` replaces `coba exec "…"`.
- `-p` selects a Boba profile, not a provider.
- Provider and model selection live in `~/.code-bandit/config.yaml` and the TUI.
- Code Bandit 2.0 cannot read the old `~/.code-bandit/sessions/*.json` format.
  When legacy sessions are detected, startup stops with a non-destructive
  archive command. Nothing is moved or deleted automatically.
- The old LangChain library exports and VS Code extension are not part of Code
  Bandit 2.0. They remain available from the 1.x Git tags.

## License

The Code Bandit wrapper is MIT licensed. Its Boba dependency is distributed
under FSL-1.1-ALv2; see the Boba package for its license terms.

## Publishing the CLI

The private workspace root and `@code-bandit/core` are not published. The
publishable, self-contained package lives in `packages/cli`; tsup bundles the
workspace core while keeping `@janole/boba` as its single runtime dependency.

```bash
pnpm run ok
cd packages/cli
npm pack --dry-run
npm publish
```

Both `prepack` and `prepublishOnly` rebuild the workspace to prevent stale
artifacts from being published.
