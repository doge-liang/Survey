import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { create, exists, load, remove, save, validate } from "./manifest";
import type { ArtifactManifest, ArtifactKind, SourceType } from "./manifest";

const originalCwd = process.cwd();

let tempDir: string;

function writeManifest(manifest: unknown, dirPath: string) {
  const manifestPath = path.join(dirPath, "manifest.json");
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}

function createManifest(overrides?: Partial<ArtifactManifest>): ArtifactManifest {
  const now = new Date().toISOString();
  return {
    $schema: "../data/schemas/manifest.json",
    version: "1.0.0",
    kind: "github-analysis",
    id: "example/test",
    source_type: "github",
    inputs: [],
    outputs: [],
    generated_by: "test",
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-test-"));
  process.chdir(tempDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("validate", () => {
  test("accepts a valid manifest", () => {
    const manifest = createManifest();
    const result = validate(manifest);
    expect(result).toEqual(manifest);
  });

  test("accepts manifest with all optional fields", () => {
    const manifest = createManifest({
      title: "Test Title",
      upstream_url: "https://github.com/example/repo",
      language: "en",
      tags: ["tag1", "tag2"],
      description: "A test manifest",
      upstream_ids: [{ type: "github", id: "example/repo" }],
      related: [{ id: "other/artifact", kind: "paper-notes", relationship: "related" }],
      metadata: { custom: "value" },
    });
    const result = validate(manifest);
    expect(result).toEqual(manifest);
  });

  test("rejects non-object values", () => {
    const result = validate(null);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("must be an object");
  });

  test("rejects undefined", () => {
    const result = validate(undefined);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("must be an object");
  });

  test("rejects array values", () => {
    const result = validate([]);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("must be an object");
  });

  test("rejects missing version field", () => {
    const manifest = createManifest();
    delete (manifest as Record<string, unknown>).version;
    const result = validate(manifest);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("version");
  });

  test("rejects missing kind field", () => {
    const manifest = createManifest();
    delete (manifest as Record<string, unknown>).kind;
    const result = validate(manifest);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("kind");
  });

  test("rejects invalid kind value", () => {
    const manifest = createManifest({ kind: "invalid-kind" as ArtifactKind });
    const result = validate(manifest);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("kind must be one of");
  });

  test("rejects missing id field", () => {
    const manifest = createManifest();
    delete (manifest as Record<string, unknown>).id;
    const result = validate(manifest);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("id");
  });

  test("rejects missing source_type field", () => {
    const manifest = createManifest();
    delete (manifest as Record<string, unknown>).source_type;
    const result = validate(manifest);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("source_type");
  });

  test("rejects invalid source_type value", () => {
    const manifest = createManifest({ source_type: "invalid" as SourceType });
    const result = validate(manifest);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("source_type must be one of");
  });

  test("rejects missing inputs field", () => {
    const manifest = createManifest();
    delete (manifest as Record<string, unknown>).inputs;
    const result = validate(manifest);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("inputs");
  });

  test("rejects non-array inputs", () => {
    const manifest = createManifest({ inputs: "not-an-array" as unknown as string[] });
    const result = validate(manifest);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("inputs");
  });

  test("rejects array with non-string inputs", () => {
    const manifest = createManifest({ inputs: ["valid", 123, "invalid"] as unknown as string[] });
    const result = validate(manifest);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("inputs");
  });

  test("rejects missing outputs field", () => {
    const manifest = createManifest();
    delete (manifest as Record<string, unknown>).outputs;
    const result = validate(manifest);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("outputs");
  });

  test("rejects non-array outputs", () => {
    const manifest = createManifest({ outputs: 42 as unknown as string[] });
    const result = validate(manifest);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("outputs");
  });

  test("rejects missing generated_by field", () => {
    const manifest = createManifest();
    delete (manifest as Record<string, unknown>).generated_by;
    const result = validate(manifest);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("generated_by");
  });

  test("rejects missing created_at field", () => {
    const manifest = createManifest();
    delete (manifest as Record<string, unknown>).created_at;
    const result = validate(manifest);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("created_at");
  });

  test("rejects missing updated_at field", () => {
    const manifest = createManifest();
    delete (manifest as Record<string, unknown>).updated_at;
    const result = validate(manifest);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("updated_at");
  });

  test("rejects invalid language value", () => {
    const manifest = createManifest({ language: "fr" as "zh" | "en" | "mixed" });
    const result = validate(manifest);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("language");
  });

  test("rejects non-array tags", () => {
    const manifest = createManifest({ tags: "not-an-array" as unknown as string[] });
    const result = validate(manifest);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("tags");
  });

  test("rejects invalid upstream_ids structure", () => {
    const manifest = createManifest({ upstream_ids: [{ type: "invalid", id: "test" }] });
    const result = validate(manifest);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("upstream_ids");
  });

  test("rejects invalid related structure", () => {
    const manifest = createManifest({
      related: [{ id: "test", kind: "invalid-kind" as ArtifactKind, relationship: "invalid" }],
    });
    const result = validate(manifest);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("related");
  });
});

describe("load", () => {
  test("loads valid manifest from filesystem", () => {
    const manifest = createManifest({ id: "test/load", inputs: ["input1"], outputs: ["output1"] });
    writeManifest(manifest, tempDir);

    const loaded = load(tempDir);
    expect(loaded.id).toBe("test/load");
    expect(loaded.inputs).toEqual(["input1"]);
    expect(loaded.outputs).toEqual(["output1"]);
  });

  test("throws on non-existent path", () => {
    const nonExistent = path.join(tempDir, "does-not-exist");
    expect(() => load(nonExistent)).toThrow();
  });

  test("throws on invalid manifest content", () => {
    const manifestPath = path.join(tempDir, "manifest.json");
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(manifestPath, "{ invalid json }");

    expect(() => load(tempDir)).toThrow();
  });

  test("throws on manifest that fails validation", () => {
    const manifest = createManifest();
    delete (manifest as Record<string, unknown>).id;
    writeManifest(manifest, tempDir);

    expect(() => load(tempDir)).toThrow(/Invalid manifest/);
  });
});

describe("save", () => {
  test("writes manifest to filesystem", () => {
    const manifest = createManifest({ id: "test/save" });
    save(manifest, tempDir);

    const loaded = load(tempDir);
    expect(loaded.id).toBe("test/save");
  });

  test("rejects invalid manifest", () => {
    const manifest = createManifest();
    delete (manifest as Record<string, unknown>).version;

    expect(() => save(manifest as ArtifactManifest, tempDir)).toThrow(/Cannot save invalid manifest/);
  });

  test("writes through temporary file atomically", () => {
    const manifest = createManifest();
    save(manifest, tempDir);

    const manifestPath = path.join(tempDir, "manifest.json");
    expect(fs.existsSync(manifestPath)).toBe(true);
  });
});

describe("exists", () => {
  test("returns true when manifest exists", () => {
    const manifest = createManifest();
    writeManifest(manifest, tempDir);
    expect(exists(tempDir)).toBe(true);
  });

  test("returns false when manifest does not exist", () => {
    expect(exists(tempDir)).toBe(false);
  });
});

describe("remove", () => {
  test("removes existing manifest", () => {
    const manifest = createManifest();
    writeManifest(manifest, tempDir);
    expect(exists(tempDir)).toBe(true);

    remove(tempDir);
    expect(exists(tempDir)).toBe(false);
  });

  test("does not throw when manifest does not exist", () => {
    expect(() => remove(tempDir)).not.toThrow();
  });
});

describe("create", () => {
  test("creates manifest with required fields", () => {
    const manifest = create("github-analysis", "test/create", "github", [], [], "test-generator");
    expect(manifest.id).toBe("test/create");
    expect(manifest.kind).toBe("github-analysis");
    expect(manifest.source_type).toBe("github");
    expect(manifest.generated_by).toBe("test-generator");
  });

  test("creates manifest with optional fields", () => {
    const manifest = create("paper-notes", "test/create-opt", "arxiv", ["input1"], ["output1"], "test-gen", {
      title: "Optional Title",
      upstreamUrl: "https://arxiv.org/abs/1234",
      language: "zh",
      tags: ["tag1", "tag2"],
      description: "A description",
    });
    expect(manifest.title).toBe("Optional Title");
    expect(manifest.upstream_url).toBe("https://arxiv.org/abs/1234");
    expect(manifest.language).toBe("zh");
    expect(manifest.tags).toEqual(["tag1", "tag2"]);
    expect(manifest.description).toBe("A description");
  });
});
