# AGENTS.md - Survey Repository Guide

## Project Overview

Survey is a TypeScript + Bun repository for research-material workflows.
Primary areas:
- `scripts/` for automation and CLIs
- `data/` for registries and generated indexes
- `.opencode/skills/` for project-specific agent skills
- `github/`, `paper/`, `survey/`, `domains/` for generated outputs

## Build / Run / Test Commands

The root `package.json` is minimal. Run Bun commands directly.

```bash
# Run a single test file (PREFERRED)
bun test scripts/lib/repo-registry.test.ts
bun test scripts/repo-cli.test.ts
bun test scripts/sync-repos.test.ts
bun test scripts/synthesis-lib.test.ts

# Run all repo-owned tests explicitly (avoid bare bun test)
bun test scripts/repo-cli.test.ts scripts/sync-repos.test.ts scripts/lib/repo-registry.test.ts scripts/synthesis-lib.test.ts

# Watch mode for development
bun test --watch scripts/repo-cli.test.ts

# CLI scripts
bun scripts/sync-repos.ts --check
bun scripts/sync-repos.ts --clone
bun scripts/sync-repos.ts --pull
bun scripts/sync-repos.ts vercel/next.js
bun scripts/sync-repos.ts --verify
bun scripts/sync-repos.ts --verify-fix

bun scripts/repo-cli.ts list --json
bun scripts/repo-cli.ts get vercel/next.js --json
bun scripts/repo-cli.ts validate
bun scripts/repo-cli.ts repair

bun scripts/test-synthesis.ts --list-sources
bun scripts/test-synthesis.ts --topic "LLM" --json
bun scripts/test-synthesis.ts --validate-manifests
bun scripts/test-synthesis.ts --stats

bun scripts/generate-domain-index.ts
```

**Important Test Guidance:**
- **NEVER use bare `bun test`** — it discovers tests inside cloned repos under `github/` and fails for unrelated reasons
- Always specify explicit test file paths
- When multiple script files change, run the full explicit list
- Validate command examples against real script entrypoints before finishing

## Repository Structure

```
.
├── .opencode/skills/        # Project-specific OpenCode skills (SKILL.md files)
├── data/                    # Registry and generated data (repos.json, schemas/)
├── docs/                    # Documentation
├── domains/                 # Domain learning-path outputs
├── paper/                   # Paper reading outputs (paper/{id}/)
├── research/                # Generated research reports (research/github/{owner}/{repo}/)
│   └── github/             # GitHub project analyses
├── sources/                 # Cloned source repositories (GitHub projects)
├── scripts/                 # TypeScript automation and colocated tests
│   ├── lib/                # Shared script libraries (manifest.ts, repo-registry.ts)
│   ├── *.test.ts           # Colocated tests
│   └── *.ts                # Entry point scripts
└── survey/                  # Survey synthesis outputs (survey/{topic}/)
```

## Code Style Guidelines

### Imports

Group imports in this order:
1. `bun:test` imports in test files only
2. Node.js built-ins with `node:` prefix
3. Third-party packages
4. Local value imports
5. Local type imports via `import type`

Example:
```typescript
import { describe, test, expect, beforeEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { something } from "./lib/something";
import type { SomeType } from "./lib/types";
```

### Formatting
- Use 2-space indentation
- Use double quotes unless a template string is clearer
- Keep semicolons
- Prefer readable wrapping over very long lines
- Add spaces between Chinese and English in mixed text

### Naming
- Interfaces and type aliases: `PascalCase`
- Functions and variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Files: `kebab-case`
- Tests: colocated `*.test.ts`

Examples:
- Types/Interfaces: `RepoRegistry`, `SynthesisSource`
- Functions: `fixOrphanedRepos`, `buildSynthesisOutput`
- Constants: `REPO_LEVELS`, `MANIFEST_FILENAME`
- Files: `repo-registry.ts`, `synthesis-lib.ts`

### Types
- Use `interface` for structured object shapes
- Use `type` for unions and string literal sets
- Prefer explicit optional fields over loose dictionaries
- Avoid `any` — use proper typing
- Use `string | null` only when null is part of the data model

```typescript
// Good
export type RepoLevel = "beginner" | "intermediate" | "advanced" | "expert";
export interface Repo {
  id: string;
  stars?: number | null;
  last_commit?: string | null;
}

// Avoid
const data: any = fetchSomething();
```

### Error Handling
- Throw explicit, actionable errors with context
- Use `catch` without variable only when ignoring expected failures
- Keep fallback behavior obvious when ignoring errors
- Prefer validation helpers over scattered ad-hoc checks

```typescript
// Good
throw new Error(`Failed to read registry: ${error}`);

// Ignoring expected failure
try {
  something();
} catch {
  // Intentionally ignored
}
```

