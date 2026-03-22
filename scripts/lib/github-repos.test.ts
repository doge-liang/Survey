import { describe, expect, test } from "bun:test";

import {
  filterByTopics,
  normalizeTopics,
  parseGhOutput,
  sortRepos,
  toDiscoveredRepo,
} from "./github-repos";

const MOCK_GH_OUTPUT = JSON.stringify([
  {
    name: "deer-flow",
    owner: { login: "bytedance" },
    stargazerCount: 31843,
    description: "SuperAgent harness",
    repositoryTopics: [
      { name: "agent" },
      { name: "ai-agents" },
      { name: "llm" },
    ],
    pushedAt: "2026-03-15T10:00:00Z",
  },
  {
    name: "UI-TARS-desktop",
    owner: { login: "bytedance" },
    stargazerCount: 28927,
    description: "Multimodal AI agent",
    repositoryTopics: [
      { name: "agent" },
      { name: "vlm" },
    ],
    pushedAt: "2026-03-14T10:00:00Z",
  },
  {
    name: "sonic",
    owner: { login: "bytedance" },
    stargazerCount: 9288,
    description: "Fast JSON library",
    repositoryTopics: [
      { name: "high-performance" },
      { name: "json" },
    ],
    pushedAt: "2026-03-13T10:00:00Z",
  },
  {
    name: "low-star-repo",
    owner: { login: "bytedance" },
    stargazerCount: 100,
    description: "Low star repo",
    repositoryTopics: [
      { name: "agent" },
    ],
    pushedAt: "2026-03-16T10:00:00Z",
  },
  {
    name: "no-topics-repo",
    owner: { login: "bytedance" },
    stargazerCount: 50,
    description: "No topics",
    repositoryTopics: null,
    pushedAt: "2026-03-12T10:00:00Z",
  },
]);

const MOCK_GH_OUTPUT_TIE = JSON.stringify([
  {
    name: "repo-a",
    owner: { login: "test" },
    stargazerCount: 1000,
    description: "A",
    repositoryTopics: [],
    pushedAt: "2026-03-15T10:00:00Z",
  },
  {
    name: "repo-b",
    owner: { login: "test" },
    stargazerCount: 1000,
    description: "B",
    repositoryTopics: [],
    pushedAt: "2026-03-16T10:00:00Z",
  },
]);

describe("normalizeTopics", () => {
  test("normalizes topic names to lowercase", () => {
    const input = [{ name: "Agent" }, { name: "AI-Agents" }];
    expect(normalizeTopics(input)).toEqual(["agent", "ai-agents"]);
  });

  test("handles null input", () => {
    expect(normalizeTopics(null)).toEqual([]);
  });

  test("handles empty array", () => {
    expect(normalizeTopics([])).toEqual([]);
  });
});

describe("parseGhOutput", () => {
  test("parses valid JSON array", () => {
    const result = parseGhOutput(MOCK_GH_OUTPUT);
    expect(result).toHaveLength(5);
    expect(result[0].name).toBe("deer-flow");
  });

  test("throws on invalid JSON", () => {
    expect(() => parseGhOutput("not json")).toThrow("Failed to parse gh output");
  });

  test("throws on non-array JSON", () => {
    expect(() => parseGhOutput('{"foo": "bar"}')).toThrow("Expected JSON array from gh repo list");
  });
});

