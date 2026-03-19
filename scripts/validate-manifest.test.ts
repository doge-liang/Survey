import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawn } from "node:child_process";

describe("validate-manifest.ts", () => {
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-manifest-test-"));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function runScript(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const scriptPath = path.resolve(originalCwd, "scripts/validate-manifest.ts");
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


  // Test 1: validateSingleFile accepts valid manifest
  test("validateSingleFile accepts valid manifest", async () => {
    const manifest = {
      version: "1.0.0",
      kind: "github-analysis",
      id: "test/repo",
      source_type: "github",
      inputs: [],
      outputs: [],
      generated_by: "test",
      created_at: "2026-03-19T10:00:00Z",
      updated_at: "2026-03-19T10:00:00Z",
    };
    fs.mkdirSync("testdir", { recursive: true });
    fs.writeFileSync("testdir/manifest.json", JSON.stringify(manifest));

    const result = await runScript(["--file", "testdir/manifest.json"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("✅ Valid manifest");
  });

  // Test 2: validateSingleFile rejects invalid manifest
  test("validateSingleFile rejects invalid manifest", async () => {
    const manifest = {
      version: "1.0.0",
      generated_at: "2026-03-19T10:00:00Z",
      // missing required fields like source, inputs, outputs, metadata
    };
    fs.mkdirSync("testdir", { recursive: true });
    fs.writeFileSync("testdir/manifest.json", JSON.stringify(manifest));

    const result = await runScript(["--file", "testdir/manifest.json"]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout + result.stderr).toContain("❌ Invalid manifest");
  });

  // Test 3: validateSingleFile handles non-existent file
  test("validateSingleFile handles non-existent file", async () => {
    const result = await runScript(["--file", "nonexistent/manifest.json"]);
    // Bun.file() returns empty content for non-existent files
    expect(result.exitCode).toBe(0);
  });

  // Test 4: validateSingleFile handles malformed JSON
  test("validateSingleFile handles malformed JSON", async () => {
    fs.mkdirSync("testdir", { recursive: true });
    fs.writeFileSync("testdir/manifest.json", "{ broken json");

    const result = await runScript(["--file", "testdir/manifest.json"]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout + result.stderr).toContain("Failed to validate");
  });

  // Test 5: validateAll handles non-existent research directory
  test("validateAll handles non-existent research directory", async () => {
    const result = await runScript(["--all"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("does not exist yet");
  });

  // Test 6: validateAll reports valid and invalid manifests
  test("validateAll reports valid and invalid manifests", async () => {
    // Valid manifest
    const validManifest = {
      version: "1.0.0",
      kind: "github-analysis",
      id: "test/repo",
      source_type: "github",
      inputs: [],
      outputs: [],
      generated_by: "test",
      created_at: "2026-03-19T10:00:00Z",
      updated_at: "2026-03-19T10:00:00Z",
    };
    // Invalid manifest (missing required fields
    const invalidManifest = {
      version: "1.0.0",
    };

    fs.mkdirSync("research/github/owner/repo", { recursive: true });
    fs.mkdirSync("research/github/owner/repo2", { recursive: true });
    fs.writeFileSync("research/github/owner/repo/manifest.json", JSON.stringify(validManifest));
    fs.writeFileSync("research/github/owner/repo2/manifest.json", JSON.stringify(invalidManifest));

    const result = await runScript(["--all"]);

    expect(result.exitCode).toBe(1); // Should fail because one is invalid
    expect(result.stdout).toContain("Valid: 1");
    expect(result.stdout).toContain("Invalid: 1");
    expect(result.stdout).toContain("Total: 2");
  });

  // Test 7: validateAll handles empty research directory
  test("validateAll handles empty research directory", async () => {
    fs.mkdirSync("research/github", { recursive: true });

    const result = await runScript(["--all"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No manifests found");
  });
});
