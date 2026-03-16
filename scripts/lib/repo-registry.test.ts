import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { find, list, load, normalize, remove, save, upsert, validate } from "./repo-registry";

import type { RepoRegistry } from "./repo-registry";

const SAMPLE_REPO = {
  id: "example/alpha",
  url: "https://github.com/example/alpha",
  owner: "example",
  repo: "alpha",
  last_commit: null,
} as const;

const originalCwd = process.cwd();

let tempDir: string;

function writeRegistry(registry: unknown) {
  const dataDir = path.join(tempDir, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "repos.json"), JSON.stringify(registry, null, 2) + "\n");
}

function createRegistry(overrides?: Partial<RepoRegistry>): RepoRegistry {
  return {
    version: "1.0",
    updated_at: "2026-03-16T00:00:00.000Z",
    repos: [],
    ...overrides,
  };
}

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "repo-registry-"));
  process.chdir(tempDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(tempDir, { recursive: true, force: true });
  mock.restore();
});

describe("validate", () => {
  test("accepts a valid repo", () => {
    expect(validate(SAMPLE_REPO)).toEqual(SAMPLE_REPO);
  });

  test("rejects object last_commit values", () => {
    const result = validate({ ...SAMPLE_REPO, last_commit: {} });

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toContain("last_commit");
  });
});

describe("normalize", () => {
  test("converts dirty last_commit objects to null", () => {
    const normalized = normalize({ ...SAMPLE_REPO, last_commit: {} as never });

    expect(normalized.last_commit).toBeNull();
  });
});

describe("load", () => {
  test("normalizes dirty repo data from repos.json", () => {
    writeRegistry(createRegistry({ repos: [{ ...SAMPLE_REPO, last_commit: {} }] }));

    const registry = load();

    expect(registry.repos[0]?.last_commit).toBeNull();
  });
});

describe("save", () => {
  test("sorts repos by id before persisting", () => {
    save(createRegistry({
      repos: [
        { ...SAMPLE_REPO, id: "zeta/repo", owner: "zeta", repo: "repo", url: "https://github.com/zeta/repo" },
        { ...SAMPLE_REPO, id: "alpha/repo", owner: "alpha", repo: "repo", url: "https://github.com/alpha/repo" },
      ],
    }));

    const saved = JSON.parse(fs.readFileSync(path.join(tempDir, "data", "repos.json"), "utf-8")) as RepoRegistry;

    expect(saved.repos.map(repo => repo.id)).toEqual(["alpha/repo", "zeta/repo"]);
  });

  test("writes through a temporary file and renames atomically", () => {
    const renameSpy = spyOn(fs, "renameSync");

    save(createRegistry({ repos: [SAMPLE_REPO] }));

    expect(renameSpy).toHaveBeenCalledTimes(1);

    const [tempFile, finalFile] = renameSpy.mock.calls[0] as [string, string];
    expect(path.basename(tempFile)).toContain("repos.json.");
    expect(finalFile).toBe(path.join(tempDir, "data", "repos.json"));
    expect(fs.existsSync(tempFile)).toBe(false);
  });
});

describe("registry helpers", () => {
  test("upsert replaces existing repos and list stays sorted", () => {
    const registry = createRegistry({
      repos: [
        { ...SAMPLE_REPO, id: "zeta/repo", owner: "zeta", repo: "repo", url: "https://github.com/zeta/repo" },
        { ...SAMPLE_REPO, id: "beta/repo", owner: "beta", repo: "repo", url: "https://github.com/beta/repo" },
      ],
    });

    const updated = upsert(registry, {
      ...SAMPLE_REPO,
      id: "beta/repo",
      owner: "beta",
      repo: "repo",
      url: "https://github.com/beta/repo",
      description: "updated",
    });

    expect(find(updated, "beta/repo")?.description).toBe("updated");
    expect(list(updated).map(repo => repo.id)).toEqual(["beta/repo", "zeta/repo"]);
  });

  test("remove drops the requested repo", () => {
    const registry = createRegistry({ repos: [SAMPLE_REPO, { ...SAMPLE_REPO, id: "other/repo", repo: "repo", url: "https://github.com/other/repo", owner: "other" }] });

    const updated = remove(registry, "example/alpha");

    expect(find(updated, "example/alpha")).toBeUndefined();
    expect(list(updated).map(repo => repo.id)).toEqual(["other/repo"]);
  });
});
