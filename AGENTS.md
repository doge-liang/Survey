# AGENTS.md - Survey Repository Guide

## Project Overview

TypeScript + Bun repository for research-material workflows.

| Directory | Purpose |
|-----------|---------|
| `scripts/` | Automation and CLIs |
| `data/` | Registries and generated indexes |
| `.opencode/skills/` | Project-specific agent skills |
| `research/` | Generated outputs (papers, github, surveys, domains) |
| `sources/` | Cloned source repositories |

## Build / Test Commands

```bash
# Run a single test file (PREFERRED)
bun test scripts/lib/repo-registry.test.ts

# Run all repo-owned tests (NEVER use bare bun test)
bun test scripts/**/*.test.ts

# Watch mode
bun test --watch scripts/repo-cli.test.ts

# Verification
bun scripts/verify-research-integrity.ts
bun scripts/validate-manifest.ts --all
bun scripts/project-paths.ts --json
npm run verify:all
```

**Critical:** Never use bare `bun test` — it discovers tests inside `sources/` and fails.

## Key Scripts

```bash
# Repository management
bun scripts/sync-repos.ts                    # sync all repos (clone or pull)
bun scripts/sync-repos.ts <owner/repo>       # sync single repo
bun scripts/sync-repos.ts --check            # check for updates
bun scripts/sync-repos.ts --verify           # verify registry integrity
bun scripts/sync-repos.ts --verify-fix       # auto-clone orphaned repos
bun scripts/sync-repos.ts --update-registry  # check for repo renames
bun scripts/sync-repos.ts --update-registry --rename-dirs  # also rename local dirs
bun scripts/repo-cli.ts list                 # list repos in registry
bun scripts/repo-cli.ts add <owner/repo>     # add to registry
bun scripts/repo-cli.ts update <owner/repo> --level beginner --tags "ai,llm"
bun scripts/repo-cli.ts remove <owner/repo>  # remove from registry
bun scripts/repo-cli.ts validate             # validate registry schema
bun scripts/repo-cli.ts repair               # normalize registry

# Index generation
bun scripts/generate-domain-index.ts         # domain index from frontmatter
bun scripts/generate-github-index.ts         # github index from README analyses

# Migrations
bun scripts/migrate-add-frontmatter.ts       # add frontmatter to research outputs

# Path resolution
bun scripts/project-paths.ts papers          # resolve a single path key
bun scripts/project-paths.ts --json          # output all paths as JSON
```

## Code Style Guidelines

### Imports (order)
1. `bun:test`
2. `node:` built-ins
3. third-party
4. local values
5. local types

```typescript
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { something } from "./lib/something";
import type { SomeType } from "./lib/types";
```

### Formatting & Naming
- 2-space indentation, double quotes, semicolons
- Max line length: 120 (soft)
- Interfaces/types: `PascalCase` | Functions/variables: `camelCase` | Constants: `SCREAMING_SNAKE_CASE` | Files: `kebab-case`

### Types
- Use `interface` for objects, `type` for unions
- Avoid `any` — use proper typing
- Use type guards for runtime validation

```typescript
function isRepo(value: unknown): value is Repo {
  return isObject(value) && typeof value.id === "string";
}
```

### Error Handling
- Throw descriptive errors with context: `throw new Error(\`Failed to read ${filePath}: ${error}\`)`
- Use type guards instead of catching type errors
- For expected failures: `try { something(); } catch { /* Intentionally ignored */ }`

### Async Patterns
- Use `async/await` over raw promises
- Handle errors with try/catch
- Use `Promise.all()` for parallel execution

## Testing Conventions

- Use temp directories + `process.chdir()` for filesystem isolation
- Call `setProjectRootForTesting(process.cwd())` after `chdir` if code under test uses `resolvePath()` / `getRegistriesPath()`
- Call `clearProjectRootOverride()` in `afterEach`
- Clean up in `afterEach()`: `fs.rmSync(dir, { recursive: true, force: true })`


## Path Resolution

Use `scripts/lib/project-paths.ts` for all path access:

```typescript
import { resolvePath, getGithubPath } from "./lib/project-paths";

const githubPath = resolvePath("github", "owner", "repo");
```

**Registered keys:** `papers`, `github`, `surveys`, `domains`, `registries`, `manifests`, `sources`

## Script & Data Rules

- Run scripts: `bun scripts/<name>.ts`
- Registry changes: use `scripts/lib/repo-registry.ts` or `scripts/repo-cli.ts`
- `data/repos.json` is a git-tracked symlink to `data/registries/repos.json` (may resolve as a regular file on some filesystems — edit `registries/repos.json` directly in that case)
- Keep registry IDs in `owner/repo` format
- Never commit secrets

## Commit Conventions

`type(scope): subject` format.

**Scopes:** `scripts`, `skills`, `data`, `survey`, `paper`, `github`, `docs`
**Types:** `feat`, `fix`, `docs`, `refactor`, `chore`

## OpenCode Skills

| Skill | Trigger | Output |
|-------|---------|--------|
| `github-researcher` | "research owner/repo", "analyze this GitHub project" | `research/github/{owner}/{repo}/` |
| `paper-reader` | "read this paper", "analyze this arxiv" | `research/papers/{id}/` |
| `survey-synthesizer` | "compare these", "synthesize survey" | `research/surveys/{topic}/` |
| `domain-explorer` | "explore domain", "learning path" | `research/domains/{domain}/` |
| `repo-manager` | "sync repos", "update repo" | `data/registries/repos.json` |
| `obsidian-vault` | "obsidian", "sync to obsidian", "daily note" | Obsidian vault files |
| `semantic-scholar-api` | academic paper search, citation analysis | API reference skill |

## Manifest Schema

Artifacts use `manifest.json` in their root directory:
- `version` — semver
- `kind` — `github-analysis`, `paper-notes`, `survey-synthesis`, `domain-exploration`
- `id` — unique identifier
- `source_type` — `github`, `arxiv`, `doi`, `manual`, `domain`, `mixed`
- `upstream_url` — link to original
- `created_at` / `updated_at` — ISO 8601

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `KIMI_API_KEY` | LLM analysis via Moonshot/Kimi API (see `github-index.config.json`) |
| `GITHUB_TOKEN` | GitHub API (60 → 5000 req/hr) |
| `SEMANTIC_SCHOLAR_API_KEY` | Paper metadata (100 → 5000 req/5min) |

## Verification Checklist

Before finishing any work:
1. Run relevant test file
2. Run full explicit test list if multiple files changed
3. Verify command examples still work
4. Run `bun scripts/project-paths.ts --json`
5. Run `npm run verify:all`
