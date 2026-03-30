import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

const originalCwd = process.cwd();

interface TestArtifact {
  manifest: Record<string, unknown>;
  mdContent: string;
}

function createTestManifest(type: string): Record<string, unknown> {
  const base = {
    version: "1.0.0",
    kind: type,
    id: "test-artifact-id",
    title: "Test Artifact Title",
    generated_by: "test-generator",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };

  switch (type) {
    case "github-analysis":
      return {
        ...base,
        source_type: "github",
        upstream_url: "https://github.com/test/repo",
        tags: ["test", "github"],
        language: "en",
      };
    case "paper-notes":
      return {
        ...base,
        source_type: "arxiv",
        upstream_url: "https://arxiv.org/abs/1234.56789",
        tags: ["test", "paper"],
        authors: ["Test Author"],
        year: 2024,
        language: "en",
      };
    case "survey-synthesis":
      return {
        ...base,
        source_type: "survey",
        category: "test-category",
        tags: ["test", "survey"],
        level: "intermediate",
        description: "A test survey",
      };
    case "domain-exploration":
      return {
        ...base,
        source_type: "domain",
        tags: ["test", "domain"],
        description: "A test domain",
      };
    default:
      return base;
  }
}

async function setupTestEnvironment(): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "migrate-frontmatter-test-"));
  process.chdir(tempDir);
  return tempDir;
}

async function cleanupTestEnvironment(tempDir: string): Promise<void> {
  process.chdir(originalCwd);
  await fs.rm(tempDir, { recursive: true, force: true });
}

async function createTestArtifact(
  basePath: string,
  type: "github" | "paper" | "survey" | "domain",
  artifactId: string,
  mdContent: string,
  hasExistingFrontmatter = false
): Promise<void> {
  let kind: string;
  let mdFile: string;

  switch (type) {
    case "github":
      kind = "github-analysis";
      mdFile = "README.md";
      break;
    case "paper":
      kind = "paper-notes";
      mdFile = "notes.md";
      break;
    case "survey":
      kind = "survey-synthesis";
      mdFile = "index.md";
      break;
    case "domain":
      kind = "domain-exploration";
      mdFile = "index.md";
      break;
  }

  const artifactPath = path.join(basePath, artifactId);
  await fs.mkdir(artifactPath, { recursive: true });

  const manifest = createTestManifest(kind);
  await fs.writeFile(path.join(artifactPath, "manifest.json"), JSON.stringify(manifest, null, 2));

  let finalMdContent = mdContent;
  if (hasExistingFrontmatter) {
    finalMdContent = `---\nid: existing-frontmatter\n---\n\n${mdContent}`;
  }
  await fs.writeFile(path.join(artifactPath, mdFile), finalMdContent);
}

