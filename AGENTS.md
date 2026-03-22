# AGENTS.md - Survey Repository Guide

## Project Overview

Survey is a TypeScript + Bun repository for research-material workflows.
- `scripts/` for automation and CLIs
- `data/` for registries and generated indexes
- `.opencode/skills/` for project-specific agent skills
- `github/`, `paper/`, `survey/`, `domains/` for generated outputs

## Build / Run / Test Commands

Run Bun commands directly. The root `package.json` is minimal.

```bash
# Run a single test file (PREFERRED)
bun test scripts/lib/repo-registry.test.ts
bun test scripts/lib/github-repos.test.ts
bun test scripts/repo-cli.test.ts

# Run all repo-owned tests explicitly (avoid bare bun test)
bun test scripts/repo-cli.test.ts scripts/sync-repos.test.ts scripts/lib/repo-registry.test.ts scripts/synthesis-lib.test.ts

# Watch mode for development
bun test --watch scripts/repo-cli.test.ts

# CLI scripts
bun scripts/sync-repos.ts --check
bun scripts/sync-repos.ts --clone
bun scripts/sync-repos.ts --pull
bun scripts/sync-repos.ts vercel/next.js

bun scripts/repo-cli.ts list --json
bun scripts/repo-cli.ts get vercel/next.js --json
bun scripts/repo-cli.ts validate

bun scripts/test-synthesis.ts --list-sources
bun scripts/test-synthesis.ts --topic "LLM" --json
bun scripts/test-synthesis.ts --validate-manifests

bun scripts/generate-domain-index.ts
```

**Important:** **NEVER use bare `bun test`** — it discovers tests inside cloned repos under `github/` and fails for unrelated reasons. Always specify explicit test file paths.

## Repository Structure

```
./
├── .opencode/skills/        # Project-specific OpenCode skills
├── data/                    # Registry and generated data
├── docs/                    # Documentation
├── domains/                 # Domain learning-path outputs
├── paper/                   # Paper reading outputs
├── research/                # Generated research reports
│   └── github/             # GitHub project analyses
├── sources/                 # Cloned source repositories
├── scripts/                 # TypeScript automation and tests
│   ├── lib/                # Shared script libraries
│   └── *.ts                # Entry point scripts
└── survey/                  # Survey synthesis outputs
```

## Code Style Guidelines

### Imports
Group imports in order: 1) `bun:test` 2) `node:` built-ins 3) third-party 4) local values 5) local types

```typescript
import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import { something } from "./lib/something";
import type { SomeType } from "./lib/types";
```

### Formatting
- 2-space indentation, double quotes, semicolons
- Add spaces between Chinese and English in mixed text

### Naming
- Interfaces/types: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Files: `kebab-case`

### Types
- Use `interface` for structured objects, `type` for unions
- Avoid `any` — use proper typing
- Use `string | null` only when null is part of the data model

### Error Handling
```typescript
// Good
throw new Error(`Failed to read registry: ${error}`);

// Ignoring expected failure
try { something(); } catch { /* Intentionally ignored */ }
```

## Testing Conventions
- Use Bun's `bun:test`
- Group with `describe(...)`, name `test(...)` by concrete behavior
- Use temp directories + `process.chdir()` for filesystem isolation
- Clean up with `fs.rmSync(..., { recursive: true, force: true })` in `afterEach()`
- Use `mock.restore()` when spies/mocks involved

## Script and Data Rules
- Run scripts with `bun scripts/<name>.ts`
- For registry changes, use `scripts/lib/repo-registry.ts` or `scripts/repo-cli.ts`
- Do not rewrite `data/repos.json` with ad-hoc JSON logic
- Keep registry IDs in `owner/repo` format
- Do not commit secrets

## Commit Conventions
`type(scope): subject` format.
Scopes: `scripts`, `skills`, `data`, `survey`, `paper`, `github`, `docs`
Types: `feat`, `fix`, `docs`, `refactor`, `chore`

## OpenCode Skills

| Skill | Use when | Output |
|-------|----------|--------|
| `github-researcher` | Analyze GitHub repos | `research/github/{owner}/{repo}/` |
| `paper-reader` | Read papers | `paper/{id}/` |
| `survey-synthesizer` | Compare projects | `survey/{topic}/` |
| `repo-manager` | Sync registries | `data/repos.json` |
| `domain-explorer` | Learning paths | `domains/{domain}/` |

## Manifest Schema

Research artifacts use `manifest.json`:
- `version` — Schema version (semver)
- `kind` — Artifact type: `github-analysis`, `paper-notes`, `survey-synthesis`
- `id` — Unique identifier
- `source_type` — Origin: `github`, `arxiv`, `doi`, `manual`
- `upstream_url` — Link to original source
- `created_at` / `updated_at` — ISO 8601 timestamps

## Environment Variables

| Variable | Purpose |
|----------|---------|
| GITHUB_TOKEN | GitHub API auth (60 req/hr free, 5000/hr authenticated) |
| SEMANTIC_SCHOLAR_API_KEY | Paper metadata (100 req/5min free) |

## Verification Checklist

Before finishing any work:
1. Run relevant test file to verify correctness
2. If multiple script files changed, run the full explicit test list
3. Verify changed command examples still work
