# AGENTS.md

## Quality Gate

Before finishing any code, package metadata, fixture, or behavior-affecting
change, run:

```bash
pnpm run ok  # => build + typecheck + lint:fix + test
```

For documentation-only changes, do not run the full gate by default.

## Package Overview

- `packages/core` - Code Bandit onboarding and Boba delegation routing.
- `packages/cli` - The published `@janole/code-bandit` package and `coba`
  executable over `@code-bandit/core` and `@janole/boba`.

## Architecture Guardrails

- Keep this package a facade. Do not recreate Boba runtime, tool, provider, or
  TUI logic here.
- Delegate through the supported `runBoba()` API from `@janole/boba`; do not
  resolve its platform packages directly.
- Preserve the real terminal streams. Capturing or proxying Boba output breaks
  interactive TUI behavior.
- Code Bandit's persistence target is exclusively `~/.code-bandit`. Select all
  Boba-owned paths through a supported launcher option; do not emulate Boba
  storage or patch its internals in this repository.
- Keep onboarding safe: never overwrite an existing config or delete legacy
  state automatically.
- Keep the CLI thin. Behavior belongs in `packages/core`; `packages/cli` should
  only wire core to Boba and provide the executable error boundary.
- Prefer additive linear commits; no rebases or amends unless explicitly asked.

## Style

- TypeScript strict mode is authoritative.
- Follow ESLint: Allman braces, sorted single-line imports, 4-space indentation,
  double quotes, and semicolons.
- Add or update tests when behavior changes.
- Add concise one-line JSDoc to exported functions, types, and classes unless
  the name is fully self-explanatory.
- Keep modules small and explicit; avoid speculative compatibility layers.
- Do not remove unrelated code or TODO comments.

## Documentation

- Keep committed documentation self-contained.
- When CLI flags or output behavior change, update the root and package README.
