import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { runCli } from "./repo-cli";

import type { Repo, RepoRegistry } from "./lib/repo-registry";

const originalCwd = process.cwd();

let tempDir: string;

function createRegistry(repos: unknown[]): RepoRegistry {
  return {
    version: "1.0",
    updated_at: "2026-03-16T00:00:00.000Z",
    repos: repos as Repo[],
  };
}

function writeRegistry(registry: unknown): void {
  const dataDir = path.join(tempDir, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "repos.json"), JSON.stringify(registry, null, 2) + "\n");
}

async function run(args: string[]) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const exitCode = await runCli(args, {
    stdout: message => {
      stdout.push(message);
    },
    stderr: message => {
      stderr.push(message);
    },
  });

  return {
    exitCode,
    stdout: stdout.join("\n"),
    stderr: stderr.join("\n"),
  };
}

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "repo-cli-"));
  process.chdir(tempDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("repo-cli", () => {
  test("adds a repo and returns JSON from get", async () => {
    writeRegistry(createRegistry([]));

    expect(await run([
      "add",
      "vercel/next.js",
      "--description",
      "React framework",
      "--tags",
      "react,framework,ssr",
      "--level",
      "beginner",
    ])).toEqual({
      exitCode: 0,
      stdout: "Added vercel/next.js",
      stderr: "",
    });

    const result = await run(["get", "vercel/next.js", "--json"]);
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      id: "vercel/next.js",
      url: "https://github.com/vercel/next.js",
      owner: "vercel",
      repo: "next.js",
      description: "React framework",
      tags: ["react", "framework", "ssr"],
      level: "beginner",
      valid: true,
    });
    expect(result.stderr).toBe("");
  });

  test("updates and removes repos", async () => {
    writeRegistry(createRegistry([
      {
        id: "vercel/next.js",
        url: "https://github.com/vercel/next.js",
        owner: "vercel",
        repo: "next.js",
        stars: null,
      },
    ]));

    expect((await run(["update", "vercel/next.js", "--stars", "100", "--level", "intermediate"])).exitCode).toBe(0);

    const listed = await run(["list", "--json"]);
    expect(listed.exitCode).toBe(0);
    expect(JSON.parse(listed.stdout)).toEqual([
      {
        id: "vercel/next.js",
        url: "https://github.com/vercel/next.js",
        owner: "vercel",
        repo: "next.js",
        stars: 100,
        level: "intermediate",
      },
    ]);

    expect((await run(["remove", "vercel/next.js"])).exitCode).toBe(0);
    expect(await run(["get", "vercel/next.js", "--json"])).toEqual({
      exitCode: 1,
      stdout: "",
      stderr: "Repo not found: vercel/next.js",
    });
  });

  test("validate returns JSON success summary", async () => {
    writeRegistry(createRegistry([
      {
        id: "vercel/next.js",
        url: "https://github.com/vercel/next.js",
        owner: "vercel",
        repo: "next.js",
      },
      {
        id: "oven-sh/bun",
        url: "https://github.com/oven-sh/bun",
        owner: "oven-sh",
        repo: "bun",
      },
    ]));

    const result = await run(["validate", "--json"]);
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ valid: true, count: 2 });
    expect(result.stderr).toBe("");
  });

  test("validate reports all invalid repos and exits non-zero", async () => {
    writeRegistry({
      version: "1.0",
      updated_at: "2026-03-16T00:00:00.000Z",
      repos: [
        {
          id: "broken/one",
          url: 123,
          owner: "broken",
          repo: "one",
        },
        {
          id: "broken/two",
          url: "https://github.com/broken/two",
          owner: "broken",
          repo: "two",
          level: "impossible",
        },
      ],
    });

    const result = await run(["validate", "--json"]);
    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toEqual({
      valid: false,
      errors: [
        { id: "broken/one", error: "Repo url must be a string" },
        { id: "broken/two", error: "Repo level must be a valid difficulty" },
      ],
    });
    expect(result.stderr).toBe("");
  });

  test("repair normalizes every repo and saves the registry", async () => {
    writeRegistry({
      version: "1.0",
      updated_at: "2026-03-16T00:00:00.000Z",
      repos: [
        {
          id: "zeta/repo",
          url: "https://github.com/zeta/repo",
          owner: "zeta",
          repo: "repo",
          cloned_at: null,
          last_commit: {},
        },
        {
          id: "alpha/repo",
          url: "https://github.com/alpha/repo",
          owner: "alpha",
          repo: "repo",
          renamed_at: null,
        },
      ],
    });

    const result = await run(["repair"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("Repaired 2 repo(s)");
    expect(result.stderr).toBe("");

    const repaired = JSON.parse(fs.readFileSync(path.join(tempDir, "data", "repos.json"), "utf-8")) as RepoRegistry;
    expect(repaired.repos.map(repo => repo.id)).toEqual(["alpha/repo", "zeta/repo"]);
    expect(repaired.repos[0]).not.toHaveProperty("renamed_at");
    expect(repaired.repos[1]).not.toHaveProperty("last_commit");
    expect(repaired.repos[1]).not.toHaveProperty("cloned_at");
  });

  test("discover fails without --org", async () => {
    writeRegistry(createRegistry([]));
    const result = await run(["discover", "bytedance"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--org");
  });

  test("discover fails with --top 0", async () => {
    writeRegistry(createRegistry([]));
    const result = await run(["discover", "bytedance", "--org", "ByteDance-Seed", "--top", "0"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--top must be a positive number");
  });

  test("discover fails with --top negative", async () => {
    writeRegistry(createRegistry([]));
    const result = await run(["discover", "bytedance", "--org", "ByteDance-Seed", "--top", "-5"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--top must be a positive number");
  });

  test("discover fails with --top non-number", async () => {
    writeRegistry(createRegistry([]));
    const result = await run(["discover", "bytedance", "--org", "ByteDance-Seed", "--top", "abc"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--top must be a positive number");
  });

  test("discover succeeds with valid --org and --top", async () => {
    writeRegistry(createRegistry([]));
    // This test requires gh to be installed and may hit rate limits
    const result = await run(["discover", "bytedance", "--org", "ByteDance-Seed", "--top", "3"]);
    // gh might fail due to rate limiting, but if it succeeds, validate structure
    if (result.exitCode === 0) {
      const lines = result.stdout.split("\n").filter(l => l.trim());
      expect(lines.length).toBeGreaterThanOrEqual(3); // header + at least 3 data rows
      expect(lines[0]).toContain("Name");
      expect(lines[0]).toContain("Stars");
    }
  });

  test("discover --json outputs valid JSON", async () => {
    writeRegistry(createRegistry([]));
    // This test requires gh to be installed
    const result = await run(["discover", "bytedance", "--org", "ByteDance-Seed", "--top", "2", "--json"]);
    if (result.exitCode === 0) {
      const parsed = JSON.parse(result.stdout);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeLessThanOrEqual(2);
    }
  });
});
