import { spawnSync } from "node:child_process";

export interface DiscoveredRepo {
  name: string;
  owner: string;
  fullName: string;
  stars: number;
  description: string;
  topics: string[];
  url: string;
  pushedAt: string;
}

interface GhRepoListItem {
  name: string;
  owner: { login: string };
  stargazerCount: number;
  description: string;
  repositoryTopics: Array<{ name: string }>;
  pushedAt: string;
}

export function normalizeTopics(topics: Array<{ name: string }> | null): string[] {
  return (topics || []).map(t => t.name.toLowerCase());
}

export function parseGhOutput(stdout: string): GhRepoListItem[] {
  try {
    const parsed = JSON.parse(stdout);
    if (!Array.isArray(parsed)) {
      throw new Error("Expected JSON array from gh repo list");
    }
    return parsed as GhRepoListItem[];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse gh output: ${message}`);
  }
}

export function toDiscoveredRepo(item: GhRepoListItem): DiscoveredRepo {
  return {
    name: item.name,
    owner: item.owner.login,
    fullName: `${item.owner.login}/${item.name}`,
    stars: item.stargazerCount,
    description: item.description || "",
    topics: normalizeTopics(item.repositoryTopics),
    url: `https://github.com/${item.owner.login}/${item.name}`,
    pushedAt: item.pushedAt || "",
  };
}

export function sortRepos(repos: DiscoveredRepo[]): DiscoveredRepo[] {
  return [...repos].sort((a, b) => {
    if (b.stars !== a.stars) {
      return b.stars - a.stars;
    }
    // Tie breaker: pushedAt DESC
    const aTime = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
    const bTime = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
    return bTime - aTime;
  });
}

export function filterByTopics(repos: DiscoveredRepo[], requiredTopics: string[]): DiscoveredRepo[] {
  if (requiredTopics.length === 0) {
    return repos;
  }
  const lower = requiredTopics.map(t => t.toLowerCase());
  return repos.filter(repo =>
    lower.every(topic => repo.topics.includes(topic)),
  );
}

function checkGhInstalled(): void {
  try {
    spawnSync("gh", ["--version"], { encoding: "utf-8", timeout: 5000 });
  } catch {
    throw new Error("gh CLI not found. Install from https://cli.github.com/");
  }
}

function execGh(args: string[]): string {
  // @ts-ignore - Bun's spawnSync return type differs from Node
  const result = spawnSync("gh", args, {
    encoding: "utf-8",
    timeout: 30000,
  }) as { status: number | null; stderr: string; stdout: string };

  if (result.status !== 0) {
    const stderr = result.stderr || "";
    throw new Error(`gh command failed (exit ${result.status}): ${stderr.trim()}`);
  }

  return result.stdout;
}

export async function listOrgRepos(org: string, opts?: {
  limit?: number;
  topics?: string[];
}): Promise<DiscoveredRepo[]> {
  checkGhInstalled();

  const limit = opts?.limit ?? 100;
  const topics = opts?.topics ?? [];

  const jsonFields = "name,owner,stargazerCount,description,repositoryTopics,pushedAt";
  const args = ["repo", "list", org, "--json", jsonFields, "--limit", String(limit)];

  const stdout = execGh(args);
  const items = parseGhOutput(stdout);
  const repos = items.map(toDiscoveredRepo);
  const sorted = sortRepos(repos);
  return filterByTopics(sorted, topics);
}

export async function discoverRepos(opts: {
  org: string;
  topics?: string[];
  limit?: number;
}): Promise<DiscoveredRepo[]> {
  return listOrgRepos(opts.org, { limit: opts.limit, topics: opts.topics });
}
