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
steps. The current wrapper still uses the same configuration and sessions as
Boba:

- `./botbandit.config.yaml` or `./botbandit.config.yml`
- `~/.botbandit/botbandit.config.yaml` or `~/.botbandit/botbandit.config.yml`
- `~/.botbandit/sessions/`

## Commands

```bash
coba                         # interactive terminal UI
coba run "Explain this repo" # one prompt
coba resume <session-id>     # continue a session
coba auth login openai-codex # authenticate a provider
coba onboard                 # show setup instructions
coba --help                  # Code Bandit quick reference
```

All commands not owned by the onboarding layer are passed directly to Boba.

> **2.0 development status:** the release target is a fully independent
> `~/.code-bandit` home. That requires a generic app-home contract in Boba and
> is intentionally not simulated in this wrapper. Do not publish Code Bandit
> 2.0 until that contract and the legacy-state migration gate are complete.

## Migrating from 1.x

- `coba run "…"` replaces `coba exec "…"`.
- `-p` selects a Boba profile, not a provider.
- Provider and model selection live in `botbandit.config.yaml` and the TUI.
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
