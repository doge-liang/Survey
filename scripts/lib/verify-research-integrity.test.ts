import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  verifyResearchIntegrity,
  loadReposRegistry,
  scanResearchDirectory,
  validateManifest,
  type RepoEntry,
} from "./verify-research-integrity";

describe("verify-research-integrity", () => {
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

  function createStaleManifest(id: string): object {
    return {
      version: "0.9.0",
      kind: "github-analysis",
      id,
      source_type: "github",
      inputs: [],
      outputs: [],
      generated_by: "test",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
  }

  function createInvalidManifest(id: string): object {
    return {
      version: "1.0.0",
      kind: "invalid-kind",
      id,
      source_type: "github",
      inputs: [],
      outputs: [],
      generated_by: "test",
      created_at: "2026-03-19T10:00:00Z",
      updated_at: "2026-03-19T10:00:00Z",
    };
  }

  function createReposRegistry(repos: RepoEntry[]): void {
    fs.mkdirSync("data", { recursive: true });
    fs.writeFileSync("data/repos.json", JSON.stringify({ repos }));
  }

  function createResearchDir(repoId: string, manifest?: object, readme = "# Test Repo"): void {
    const [owner, repo] = repoId.split("/");
    const dir = path.join("research/github", owner, repo);
    fs.mkdirSync(dir, { recursive: true });

    if (readme) {
      fs.writeFileSync(path.join(dir, "README.md"), readme);
    }

    if (manifest) {
      fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest));
    }
  }

  describe("loadReposRegistry", () => {
    test("loads repos from registry", async () => {
      createReposRegistry([
        { id: "owner/repo1" },
        { id: "owner/repo2" },
      ]);

      const repos = await loadReposRegistry(tempDir);
      expect(repos).toHaveLength(2);
      expect(repos.map(r => r.id)).toEqual(["owner/repo1", "owner/repo2"]);
    });

    test("returns empty array when registry missing", async () => {
      const repos = await loadReposRegistry(tempDir);
      expect(repos).toHaveLength(0);
    });

    test("returns empty array when repos.json is empty", async () => {
      fs.mkdirSync("data", { recursive: true });
      fs.writeFileSync("data/repos.json", JSON.stringify({ repos: [] }));

      const repos = await loadReposRegistry(tempDir);
      expect(repos).toHaveLength(0);
    });
  });

  describe("scanResearchDirectory", () => {
    test("scans research/github directories", async () => {
      createResearchDir("owner/repo1");
      createResearchDir("owner/repo2");
      createResearchDir("other/project");

      const repos = await scanResearchDirectory(tempDir);
      expect(repos).toHaveLength(3);
      expect(repos).toContain("owner/repo1");
      expect(repos).toContain("owner/repo2");
      expect(repos).toContain("other/project");
    });

    test("returns empty array when research dir missing", async () => {
      const repos = await scanResearchDirectory(tempDir);
      expect(repos).toHaveLength(0);
    });

    test("ignores non-directory entries", async () => {
      fs.mkdirSync("research/github/owner", { recursive: true });
      fs.writeFileSync("research/github/owner/repo.md", "# Not a dir");

      const repos = await scanResearchDirectory(tempDir);
      expect(repos).toHaveLength(0);
    });
  });

  describe("validateManifest", () => {
    test("returns valid for correct manifest", async () => {
      createResearchDir("test/repo", createValidManifest("test/repo"));

      const result = await validateManifest("test/repo", tempDir);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("returns invalid when manifest missing", async () => {
      createResearchDir("test/repo", undefined);

      const result = await validateManifest("test/repo", tempDir);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Manifest file not found");
    });

    test("returns invalid for malformed JSON", async () => {
      createResearchDir("test/repo");
      const manifestPath = path.join(tempDir, "research/github/test/repo/manifest.json");
      fs.writeFileSync(manifestPath, "{ broken");

      const result = await validateManifest("test/repo", tempDir);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Parse error");
    });

    test("returns invalid for schema violations", async () => {
      createResearchDir("test/repo", createInvalidManifest("test/repo"));

      const result = await validateManifest("test/repo", tempDir);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("kind must be one of");
    });
  });

  describe("verifyResearchIntegrity", () => {
    test("passes for valid research dirs", async () => {
      createReposRegistry([{ id: "owner/repo1" }, { id: "owner/repo2" }]);
      createResearchDir("owner/repo1", createValidManifest("owner/repo1"));
      createResearchDir("owner/repo2", createValidManifest("owner/repo2"));

      const result = await verifyResearchIntegrity({ basePath: tempDir });

      expect(result.valid).toBe(true);
      expect(result.reposInRegistry).toBe(2);
      expect(result.reposInResearch).toBe(2);
      expect(result.orphanedInRegistry).toHaveLength(0);
      expect(result.orphanedInResearch).toHaveLength(0);
      expect(result.invalidManifests).toHaveLength(0);
      expect(result.missingManifests).toHaveLength(0);
      expect(result.missingReadmes).toHaveLength(0);
    });

    test("detects orphaned registry entry", async () => {
      createReposRegistry([{ id: "ghost/repo" }]);

      const result = await verifyResearchIntegrity({ basePath: tempDir });

      expect(result.valid).toBe(false);
      expect(result.orphanedInRegistry).toContain("ghost/repo");
    });

    test("detects orphaned research entry", async () => {
      createReposRegistry([]);
      createResearchDir("orphan/repo", createValidManifest("orphan/repo"));

      const result = await verifyResearchIntegrity({ basePath: tempDir });

      expect(result.valid).toBe(false);
      expect(result.orphanedInResearch).toContain("orphan/repo");
    });

    test("detects missing manifest", async () => {
      createReposRegistry([{ id: "test/repo" }]);
      createResearchDir("test/repo", undefined);

      const result = await verifyResearchIntegrity({ basePath: tempDir });

      expect(result.valid).toBe(false);
      expect(result.missingManifests).toContain("test/repo");
    });

    test("detects missing README", async () => {
      createReposRegistry([{ id: "test/repo" }]);
      createResearchDir("test/repo", createValidManifest("test/repo"), "");

      const result = await verifyResearchIntegrity({ basePath: tempDir });

      expect(result.valid).toBe(false);
      expect(result.missingReadmes).toContain("test/repo");
    });

    test("detects invalid manifest", async () => {
      createReposRegistry([{ id: "test/repo" }]);
      createResearchDir("test/repo", createInvalidManifest("test/repo"));

      const result = await verifyResearchIntegrity({ basePath: tempDir });

      expect(result.valid).toBe(false);
      expect(result.invalidManifests).toHaveLength(1);
      expect(result.invalidManifests[0].path).toMatch(/test[/\\]repo/);
      expect(result.invalidManifests[0].error).toContain("kind must be one of");
    });

    test("handles stale manifest gracefully", async () => {
      createReposRegistry([{ id: "test/repo" }]);
      createResearchDir("test/repo", createStaleManifest("test/repo"));

      const result = await verifyResearchIntegrity({ basePath: tempDir });

      // Stale manifest (old version) should still be valid if it passes schema
      expect(result.valid).toBe(true);
      expect(result.invalidManifests).toHaveLength(0);
    });

    test("handles empty research directory", async () => {
      createReposRegistry([]);
      fs.mkdirSync("research/github", { recursive: true });

      const result = await verifyResearchIntegrity({ basePath: tempDir });

      expect(result.valid).toBe(true);
      expect(result.reposInRegistry).toBe(0);
      expect(result.reposInResearch).toBe(0);
    });

    test("handles multiple issues at once", async () => {
      createReposRegistry([
        { id: "ghost/repo" },
        { id: "missing/manifest" },
        { id: "missing/readme" },
      ]);
      createResearchDir("orphan/research", createValidManifest("orphan/research"));
      createResearchDir("missing/manifest", undefined);
      createResearchDir("missing/readme", createValidManifest("missing/readme"), "");

      const result = await verifyResearchIntegrity({ basePath: tempDir });

      expect(result.valid).toBe(false);
      expect(result.orphanedInRegistry).toContain("ghost/repo");
      expect(result.orphanedInResearch).toContain("orphan/research");
      expect(result.missingManifests).toContain("missing/manifest");
      expect(result.missingReadmes).toContain("missing/readme");
    });

    test("uses custom paths when provided", async () => {
      const customDataDir = path.join(tempDir, "custom-data");
      const customResearchDir = path.join(tempDir, "custom-research");

      fs.mkdirSync(customDataDir, { recursive: true });
      fs.mkdirSync(path.join(customResearchDir, "owner/repo"), { recursive: true });
      fs.writeFileSync(
        path.join(customDataDir, "repos.json"),
        JSON.stringify({ repos: [{ id: "owner/repo" }] })
      );
      fs.writeFileSync(
        path.join(customResearchDir, "owner/repo/manifest.json"),
        JSON.stringify(createValidManifest("owner/repo"))
      );
      fs.writeFileSync(
        path.join(customResearchDir, "owner/repo/README.md"),
        "# Test"
      );

      const result = await verifyResearchIntegrity({
        basePath: tempDir,
        registryPath: "custom-data/repos.json",
        researchDir: "custom-research",
      });

      expect(result.valid).toBe(true);
    });

    test("counts repos correctly in both registry and research", async () => {
      createReposRegistry([
        { id: "a/repo1" },
        { id: "a/repo2" },
        { id: "b/repo1" },
      ]);
      createResearchDir("a/repo1", createValidManifest("a/repo1"));
      createResearchDir("b/repo1", createValidManifest("b/repo1"));
      // Note: a/repo2 and a/repo2 have no research dir

      const result = await verifyResearchIntegrity({ basePath: tempDir });

      expect(result.reposInRegistry).toBe(3);
      expect(result.reposInResearch).toBe(2);
      expect(result.orphanedInRegistry).toContain("a/repo2");
    });
  });
});
