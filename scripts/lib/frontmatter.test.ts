import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  addFrontmatterToMarkdown,
  extractManifestFields,
  hasFrontmatter,
  parseFrontmatter,
  serializeFrontmatter,
} from "./frontmatter";

describe("hasFrontmatter", () => {
  test("returns true for content with frontmatter", () => {
    const content = `---\ntitle: Test\n---\n# Hello`;
    expect(hasFrontmatter(content)).toBe(true);
  });

  test("returns true for content with Windows-style line endings", () => {
    const content = `---\r\ntitle: Test\r\n---\r\n# Hello`;
    expect(hasFrontmatter(content)).toBe(true);
  });

  test("returns false for content without frontmatter", () => {
    const content = `# Hello\n\nWorld`;
    expect(hasFrontmatter(content)).toBe(false);
  });

  test("returns false for empty content", () => {
    expect(hasFrontmatter("")).toBe(false);
    expect(hasFrontmatter("   ")).toBe(false);
  });

  test("returns false for non-string input", () => {
    expect(hasFrontmatter(null as unknown as string)).toBe(false);
    expect(hasFrontmatter(undefined as unknown as string)).toBe(false);
    expect(hasFrontmatter(123 as unknown as string)).toBe(false);
  });

  test("returns false for content starting with --- but no closing", () => {
    const content = `---\ntitle: Test\nNo closing`;
    expect(hasFrontmatter(content)).toBe(false);
  });
});

describe("parseFrontmatter", () => {
  test("parses frontmatter and returns data and content", () => {
    const content = `---\ntitle: Test\ntags:\n  - one\n  - two\n---\n# Hello World`;
    const result = parseFrontmatter(content);

    expect(result.data).toEqual({
      title: "Test",
      tags: ["one", "two"],
    });
    expect(result.content).toBe("# Hello World");
  });

  test("parses frontmatter with Windows line endings", () => {
    const content = `---\r\ntitle: Test\r\n---\r\n# Hello`;
    const result = parseFrontmatter(content);

    expect(result.data.title).toBe("Test");
    expect(result.content).toBe("# Hello");
  });

  test("parses empty frontmatter", () => {
    const content = `---\n---\n# Hello`;
    const result = parseFrontmatter(content);

    expect(result.data).toEqual({});
    expect(result.content).toBe("# Hello");
  });

  test("returns empty data for content without frontmatter", () => {
    const content = `# Hello\n\nWorld`;
    const result = parseFrontmatter(content);

    expect(result.data).toEqual({});
    expect(result.content).toBe(content);
  });

  test("throws for non-string input", () => {
    expect(() => parseFrontmatter(null as unknown as string)).toThrow("Content must be a string");
    expect(() => parseFrontmatter(123 as unknown as string)).toThrow("Content must be a string");
  });

  test("parses frontmatter with complex nested data", () => {
    const content = `---\nrelated:\n  - id: other/repo\n    kind: github-analysis\n    relationship: related\n---\nContent`;
    const result = parseFrontmatter(content);

    expect(result.data.related).toEqual([
      { id: "other/repo", kind: "github-analysis", relationship: "related" },
    ]);
  });
});

describe("serializeFrontmatter", () => {
  test("serializes simple key-value pairs", () => {
    const data = { title: "Test", language: "en" };
    const result = serializeFrontmatter(data);

    expect(result).toBe(`title: Test\nlanguage: en`);
  });

  test("serializes array values", () => {
    const data = { tags: ["one", "two", "three"] };
    const result = serializeFrontmatter(data);

    expect(result).toBe("tags: [one, two, three]");
  });

  test("serializes empty array", () => {
    const data = { tags: [] };
    const result = serializeFrontmatter(data);

    expect(result).toBe("tags: []");
  });

  test("serializes boolean values", () => {
    const data = { active: true, disabled: false };
    const result = serializeFrontmatter(data);

    expect(result).toBe("active: true\ndisabled: false");
  });

  test("serializes number values", () => {
    const data = { year: 2024, count: 42 };
    const result = serializeFrontmatter(data);

    expect(result).toBe("year: 2024\ncount: 42");
  });

  test("serializes null and undefined as empty", () => {
    const data = { nothing: null, empty: undefined };
    const result = serializeFrontmatter(data);

    expect(result).toBe("nothing:\nempty:");
  });

  test("escapes strings with colons", () => {
    const data = { url: "https://example.com" };
    const result = serializeFrontmatter(data);

    expect(result).toBe('url: "https://example.com"');
  });

  test("escapes strings with quotes", () => {
    const data = { text: 'say "hello"' };
    const result = serializeFrontmatter(data);

    expect(result).toBe('text: "say \\"hello\\""');
  });

  test("escapes strings with newlines", () => {
    const data = { text: "line1\nline2" };
    const result = serializeFrontmatter(data);

    expect(result).toBe('text: "line1\\nline2"');
  });

  test("throws for non-record input", () => {
    expect(() => serializeFrontmatter("not an object" as unknown as Record<string, unknown>)).toThrow(
      "Data must be a record object"
    );
    expect(() => serializeFrontmatter(null as unknown as Record<string, unknown>)).toThrow(
      "Data must be a record object"
    );
  });

  test("serializes object as inline when simple", () => {
    const data = { related: { id: "test", kind: "github-analysis" } };
    const result = serializeFrontmatter(data);

    expect(result).toBe('related: { id: test, kind: github-analysis }');
  });

  test("serializes nested objects", () => {
    const data = {
      metadata: { nested: { deep: "value" } },
    };
    const result = serializeFrontmatter(data);

    expect(result).toContain("nested:");
    expect(result).toContain("deep: value");
  });
});

