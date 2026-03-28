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
      outputs: ["README.md"],
      generated_by: "test",
      created_at: "2026-03-19T10:00:00Z",
      updated_at: "2026-03-19T10:00:00Z",
    };
  }

  function createValidGithubIndex(): object {
    return {
      version: "1.0",
      generated_at: new Date().toISOString(),
      repositories: [],
    };
  }

  function createValidDomainIndex(): object {
    return {
      version: "1.0",
      generated_at: new Date().toISOString(),
      domains: {},
      aliases: {},
      stats: { total_domains: 0, by_level: { beginner: 0, intermediate: 0, advanced: 0 } },
    };
  }

  function createTestEnv(repos: { id: string }[], researchRepos: string[], options?: {
    withReadme?: boolean;
    withManifest?: boolean;
    withSource?: boolean;
    missingOutputs?: string[];
  }) {
    const opts = { withReadme: true, withManifest: true, withSource: false, missingOutputs: [], ...options };

    fs.mkdirSync("data", { recursive: true });
    fs.writeFileSync("data/repos.json", JSON.stringify({ repos }));

    for (const repoId of researchRepos) {
      const [owner, repo] = repoId.split("/");
      const researchPath = path.join("research/github", owner, repo);
      fs.mkdirSync(researchPath, { recursive: true });

      if (opts.withReadme) {
        fs.writeFileSync(path.join(researchPath, "README.md"), "# Test");
      }

      if (opts.withManifest) {
        const manifest = createValidManifest(repoId);
        if (opts.missingOutputs && opts.missingOutputs.length > 0) {
          (manifest as { outputs: string[] }).outputs = opts.missingOutputs;
        }
        fs.writeFileSync(path.join(researchPath, "manifest.json"), JSON.stringify(manifest));
      }

      if (opts.withSource) {
        const sourcePath = path.join("sources/github", owner, repo);
        fs.mkdirSync(sourcePath, { recursive: true });
        fs.writeFileSync(path.join(sourcePath, "README.md"), "# Source");
      }
    }

    fs.mkdirSync("data/generated", { recursive: true });
    fs.writeFileSync("data/generated/github-index.json", JSON.stringify(createValidGithubIndex()));
    fs.writeFileSync("data/generated/domain-index.json", JSON.stringify(createValidDomainIndex()));
  }

  // Test 1: in-sync registry and research with all indexes
  test("in-sync registry and research with all indexes", async () => {
    createTestEnv([{ id: "owner/repo" }], ["owner/repo"], { withSource: true });
    const result = await runScript();
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Overall: ✅ All checks passed");
  });

  // Test 2: orphaned registry entry
  test("orphaned registry entry", async () => {
    createTestEnv([{ id: "ghost/repo" }], [], { withReadme: false, withManifest: false });
    const result = await runScript();
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("ghost/repo");
    expect(result.stdout).toContain("1️⃣");
  });

  // Test 3: orphaned research entry
  test("orphaned research entry", async () => {
    createTestEnv([], ["orphan/repo"], { withSource: true });
    const result = await runScript();
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("orphan/repo");
    expect(result.stdout).toContain("1️⃣");
  });

  // Test 4: missing README with valid manifest
  test("missing README with valid manifest", async () => {
    createTestEnv([{ id: "test/repo" }], ["test/repo"], { withReadme: false, withSource: true });
    const result = await runScript();
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Missing README.md");
    expect(result.stdout).toContain("test/repo");
  });

  // Test 5: missing manifest with valid README
  test("missing manifest with valid README", async () => {
    createTestEnv([{ id: "test/repo" }], ["test/repo"], { withManifest: false, withSource: true });
    const result = await runScript();
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Missing manifest");
    expect(result.stdout).toContain("test/repo");
  });

  // Test 6: invalid manifest JSON
  test("invalid manifest JSON", async () => {
    createTestEnv([{ id: "test/repo" }], ["test/repo"], { withSource: true });
    fs.writeFileSync("research/github/test/repo/manifest.json", "{ broken");
    const result = await runScript();
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("1 invalid");
  });

  // Test 7: --fix flag outputs no-op message
  test("--fix flag outputs no-op message", async () => {
    createTestEnv([{ id: "ghost/repo" }], [], { withReadme: false, withManifest: false });
    const result = await runScript(["--fix"]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Fix mode is enabled but not yet implemented");
  });

  // Test 8: missing source clone is reported
  test("missing source clone is reported", async () => {
    createTestEnv([{ id: "test/repo" }], ["test/repo"], { withSource: false });
    const result = await runScript();
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("2️⃣  Registry → Source Clone");
    expect(result.stdout).toContain("Repos cloned: 0");
  });

  // Test 9: missing outputs from manifest are reported
  test("missing outputs from manifest are reported", async () => {
    createTestEnv([{ id: "test/repo" }], ["test/repo"], {
      withSource: true,
      missingOutputs: ["README.md", "missing-file.md"],
    });
    const result = await runScript();
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("missing-file.md");
    expect(result.stdout).toContain("3️⃣  Research → Manifests");
  });

  // Test 10: missing index files are reported
  test("missing index files are reported", async () => {
    createTestEnv([{ id: "owner/repo" }], ["owner/repo"], { withSource: true });
    fs.rmSync("data/generated", { recursive: true, force: true });
    const result = await runScript();
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("4️⃣  Manifests → Indexes");
    expect(result.stdout).toContain("Missing: data/generated/github-index.json");
  });
});