## Testing Conventions
- Use Bun's built-in test runner from `bun:test`
- Group tests with `describe(...)` and name `test(...)` by concrete behavior
- Use temp directories plus `process.chdir(...)` for filesystem isolation
- Clean up with `fs.rmSync(..., { recursive: true, force: true })` in `afterEach(...)`
- Use `mock.restore()` when spies or mocks are involved

```typescript
describe("some feature", () => {
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-"));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("does something", () => {
    // test code
  });
});
```

## Script and Data Rules
- Run scripts directly with `bun scripts/<name>.ts`
- For registry changes, use `scripts/lib/repo-registry.ts` or `scripts/repo-cli.ts`
- Do not rewrite `data/repos.json` with ad-hoc JSON logic — use shared helpers
- Keep registry IDs in `owner/repo` format
- Preserve atomic write behavior for registry persistence
- Preserve existing Chinese documentation tone
- Do not commit secrets
- Archive outdated materials into `archive/` instead of deleting casually

## Commit Conventions
Use `type(scope): subject` format.

Scopes: `scripts`, `skills`, `data`, `survey`, `paper`, `github`, `docs`
Types: `feat`, `fix`, `docs`, `refactor`, `chore`

## Agent Verification Checklist

Before finishing any work:
1. Run the smallest relevant test file to verify correctness
2. If multiple script files changed, run the explicit `scripts/*.test.ts` list
3. Verify changed command examples still work against real entrypoints
4. Keep docs aligned with actual file layout and workflow

## OpenCode Skills

Project-specific skills are in `.opencode/skills/{skill-name}/SKILL.md`:

```
## Project Skills

| Skill | Use when | Example prompts | Output |
|-------|----------|-----------------|--------|
| `github-researcher` | 调研单个 GitHub 仓库并生成结构化报告 | "analyze this GitHub project", "research owner/repo", "调研 GitHub 项目", "understand this codebase", "deep dive into", "技术栈分析" | `research/github/{owner}/{repo}/README.md` |
| `paper-reader` | 阅读 arXiv/DOI/论文标题并生成笔记、引用分析 | "read this paper", "analyze this arxiv", "论文阅读", "学术分析", "summarize this paper", "what is this paper about", "find related papers", "analyze citations" | `paper/{id}/` |
| `survey-synthesizer` | 比较多个项目/论文，生成综述和概念图 | "compare these", "对比分析", "synthesize survey", "调研合成", "knowledge graph", "知识图谱", "comparison report", "对比报告" | `survey/{topic}/` |
| `repo-manager` | 注册、同步、校验仓库源 | "sync all repos", "检查更新", "注册项目" | `data/repos.json`, `sources/` |
| `domain-explorer` | 探索新领域并生成学习路径 | "explore domain", "领域探索", "learning path", "学习路径", "入门指南", "get started with", "how to learn", "我想学", "新手入门", "roadmap for", "introduction to", "beginner guide" | `domains/{domain}/` |
```

Each skill has its own workflow and output conventions documented in its SKILL.md.

> **Note**: `semantic-scholar-api` is a low-level API tool, not shown in the table above.


## Key Patterns

### Manifest Schema
Research artifacts use `manifest.json` following `data/schemas/manifest.json`:
- `version` — Schema version (semver)
- `kind` — Artifact type: `github-analysis`, `paper-notes`, `survey-synthesis`, `domain-exploration`
- `id` — Unique identifier (e.g., `owner/repo`)
- `source_type` — Origin: `github`, `arxiv`, `doi`, `manual`
- `upstream_url` — Link to original source
- `created_at` / `updated_at` — ISO 8601 timestamps
- `language` — Content language: `zh`, `en`, `mixed`
- `tags` — Topic tags for categorization

### SynthesisOutput Schema
The synthesis system outputs:
```typescript
interface SynthesisOutput {
  topic: string;
  timestamp: string;
  sources: SynthesisSourceItem[];
  relationships: Relationship[];
  patterns?: Pattern[];
  comparison?: Comparison[];
  summary: string;
  warnings?: string[];
}
```

## Environment Variables

| Variable | Purpose | Free Limit | Authenticated |
|----------|---------|------------|---------------|
| GITHUB_TOKEN | GitHub API auth | 60 req/hr | 5000 req/hr |
| SEMANTIC_SCHOLAR_API_KEY | Paper metadata | 100 req/5min | 5000 req/5min |

## Instruction Files

Found in this repo:
- `AGENTS.md` at repo root — main repo instructions (this file)
- `.opencode/skills/README.md` — project skill documentation

No Cursor/Copilot-specific rules found in:
- `.cursor/rules/`, `.cursorrules`, `.cursorrules.md`
- `.github/copilot-instructions.md`
- `.clinerules`, `.windsurfrules`