describe("addFrontmatterToMarkdown", () => {
  test("adds frontmatter to content without frontmatter", () => {
    const content = "# Hello\n\nWorld";
    const data = { title: "Test", tags: ["one", "two"] };
    const result = addFrontmatterToMarkdown(content, data);

    expect(result).toBe(`---\ntitle: Test\ntags: [one, two]\n---\n# Hello\n\nWorld`);
  });

  test("replaces existing frontmatter", () => {
    const content = `---\nold: value\n---\n# Hello`;
    const data = { title: "New", updated: true };
    const result = addFrontmatterToMarkdown(content, data);

    expect(result).toBe(`---\ntitle: New\nupdated: true\n---\n# Hello`);
    expect(hasFrontmatter(result)).toBe(true);
  });

  test("preserves content after frontmatter", () => {
    const content = `---\ntitle: Test\n---\n# Title\n\nSome content\n\n## Section`;
    const data = { title: "Updated" };
    const result = addFrontmatterToMarkdown(content, data);

    expect(result).toContain("# Title");
    expect(result).toContain("Some content");
    expect(result).toContain("## Section");
  });

  test("throws for non-string content", () => {
    const data = { title: "Test" };
    expect(() => addFrontmatterToMarkdown(null as unknown as string, data)).toThrow(
      "Content must be a string"
    );
  });

  test("throws for non-record data", () => {
    expect(() => addFrontmatterToMarkdown("# Hello", "not an object" as unknown as Record<string, unknown>)).toThrow(
      "Data must be a record object"
    );
  });

  test("handles empty content", () => {
    const data = { title: "Test" };
    const result = addFrontmatterToMarkdown("", data);

    expect(result).toBe("---\ntitle: Test\n---\n");
  });
});

