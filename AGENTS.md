# AGENTS.md - Survey Repository Guide

## Project Overview

Survey is a TypeScript + Bun repository for research-material workflows.
Primary areas:
- `scripts/` for automation and CLIs
- `data/` for registries and generated indexes
- `.opencode/skills/` for project-specific agent skills
- `github/`, `essay/`, `survey/`, `domains/` for generated outputs

## Instruction Files

Found during analysis:
- `AGENTS.md` at repo root - main repo instructions
- `.opencode/skills/README.md` - project skill documentation

Not found:
- `.cursor/rules/`
- `.cursorrules`
- `.github/copilot-instructions.md`
- `.clinerules`
- `.windsurfrules`

Do not assume Cursor or Copilot-specific rules exist here.

## Build / Run / Test Commands

The root `package.json` is minimal and does not define dedicated `build`, `lint`, or `typecheck` scripts.
Run Bun commands directly.

```bash
# Run a single test file
bun test scripts/lib/repo-registry.test.ts
bun test scripts/repo-cli.test.ts
bun test scripts/sync-repos.test.ts

# Run all repo-owned tests safely
bun test scripts/repo-cli.test.ts scripts/sync-repos.test.ts scripts/lib/repo-registry.test.ts

# Watch one test file
bun test --watch scripts/repo-cli.test.ts

# Repo sync
bun scripts/sync-repos.ts
bun scripts/sync-repos.ts --check
bun scripts/sync-repos.ts --clone
bun scripts/sync-repos.ts --pull
bun scripts/sync-repos.ts vercel/next.js
bun scripts/sync-repos.ts --verify
bun scripts/sync-repos.ts --verify-fix

# Repo registry CLI
bun scripts/repo-cli.ts list --json
bun scripts/repo-cli.ts get vercel/next.js --json
bun scripts/repo-cli.ts validate
bun scripts/repo-cli.ts repair

# Domain index generation
bun scripts/generate-domain-index.ts
```

### Test Guidance

- Do not use bare `bun test` as a default. It discovers tests inside cloned repos under `github/` and can fail for unrelated reasons.
- Prefer the smallest relevant test file first.
- When multiple local script files change, run the explicit `scripts/*.test.ts` file list.
- Validate command examples against real script entrypoints before finishing.

## Repository Structure

```text
.
|- .opencode/skills/        Project-specific OpenCode skills
|- data/                    Registry and generated data
|- docs/                    Documentation
|- domains/                 Domain learning-path outputs
|- essay/                   Paper reading outputs
|- research/                Generated research outputs (GitHub analysis reports)
|- sources/                 Cloned source repositories (GitHub projects)
|- scripts/                 TypeScript automation and colocated tests
|  |- lib/                  Shared script libraries
|- survey/                  Survey synthesis outputs
```

## Code Style Guidelines

These rules are based on observed patterns in `scripts/*.ts` and `scripts/lib/*.ts`.

### Imports

Group imports in this order:
1. `bun:test` imports in test files only
2. Node.js built-ins with `node:` prefix
3. Third-party packages
4. Local value imports
5. Local type imports via `import type`

### Formatting

- Use 2-space indentation.
- Use double quotes unless a template string is clearer.
- Keep semicolons.
- Prefer readable wrapping over very long lines.
- Add spaces between Chinese and English in mixed text.

### Naming

- Interfaces and type aliases: `PascalCase`
- Functions and variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Files: `kebab-case`
- Tests: colocated `*.test.ts`

Examples seen in the repo:
- `RepoRegistry`
- `fixOrphanedRepos`
- `LEVELS`
- `repo-registry.ts`

### Types

- Use `interface` for structured object shapes.
- Use `type` for unions and string literal sets.
- Prefer explicit optional fields over loose dictionaries.
- Avoid `any`.
- Use `string | null` only when null is part of the data model.

Typical example:
- `export type RepoLevel = "beginner" | "intermediate" | "advanced" | "expert";`
- `last_commit?: string | null`

### Error Handling

- Throw explicit, actionable errors.
- Use `catch` without a variable only when intentionally ignoring an expected failure.
- Keep fallback behavior obvious when ignoring an error.
- Prefer validation helpers over scattered ad-hoc checks.

Typical pattern:
- `throw new Error(\`Failed to read registry: ${error}\`)`

## Testing Conventions

- Use Bun's built-in test runner from `bun:test`.
- Group tests with `describe(...)` and name `test(...)` by concrete behavior.
- Use temp directories plus `process.chdir(...)` for filesystem isolation.
- Clean up with `fs.rmSync(..., { recursive: true, force: true })` in `afterEach(...)`.
- Use `mock.restore()` when spies or mocks are involved.

## Script and Data Rules

- Run scripts directly with `bun scripts/<name>.ts`.
- For registry changes, use `scripts/lib/repo-registry.ts` or `scripts/repo-cli.ts`.
- Do not rewrite `data/repos.json` with ad-hoc JSON logic when shared helpers exist.
- Keep registry IDs in `owner/repo` format.
- Preserve atomic write behavior for registry persistence.
- Preserve existing Chinese documentation tone.
- Do not commit secrets.
- Archive outdated materials into `archive/` instead of deleting casually.

## Commit Conventions

Use `type(scope): subject`.

Common scopes: `scripts`, `skills`, `data`, `survey`, `essay`, `github`
Common types: `feat`, `fix`, `docs`, `refactor`, `chore`

## Agent Checklist

Before finishing work:
- Re-run the smallest relevant local test file.
- If multiple script files changed, run the explicit `scripts/*.test.ts` list.
- Verify any changed command examples still work.
- Keep docs aligned with the actual file layout and workflow.

## Research Repository Index

The repository maintains an auto-generated master index of all GitHub research artifacts:

- **Location**: `research/REPOSITORY_INDEX.md`
- **Total Repositories**: 21 (as of March 2026)
- **Categories**: Core Learning (5), LLM Training (4), RAG Systems (2), Vector DB (3), Fine-tuning (3), Advanced LLM (3), Frameworks (3)

Each research entry includes:
- `README.md` - Comprehensive project analysis report
- `manifest.json` - Machine-readable metadata following `data/schemas/manifest.json` schema

### Manifest Schema

All research artifacts include a `manifest.json` with the following structure:
- `version` - Manifest schema version (semver)
- `kind` - Artifact type: `github-analysis`, `paper-notes`, `survey-synthesis`, `domain-exploration`
- `id` - Unique identifier (e.g., `owner/repo`)
- `source_type` - Origin: `github`, `arxiv`, `doi`, `manual`
- `upstream_url` - Link to original source
- `inputs` / `outputs` - File paths for reproducibility
- `generated_by` - Skill that created the artifact
- `created_at` / `updated_at` - ISO 8601 timestamps
- `language` - Content language: `zh`, `en`, `mixed`
- `tags` - Topic tags for categorization
