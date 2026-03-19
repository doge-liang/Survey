import { describe, test, expect, beforeEach } from "bun:test";
import type { SynthesisSource } from "./synthesis-lib";
import { buildSynthesisOutput, type SynthesisOutput } from "./synthesis-lib";

describe("SynthesisOutput contract", () => {
  let mockSources: SynthesisSource[];

  beforeEach(() => {
    mockSources = [
      {
        id: "owner/repo1",
        kind: "github-analysis",
        manifestPath: "/research/github/owner/repo1/manifest.json",
        manifest: {
          version: "1.0.0",
          kind: "github-analysis",
          id: "owner/repo1",
          title: "Repo 1",
          source_type: "github",
          upstream_url: "https://github.com/owner/repo1",
          inputs: [],
          outputs: [],
          generated_by: "test",
          created_at: "2026-03-18T10:00:00Z",
          updated_at: "2026-03-18T10:00:00Z",
          language: "zh",
          tags: ["llm", "training"],
        },
      },
      {
        id: "owner/repo2",
        kind: "github-analysis",
        manifestPath: "/research/github/owner/repo2/manifest.json",
        manifest: {
          version: "1.0.0",
          kind: "github-analysis",
          id: "owner/repo2",
          title: "Repo 2",
          source_type: "github",
          upstream_url: "https://github.com/owner/repo2",
          inputs: [],
          outputs: [],
          generated_by: "test",
          created_at: "2026-03-18T10:00:00Z",
          updated_at: "2026-03-18T10:00:00Z",
          language: "en",
          tags: ["llm", "inference"],
        },
      },
    ];
  });

  test("produces valid SynthesisOutput shape", () => {
    const result = buildSynthesisOutput("llm", mockSources);

    expect(result).toHaveProperty("topic");
    expect(result).toHaveProperty("timestamp");
    expect(result).toHaveProperty("sources");
    expect(result).toHaveProperty("relationships");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("warnings");
  });

  test("topic is the input string", () => {
    const result = buildSynthesisOutput("llm", mockSources);
    expect(result.topic).toBe("llm");
  });

  test("timestamp is ISO string", () => {
    const result = buildSynthesisOutput("llm", mockSources);
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  test("sources has minimal shape", () => {
    const result = buildSynthesisOutput("llm", mockSources);

    expect(result.sources).toHaveLength(2);
    const source = result.sources[0];
    expect(source).toHaveProperty("id");
    expect(source).toHaveProperty("title");
    expect(source).toHaveProperty("tags");
    expect(source).toHaveProperty("language");
    expect(source).toHaveProperty("updated_at");
    // Should NOT have these debug fields
    expect(source).not.toHaveProperty("manifestPath");
    expect(source).not.toHaveProperty("manifest");
    expect(source).not.toHaveProperty("kind");
    expect(source).not.toHaveProperty("upstream_url");
  });

  test("relationships is an array", () => {
    const result = buildSynthesisOutput("llm", mockSources);
    expect(Array.isArray(result.relationships)).toBe(true);
  });

  test("relationships from shared tags when no explicit relations", () => {
    const result = buildSynthesisOutput("llm", mockSources);
    // Both mock sources share "llm" tag, so should have inferred relationships
    expect(result.relationships.length).toBeGreaterThan(0);
    expect(result.warnings).toContain("relationships_inferred: no explicit manifest.related edges found");
  });

  test("summary is a non-empty string", () => {
    const result = buildSynthesisOutput("llm", mockSources);
    expect(typeof result.summary).toBe("string");
    expect(result.summary.length).toBeGreaterThan(0);
  });

  test("warnings is an array", () => {
    const result = buildSynthesisOutput("llm", mockSources);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  test("handles empty sources", () => {
    const result = buildSynthesisOutput("nonexistent", []);
    expect(result.sources).toHaveLength(0);
    expect(result.summary).toContain("0 sources");
  });

  test("handles sources without shared tags", () => {
    const noSharedSources: SynthesisSource[] = [
      {
        id: "owner/repo1",
        kind: "github-analysis",
        manifestPath: "/research/github/owner/repo1/manifest.json",
        manifest: {
          version: "1.0.0",
          kind: "github-analysis",
          id: "owner/repo1",
          title: "Repo 1",
          source_type: "github",
          upstream_url: "https://github.com/owner/repo1",
          inputs: [],
          outputs: [],
          generated_by: "test",
          created_at: "2026-03-18T10:00:00Z",
          updated_at: "2026-03-18T10:00:00Z",
          language: "zh",
          tags: ["rag", "tutorial"],
        },
      },
      {
        id: "owner/repo2",
        kind: "github-analysis",
        manifestPath: "/research/github/owner/repo2/manifest.json",
        manifest: {
          version: "1.0.0",
          kind: "github-analysis",
          id: "owner/repo2",
          title: "Repo 2",
          source_type: "github",
          upstream_url: "https://github.com/owner/repo2",
          inputs: [],
          outputs: [],
          generated_by: "test",
          created_at: "2026-03-18T10:00:00Z",
          updated_at: "2026-03-18T10:00:00Z",
          language: "en",
          tags: ["vector-db", "embedding"],
        },
      },
    ];

    const result = buildSynthesisOutput("mixed", noSharedSources);
    // No shared tags, relationships might be empty or minimal
    expect(Array.isArray(result.relationships)).toBe(true);
  });

  test("patterns and comparison are optional", () => {
    const result = buildSynthesisOutput("llm", mockSources);
    // These are optional but if present should have correct shape
    if (result.patterns) {
      expect(Array.isArray(result.patterns)).toBe(true);
    }
    if (result.comparison) {
      expect(Array.isArray(result.comparison)).toBe(true);
    }
  });
});