describe("extractManifestFields", () => {
  const now = new Date().toISOString();

  describe("github-analysis", () => {
    test("extracts github-analysis fields", () => {
      const manifest = {
        id: "owner/repo",
        title: "My Project",
        source_type: "github",
        upstream_url: "https://github.com/owner/repo",
        tags: ["typescript", "node"],
        description: "A cool project",
        language: "en",
        generated_by: "test",
        created_at: now,
        updated_at: now,
        related: [
          { id: "other/repo", kind: "github-analysis", relationship: "related" },
        ],
        level: "advanced",
        status: "active",
      };

      const result = extractManifestFields(manifest, "github-analysis");

      expect(result.id).toBe("owner/repo");
      expect(result.title).toBe("My Project");
      expect(result.source_type).toBe("github");
      expect(result.upstream_url).toBe("https://github.com/owner/repo");
      expect(result.tags).toEqual(["typescript", "node"]);
      expect(result.description).toBe("A cool project");
      expect(result.language).toBe("en");
      expect(result.generated_by).toBe("test");
      expect(result.created_at).toBe(now);
      expect(result.updated_at).toBe(now);
      expect(result.related).toEqual([{ id: "other/repo", kind: "github-analysis", relationship: "related" }]);
      expect(result.level).toBe("advanced");
      expect(result.status).toBe("active");
    });

    test("handles missing optional fields", () => {
      const manifest = {
        id: "owner/repo",
        title: "My Project",
        source_type: "github",
        upstream_url: "https://github.com/owner/repo",
        generated_by: "test",
        created_at: now,
        updated_at: now,
      };

      const result = extractManifestFields(manifest, "github-analysis");

      expect(result.id).toBe("owner/repo");
      expect(result.tags).toBeUndefined();
      expect(result.description).toBeUndefined();
      expect(result.related).toBeUndefined();
    });
  });

  describe("paper-notes", () => {
    test("extracts paper-notes fields", () => {
      const manifest = {
        id: "arxiv:1234.5678",
        title: "Paper Title",
        source_type: "arxiv",
        upstream_url: "https://arxiv.org/abs/1234.5678",
        tags: ["AI", "ML"],
        description: "An important paper",
        authors: ["Author One", "Author Two"],
        year: 2024,
        language: "en",
        generated_by: "test",
        created_at: now,
        updated_at: now,
        related: [
          { id: "arxiv:0000.0000", kind: "paper-notes", relationship: "related" },
        ],
        level: "intermediate",
        status: "reading",
      };

      const result = extractManifestFields(manifest, "paper-notes");

      expect(result.id).toBe("arxiv:1234.5678");
      expect(result.title).toBe("Paper Title");
      expect(result.source_type).toBe("arxiv");
      expect(result.upstream_url).toBe("https://arxiv.org/abs/1234.5678");
      expect(result.tags).toEqual(["AI", "ML"]);
      expect(result.description).toBe("An important paper");
      expect(result.authors).toEqual(["Author One", "Author Two"]);
      expect(result.year).toBe(2024);
      expect(result.language).toBe("en");
      expect(result.related).toEqual([{ id: "arxiv:0000.0000", kind: "paper-notes", relationship: "related" }]);
      expect(result.level).toBe("intermediate");
      expect(result.status).toBe("reading");
    });
  });

  describe("survey-synthesis", () => {
    test("extracts survey-synthesis fields", () => {
      const manifest = {
        id: "survey/rag-frameworks",
        title: "RAG Frameworks Survey",
        category: "RAG",
        source_type: "survey",
        tags: ["RAG", "LLM"],
        description: "Comparison of RAG frameworks",
        language: "zh",
        generated_by: "test",
        created_at: now,
        updated_at: now,
        related: ["ref/other-survey"],
        metadata: {
          related_projects: ["project/one", "project/two"],
          related_papers: ["arxiv:1111", "arxiv:2222"],
        },
        level: "beginner",
        date: "2024-01-15",
        status: "published",
      };

      const result = extractManifestFields(manifest, "survey-synthesis");

      expect(result.id).toBe("survey/rag-frameworks");
      expect(result.title).toBe("RAG Frameworks Survey");
      expect(result.category).toBe("RAG");
      expect(result.source_type).toBe("survey");
      expect(result.tags).toEqual(["RAG", "LLM"]);
      expect(result.description).toBe("Comparison of RAG frameworks");
      expect(result.language).toBe("zh");
      expect(result.related).toEqual(["ref/other-survey"]);
      expect(result.related_projects).toEqual(["project/one", "project/two"]);
      expect(result.related_papers).toEqual(["arxiv:1111", "arxiv:2222"]);
      expect(result.level).toBe("beginner");
      expect(result.date).toBe("2024-01-15");
      expect(result.status).toBe("published");
    });

    test("handles missing metadata fields", () => {
      const manifest = {
        id: "survey/test",
        title: "Test Survey",
        category: "Test",
        source_type: "survey",
        generated_by: "test",
        created_at: now,
        updated_at: now,
      };

      const result = extractManifestFields(manifest, "survey-synthesis");

      expect(result.related_projects).toBeUndefined();
      expect(result.related_papers).toBeUndefined();
    });
  });

  describe("domain-exploration", () => {
    test("extracts domain-exploration fields", () => {
      const manifest = {
        id: "domain/rag",
        title: "RAG Domain",
        source_type: "domain",
        tags: ["RAG", "AI"],
        description: "Learning path for RAG",
        language: "mixed",
        generated_by: "test",
        created_at: now,
        updated_at: now,
        level: "beginner",
        status: "active",
      };

      const result = extractManifestFields(manifest, "domain-exploration");

      expect(result.id).toBe("domain/rag");
      expect(result.title).toBe("RAG Domain");
      expect(result.source_type).toBe("domain");
      expect(result.tags).toEqual(["RAG", "AI"]);
      expect(result.description).toBe("Learning path for RAG");
      expect(result.language).toBe("mixed");
      expect(result.level).toBe("beginner");
      expect(result.status).toBe("active");
    });
  });

  test("throws for unknown artifact kind", () => {
    const manifest = { id: "test" };
    expect(() => extractManifestFields(manifest, "unknown-kind")).toThrow("Unknown artifact kind: unknown-kind");
  });

  test("throws for non-object manifest", () => {
    expect(() => extractManifestFields("not an object" as unknown as object, "github-analysis")).toThrow(
      "Manifest must be an object"
    );
    expect(() => extractManifestFields(null as unknown as object, "github-analysis")).toThrow(
      "Manifest must be an object"
    );
  });

  test("handles related field with mixed valid/invalid items", () => {
    const manifest = {
      id: "test/repo",
      title: "Test",
      source_type: "github",
      upstream_url: "https://github.com/test/repo",
      generated_by: "test",
      created_at: now,
      updated_at: now,
      related: [
        { id: "valid/repo", kind: "github-analysis", relationship: "related" },
        { id: "", kind: "invalid", relationship: "bad" },
        { id: "another/valid", kind: "paper-notes" },
      ],
    };

    const result = extractManifestFields(manifest, "github-analysis");

    expect(result.related).toEqual([
      { id: "valid/repo", kind: "github-analysis", relationship: "related" },
      { id: "another/valid", kind: "paper-notes" },
    ]);
  });
});