describe("toDiscoveredRepo", () => {
  test("maps gh output to DiscoveredRepo", () => {
    const input = {
      name: "deer-flow",
      owner: { login: "bytedance" },
      stargazerCount: 31843,
      description: "SuperAgent harness",
      repositoryTopics: [{ name: "Agent" }, { name: "LLM" }],
      pushedAt: "2026-03-15T10:00:00Z",
    };
    const result = toDiscoveredRepo(input);

    expect(result.name).toBe("deer-flow");
    expect(result.owner).toBe("bytedance");
    expect(result.fullName).toBe("bytedance/deer-flow");
    expect(result.stars).toBe(31843);
    expect(result.description).toBe("SuperAgent harness");
    expect(result.topics).toEqual(["agent", "llm"]);
    expect(result.url).toBe("https://github.com/bytedance/deer-flow");
    expect(result.pushedAt).toBe("2026-03-15T10:00:00Z");
  });

  test("handles missing optional fields", () => {
    const input = {
      name: "test",
      owner: { login: "org" },
      stargazerCount: 0,
      description: "",
      repositoryTopics: null,
      pushedAt: "",
    };
    const result = toDiscoveredRepo(input);

    expect(result.topics).toEqual([]);
    expect(result.description).toBe("");
    expect(result.pushedAt).toBe("");
  });
});

describe("sortRepos", () => {
  test("sorts by stars descending", () => {
    const repos = parseGhOutput(MOCK_GH_OUTPUT).map(toDiscoveredRepo);
    const sorted = sortRepos(repos);

    expect(sorted[0].name).toBe("deer-flow");
    expect(sorted[0].stars).toBe(31843);
    expect(sorted[1].name).toBe("UI-TARS-desktop");
    expect(sorted[2].stars).toBeLessThan(sorted[1].stars);
  });

  test("uses pushedAt DESC as tie-breaker when stars are equal", () => {
    const repos = parseGhOutput(MOCK_GH_OUTPUT_TIE).map(toDiscoveredRepo);
    const sorted = sortRepos(repos);

    // repo-b has newer pushedAt (2026-03-16 vs 2026-03-15)
    expect(sorted[0].name).toBe("repo-b");
    expect(sorted[1].name).toBe("repo-a");
  });

  test("does not mutate original array", () => {
    const repos = parseGhOutput(MOCK_GH_OUTPUT).map(toDiscoveredRepo);
    const originalFirst = repos[0].name;
    sortRepos(repos);
    expect(repos[0].name).toBe(originalFirst);
  });
});

describe("filterByTopics", () => {
  const repos = parseGhOutput(MOCK_GH_OUTPUT).map(toDiscoveredRepo);

  test("returns all repos when no topics specified", () => {
    const result = filterByTopics(repos, []);
    expect(result).toHaveLength(5);
  });

  test("filters by single topic (AND logic)", () => {
    const result = filterByTopics(repos, ["agent"]);

    for (const repo of result) {
      expect(repo.topics).toContain("agent");
    }
    const names = result.map(r => r.name);
    expect(names).toContain("deer-flow");
    expect(names).toContain("UI-TARS-desktop");
    expect(names).not.toContain("sonic");
  });

  test("filters by multiple topics (AND logic)", () => {
    const result = filterByTopics(repos, ["agent", "llm"]);

    for (const repo of result) {
      expect(repo.topics).toContain("agent");
      expect(repo.topics).toContain("llm");
    }
    expect(result.map(r => r.name)).toContain("deer-flow");
  });

  test("returns empty array when no match", () => {
    const result = filterByTopics(repos, ["nonexistent-topic"]);
    expect(result).toHaveLength(0);
  });

  test("normalizes topic matching to lowercase", () => {
    const result = filterByTopics(repos, ["AGENT"]);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("integration: full parse and filter pipeline", () => {
  test("handles full workflow: parse -> transform -> sort -> filter", () => {
    const items = parseGhOutput(MOCK_GH_OUTPUT);
    const repos = items.map(toDiscoveredRepo);
    const sorted = sortRepos(repos);
    const filtered = filterByTopics(sorted, ["agent"]);

    expect(filtered[0].name).toBe("deer-flow"); // highest star with agent
    expect(filtered[1].name).toBe("UI-TARS-desktop"); // second highest with agent
    expect(filtered.length).toBe(3); // deer-flow, UI-TARS-desktop, low-star-repo
    // sonic and no-topics-repo don't have "agent"
  });
});
