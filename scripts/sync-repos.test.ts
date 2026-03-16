import { describe, expect, test } from "bun:test";

import { fixOrphanedRepos, isVerifyCommand, withRetry } from "./sync-repos";

describe("isVerifyCommand", () => {
  test("treats --verify-fix as verify mode", () => {
    expect(isVerifyCommand(["--verify-fix"])).toBe(true);
    expect(isVerifyCommand(["--verify-interactive"])).toBe(true);
    expect(isVerifyCommand(["--check"])).toBe(false);
  });
});

describe("withRetry", () => {
  test("stops after the configured retry count", async () => {
    let attempts = 0;

    await expect(withRetry(async () => {
      attempts += 1;
      throw new Error("boom");
    }, 3)).rejects.toThrow("Failed after 3 attempt(s): boom");

    expect(attempts).toBe(3);
  });
});

describe("fixOrphanedRepos", () => {
  test("creates missing registry entries with owner/repo ids", async () => {
    const registry = {
      repos: [],
    };
    const orphanedRepos = [
      { id: "legacy-id", url: "https://github.com/example/demo", owner: "example", repo: "demo" },
    ];

    await fixOrphanedRepos(registry, orphanedRepos, async () => {});

    expect(registry.repos).toHaveLength(1);
    expect(registry.repos[0]).toMatchObject({
      id: "example/demo",
      owner: "example",
      repo: "demo",
      url: "https://github.com/example/demo",
    });
  });

  test("stores null when a successful clone has no current commit hash", async () => {
    const registry = {
      repos: [
        { id: "example/demo", url: "https://github.com/example/demo", owner: "example", repo: "demo" },
      ],
    };

    await fixOrphanedRepos(registry, registry.repos, async () => {});

    expect(registry.repos[0]?.last_commit).toBeNull();
  });

  test("continues to the next orphan when one clone fails", async () => {
    const registry = {
      repos: [
        { id: "bad-repo", url: "https://github.com/example/bad", owner: "example", repo: "bad" },
        { id: "good-repo", url: "https://github.com/example/good", owner: "example", repo: "good" },
      ],
    };
    const cloneAttempts: string[] = [];

    const summary = await fixOrphanedRepos(registry, registry.repos, async (owner, repo) => {
      cloneAttempts.push(`${owner}/${repo}`);

      if (repo === "bad") {
        throw new Error("not found");
      }
    });

    expect(cloneAttempts).toEqual(["example/bad", "example/good"]);
    expect(summary.succeeded).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.results).toEqual([
      { owner: "example", repo: "bad", status: "failed", message: "not found" },
      { owner: "example", repo: "good", status: "cloned", message: "" },
    ]);
  });

  test("reports progress and waits between sequential clones", async () => {
    const registry = {
      repos: [
        { id: "repo-1", url: "https://github.com/example/one", owner: "example", repo: "one" },
        { id: "repo-2", url: "https://github.com/example/two", owner: "example", repo: "two" },
      ],
    };
    const progress: string[] = [];
    const delays: number[] = [];

    await fixOrphanedRepos(
      registry,
      registry.repos,
      async () => {},
      {
        delayMs: 25,
        sleepFn: async (ms) => {
          delays.push(ms);
        },
        onProgress: ({ current, total, owner, repo }) => {
          progress.push(`${current}/${total}:${owner}/${repo}`);
        },
      }
    );

    expect(progress).toEqual([
      "1/2:example/one",
      "2/2:example/two",
    ]);
    expect(delays).toEqual([25]);
  });

  test("respects configured clone concurrency", async () => {
    const registry = {
      repos: [
        { id: "repo-1", url: "https://github.com/example/one", owner: "example", repo: "one" },
        { id: "repo-2", url: "https://github.com/example/two", owner: "example", repo: "two" },
        { id: "repo-3", url: "https://github.com/example/three", owner: "example", repo: "three" },
      ],
    };
    let active = 0;
    let maxActive = 0;

    await fixOrphanedRepos(
      registry,
      registry.repos,
      async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise(resolve => setTimeout(resolve, 10));
        active -= 1;
      },
      { concurrency: 2 }
    );

    expect(maxActive).toBe(2);
  });
});
