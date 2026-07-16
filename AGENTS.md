# AGENTS.md

## Quality gate

Before finishing any change, run:

```bash
npm run ok
```

## Project overview

Code Bandit is a small Node wrapper around the published `@janole/boba` CLI.
It owns the `coba` command, Code Bandit onboarding, and migration-oriented help.
Boba owns the agent runtime, providers, tools, approvals, sessions, configuration,
and OpenTUI interface.

## Architecture guardrails

- Keep this package a facade. Do not recreate Boba runtime, tool, provider, or TUI logic here.
- Delegate through the supported `runBoba()` API from `@janole/boba`; do not resolve its platform packages directly.
- Preserve the real terminal streams. Capturing or proxying Boba output breaks interactive TUI behavior.
- Use Boba's existing `botbandit.config.yaml` and `~/.botbandit` state. Do not add parallel Code Bandit configuration or session storage.
- Keep onboarding safe: never overwrite an existing config automatically.

## Structure

- `src/coba.ts` — executable entrypoint and error boundary.
- `src/cli.ts` — pure onboarding/help/delegation routing.
- `test/cli.test.mjs` — black-box tests against the compiled router.

## Style

- TypeScript strict mode is authoritative.
- Follow ESLint: Allman braces, 4-space indentation, double quotes, semicolons, and sorted imports.
- Add concise JSDoc to exported functions and types unless the name is fully self-explanatory.
- Keep modules small and explicit; avoid speculative compatibility layers.
