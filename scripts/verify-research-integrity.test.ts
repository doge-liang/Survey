import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawn } from "node:child_process";

describe("verify-research-integrity.ts", () => {
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-integrity-test-"));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function runScript(args: string[] = []): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const scriptPath = path.resolve(originalCwd, "scripts/verify-research-integrity.ts");
    return new Promise((resolve) => {
      const proc = spawn("bun", [scriptPath, ...args], {
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

  function createValidManifest(id: string): object {
    return {
      version: "1.0.0",
      kind: "github-analysis",
      id,
      source_type: "github",
      inputs: [],
      outputs: [],
      generated_by: "test",
      created_at: "2026-03-19T10:00:00Z",
      updated_at: "2026-03-19T10:00:00Z",
    };
  }

  // Test 1: in-sync registry and research
  test("in-sync registry and research", async () => {
    const repos = [{ id: "owner/repo" }];
    fs.mkdirSync("data", { recursive: true });
    fs.writeFileSync("data/repos.json", JSON.stringify({ repos }));
    fs.mkdirSync("research/github/owner/repo", { recursive: true });
    fs.writeFileSync("research/github/owner/repo/README.md", "# Test");
    fs.writeFileSync("research/github/owner/repo/manifest.json", JSON.stringify(createValidManifest("owner/repo")));

    const result = await runScript();

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("All integrity checks passed");
  });

  // Test 2: orphaned registry entry
  test("orphaned registry entry", async () => {
    const repos = [{ id: "ghost/repo" }];
    fs.mkdirSync("data", { recursive: true });
    fs.writeFileSync("data/repos.json", JSON.stringify({ repos }));

    const result = await runScript();

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("ghost/repo");
    expect(result.stdout).toContain("Orphaned in registry");
  });

  // Test 3: orphaned research entry
  test("orphaned research entry", async () => {
    const repos: { id: string }[] = [];
    fs.mkdirSync("data", { recursive: true });
    fs.writeFileSync("data/repos.json", JSON.stringify({ repos }));
    fs.mkdirSync("research/github/orphan/repo", { recursive: true });
    fs.writeFileSync("research/github/orphan/repo/README.md", "# Test");
    fs.writeFileSync("research/github/orphan/repo/manifest.json", JSON.stringify(createValidManifest("orphan/repo")));

    const result = await runScript();

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("orphan/repo");
    expect(result.stdout).toContain("Orphaned in research");
  });

  // Test 4: missing README with valid manifest
  test("missing README with valid manifest", async () => {
    const repos = [{ id: "test/repo" }];
    fs.mkdirSync("data", { recursive: true });
    fs.writeFileSync("data/repos.json", JSON.stringify({ repos }));
    fs.mkdirSync("research/github/test/repo", { recursive: true });
    fs.writeFileSync("research/github/test/repo/manifest.json", JSON.stringify(createValidManifest("test/repo")));

    const result = await runScript();

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Missing README.md");
    expect(result.stdout).toContain("test/repo");
  });

  // Test 5: missing manifest with valid README
  test("missing manifest with valid README", async () => {
    const repos = [{ id: "test/repo" }];
    fs.mkdirSync("data", { recursive: true });
    fs.writeFileSync("data/repos.json", JSON.stringify({ repos }));
    fs.mkdirSync("research/github/test/repo", { recursive: true });
    fs.writeFileSync("research/github/test/repo/README.md", "# Test");

    const result = await runScript();

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Missing manifest.json");
    expect(result.stdout).toContain("test/repo");
  });

  // Test 6: invalid manifest JSON
  test("invalid manifest JSON", async () => {
    const repos = [{ id: "test/repo" }];
    fs.mkdirSync("data", { recursive: true });
    fs.writeFileSync("data/repos.json", JSON.stringify({ repos }));
    fs.mkdirSync("research/github/test/repo", { recursive: true });
    fs.writeFileSync("research/github/test/repo/README.md", "# Test");
    fs.writeFileSync("research/github/test/repo/manifest.json", "{ broken");

    const result = await runScript();

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Invalid manifests");
    expect(result.stdout).toContain("Parse error");
  });

  // Test 7: --fix flag outputs no-op message
  test("--fix flag outputs no-op message", async () => {
    const repos = [{ id: "ghost/repo" }];
    fs.mkdirSync("data", { recursive: true });
    fs.writeFileSync("data/repos.json", JSON.stringify({ repos }));

    const result = await runScript(["--fix"]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Fix mode is enabled but not yet implemented");
  });
});