describe("migrate-add-frontmatter", () => {
  describe("processArtifact logic", () => {
    test("should correctly identify when frontmatter needs to be added", async () => {
      const tempDir = await setupTestEnvironment();
      try {
        await createTestArtifact(
          path.join(tempDir, "research", "github"),
          "github",
          "test/repo",
          "# Test Repository\n\nContent here"
        );

        const { hasFrontmatter } = await import("./lib/frontmatter");
        const content = await fs.readFile(
          path.join(tempDir, "research", "github", "test/repo", "README.md"),
          "utf-8"
        );

        expect(hasFrontmatter(content)).toBe(false);
      } finally {
        await cleanupTestEnvironment(tempDir);
      }
    });

    test("should skip files that already have frontmatter", async () => {
      const tempDir = await setupTestEnvironment();
      try {
        await createTestArtifact(
          path.join(tempDir, "research", "github"),
          "github",
          "test/repo",
          "# Test Repository\n\nContent here",
          true
        );

        const { hasFrontmatter } = await import("./lib/frontmatter");
        const content = await fs.readFile(
          path.join(tempDir, "research", "github", "test/repo", "README.md"),
          "utf-8"
        );

        expect(hasFrontmatter(content)).toBe(true);
      } finally {
        await cleanupTestEnvironment(tempDir);
      }
    });
  });

  describe("addFrontmatterToMarkdown", () => {
    test("should add frontmatter to markdown content", async () => {
      const tempDir = await setupTestEnvironment();
      try {
        const manifest = createTestManifest("github-analysis");
        const mdContent = "# Test\n\nContent";
        const { extractManifestFields, addFrontmatterToMarkdown } = await import("./lib/frontmatter");

        const frontmatterData = extractManifestFields(manifest, "github-analysis");
        const result = addFrontmatterToMarkdown(mdContent, frontmatterData);

        expect(result).toContain("---");
        expect(result).toContain("id: test-artifact-id");
        expect(result).toContain("title: Test Artifact Title");
        expect(result).toContain("# Test");
      } finally {
        await cleanupTestEnvironment(tempDir);
      }
    });

    test("should preserve existing frontmatter removal before adding new", async () => {
      const tempDir = await setupTestEnvironment();
      try {
        const manifest = createTestManifest("github-analysis");
        const mdContent = "---\nid: old\n---\n\n# Test\n\nContent";
        const { extractManifestFields, addFrontmatterToMarkdown } = await import("./lib/frontmatter");

        const frontmatterData = extractManifestFields(manifest, "github-analysis");
        const result = addFrontmatterToMarkdown(mdContent, frontmatterData);

        const frontmatterMatches = result.match(/^---\n([\s\S]*?)\n---/);
        expect(frontmatterMatches).not.toBeNull();
        expect(frontmatterMatches![1]).toContain("id: test-artifact-id");
        expect(frontmatterMatches![1]).not.toContain("id: old");
      } finally {
        await cleanupTestEnvironment(tempDir);
      }
    });
  });

  describe("extractManifestFields", () => {
    test("should extract correct fields for github-analysis", async () => {
      const tempDir = await setupTestEnvironment();
      try {
        const manifest = createTestManifest("github-analysis");
        const { extractManifestFields } = await import("./lib/frontmatter");

        const fields = extractManifestFields(manifest, "github-analysis");

        expect(fields.id).toBe("test-artifact-id");
        expect(fields.title).toBe("Test Artifact Title");
        expect(fields.source_type).toBe("github");
        expect(fields.upstream_url).toBe("https://github.com/test/repo");
        expect(fields.tags).toEqual(["test", "github"]);
      } finally {
        await cleanupTestEnvironment(tempDir);
      }
    });

    test("should extract correct fields for paper-notes", async () => {
      const tempDir = await setupTestEnvironment();
      try {
        const manifest = createTestManifest("paper-notes");
        const { extractManifestFields } = await import("./lib/frontmatter");

        const fields = extractManifestFields(manifest, "paper-notes");

        expect(fields.id).toBe("test-artifact-id");
        expect(fields.title).toBe("Test Artifact Title");
        expect(fields.source_type).toBe("arxiv");
        expect(fields.upstream_url).toBe("https://arxiv.org/abs/1234.56789");
        expect(fields.authors).toEqual(["Test Author"]);
        expect(fields.year).toBe(2024);
      } finally {
        await cleanupTestEnvironment(tempDir);
      }
    });

    test("should extract correct fields for survey-synthesis", async () => {
      const tempDir = await setupTestEnvironment();
      try {
        const manifest = createTestManifest("survey-synthesis");
        const { extractManifestFields } = await import("./lib/frontmatter");

        const fields = extractManifestFields(manifest, "survey-synthesis");

        expect(fields.id).toBe("test-artifact-id");
        expect(fields.title).toBe("Test Artifact Title");
        expect(fields.source_type).toBe("survey");
        expect(fields.category).toBe("test-category");
        expect(fields.tags).toEqual(["test", "survey"]);
        expect(fields.level).toBe("intermediate");
      } finally {
        await cleanupTestEnvironment(tempDir);
      }
    });

    test("should extract correct fields for domain-exploration", async () => {
      const tempDir = await setupTestEnvironment();
      try {
        const manifest = createTestManifest("domain-exploration");
        const { extractManifestFields } = await import("./lib/frontmatter");

        const fields = extractManifestFields(manifest, "domain-exploration");

        expect(fields.id).toBe("test-artifact-id");
        expect(fields.title).toBe("Test Artifact Title");
        expect(fields.source_type).toBe("domain");
      } finally {
        await cleanupTestEnvironment(tempDir);
      }
    });
  });

  describe("integration tests", () => {
    test("should process multiple artifact types in sequence", async () => {
      const tempDir = await setupTestEnvironment();
      try {
        const researchDir = path.join(tempDir, "research");

        await createTestArtifact(
          path.join(researchDir, "github"),
          "github",
          "owner/repo",
          "# GitHub Repo\n\nContent"
        );

        await createTestArtifact(
          path.join(researchDir, "papers"),
          "paper",
          "1234.56789",
          "# Paper Notes\n\nContent"
        );

        await createTestArtifact(
          path.join(researchDir, "surveys"),
          "survey",
          "topic/sub",
          "# Survey\n\nContent"
        );

        const { hasFrontmatter, extractManifestFields, addFrontmatterToMarkdown } = await import("./lib/frontmatter");

        const githubMdPath = path.join(researchDir, "github", "owner/repo", "README.md");
        const githubContent = await fs.readFile(githubMdPath, "utf-8");
        expect(hasFrontmatter(githubContent)).toBe(false);

        const githubManifest = JSON.parse(await fs.readFile(path.join(researchDir, "github", "owner/repo", "manifest.json"), "utf-8"));
        const githubFrontmatter = extractManifestFields(githubManifest, "github-analysis");
        const newGithubContent = addFrontmatterToMarkdown(githubContent, githubFrontmatter);
        await fs.writeFile(githubMdPath, newGithubContent);

        const updatedGithubContent = await fs.readFile(githubMdPath, "utf-8");
        expect(hasFrontmatter(updatedGithubContent)).toBe(true);

        const paperMdPath = path.join(researchDir, "papers", "1234.56789", "notes.md");
        const paperContent = await fs.readFile(paperMdPath, "utf-8");
        expect(hasFrontmatter(paperContent)).toBe(false);

        const paperManifest = JSON.parse(await fs.readFile(path.join(researchDir, "papers", "1234.56789", "manifest.json"), "utf-8"));
        const paperFrontmatter = extractManifestFields(paperManifest, "paper-notes");
        const newPaperContent = addFrontmatterToMarkdown(paperContent, paperFrontmatter);
        await fs.writeFile(paperMdPath, newPaperContent);

        const updatedPaperContent = await fs.readFile(paperMdPath, "utf-8");
        expect(hasFrontmatter(updatedPaperContent)).toBe(true);
      } finally {
        await cleanupTestEnvironment(tempDir);
      }
    });

    test("should handle nested directory structures", async () => {
      const tempDir = await setupTestEnvironment();
      try {
        const researchDir = path.join(tempDir, "research", "surveys");
        await createTestArtifact(
          researchDir,
          "survey",
          "parent/child/grandchild",
          "# Nested Survey\n\nContent"
        );

        const mdPath = path.join(researchDir, "parent/child/grandchild", "index.md");
        const content = await fs.readFile(mdPath, "utf-8");
        expect(content).toContain("# Nested Survey");
      } finally {
        await cleanupTestEnvironment(tempDir);
      }
    });
  });
});
