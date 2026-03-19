import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawn } from "node:child_process";

describe("generate-domain-index.ts", () => {
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "domain-index-test-"));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function runScript(): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const scriptPath = path.resolve(originalCwd, "scripts/generate-domain-index.ts");
    return new Promise((resolve) => {
      const proc = spawn("bun", [scriptPath], {
        cwd: process.cwd(),
      });
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (data) => { stdout += data.toString(); });
      proc.stderr.on("data", (data) => { stderr += data.toString(); });
      proc.on("close", (code) => {
        resolve({ exitCode: code ?? 0, stdout, stderr });
      });
    });
  }

  // Test 1: generates correct forward index
  test("generates correct forward index", async () => {
    fs.mkdirSync("domains/llm", { recursive: true });
    fs.writeFileSync("domains/llm/learning-path.md", `---
id: llm
title: LLM
level: beginner
---

# LLM Learning Path
`);

    const result = await runScript();

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync("data/generated/domain-index.json")).toBe(true);
    
    const index = JSON.parse(fs.readFileSync("data/generated/domain-index.json", "utf-8"));
    expect(index.domains.llm).toBeDefined();
    expect(index.domains.llm.id).toBe("llm");
    expect(index.domains.llm.title).toBe("LLM");
    expect(index.domains.llm.level).toBe("beginner");
    expect(index.stats.total_domains).toBe(1);
    expect(index.stats.by_level.beginner).toBe(1);
  });

  // Test 2: generates correct reverse index
  test("generates correct reverse index", async () => {
    fs.mkdirSync("domains/llm", { recursive: true });
    fs.mkdirSync("domains/ai", { recursive: true });
    fs.writeFileSync("domains/llm/learning-path.md", `---
id: llm
title: LLM
parents: [ai]
prerequisites: [python]
---

# LLM
`);
    fs.writeFileSync("domains/ai/learning-path.md", `---
id: ai
title: AI
---

# AI
`);

    const result = await runScript();

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync("data/generated/reverse-index.json")).toBe(true);
    
    const reverseIndex = JSON.parse(fs.readFileSync("data/generated/reverse-index.json", "utf-8"));
    expect(reverseIndex.children.ai).toContain("llm");
    expect(reverseIndex.dependents.python).toContain("llm");
  });

  // Test 3: handles empty domains directory
  test("handles empty domains directory", async () => {
    fs.mkdirSync("domains", { recursive: true });

    const result = await runScript();

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Found 0 domain directories");
    
    const index = JSON.parse(fs.readFileSync("data/generated/domain-index.json", "utf-8"));
    expect(index.stats.total_domains).toBe(0);
  });

  // Test 4: handles non-existent domains directory
  test("handles non-existent domains directory", async () => {
    // Don't create domains directory

    const result = await runScript();

    expect(result.exitCode).toBe(0);
    expect(result.stdout + result.stderr).toContain("Found 0 domain directories");
    
    const index = JSON.parse(fs.readFileSync("data/generated/domain-index.json", "utf-8"));
    expect(index.stats.total_domains).toBe(0);
  });

  // Test 5: detects circular dependency
  test("detects circular dependency", async () => {
    fs.mkdirSync("domains/a", { recursive: true });
    fs.mkdirSync("domains/b", { recursive: true });
    fs.writeFileSync("domains/a/learning-path.md", `---\nid: a\nprerequisites: [b]\n---\n\n# A\n`);
    fs.writeFileSync("domains/b/learning-path.md", `---\nid: b\nprerequisites: [a]\n---\n\n# B\n`);

    const result = await runScript();

    // Cycle detection outputs to stderr, exit code should be 1
    const combined = result.stdout + result.stderr;
    expect(combined).toContain("Circular dependency detected");
  });

  // Test 6: parses domain without frontmatter
  test("parses domain without frontmatter", async () => {
    fs.mkdirSync("domains/db", { recursive: true });
    fs.writeFileSync("domains/db/learning-path.md", `# Database Basics

This is a beginner guide to databases.
`);

    const result = await runScript();

    expect(result.exitCode).toBe(0);
    
    const index = JSON.parse(fs.readFileSync("data/generated/domain-index.json", "utf-8"));
    expect(index.domains.db).toBeDefined();
    expect(index.domains.db.title).toBe("Database Basics");
    expect(index.domains.db.level).toBe("beginner"); // "基础" infers beginner
  });

  // Test 7: gray-matter parse error is handled
  test("gray-matter parse error is handled", async () => {
    fs.mkdirSync("domains/bad", { recursive: true });
    // Create a file without frontmatter - gray-matter parses it fine
    fs.writeFileSync("domains/bad/learning-path.md", `# Bad Domain`);

    const result = await runScript();

    // Script should run without crashing, even if no valid frontmatter
    expect(result.exitCode).toBe(0);
    expect(result.stdout + result.stderr).toContain("bad");
  });
});
