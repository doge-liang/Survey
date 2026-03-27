import * as fs from "node:fs";
import * as path from "node:path";

export type RepoLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface Repo {
  id: string;
  url: string;
  owner: string;
  repo: string;
  description?: string;
  stars?: number | null;
  tags?: string[];
  level?: RepoLevel;
  cloned_at?: string;
  last_commit?: string | null;
  renamed_at?: string;
}

export interface RepoRegistry {
  version: string;
  updated_at: string;
  repos: Repo[];
}

const REPO_LEVELS = new Set<RepoLevel>(["beginner", "intermediate", "advanced", "expert"]);

function registryFilePath(): string {
  return path.join(process.cwd(), "data", "repos.json");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string");
}

function isRepoLevel(value: unknown): value is RepoLevel {
  return typeof value === "string" && REPO_LEVELS.has(value as RepoLevel);
}

function sortRepos(repos: Repo[]): Repo[] {
  return [...repos].sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function validateRegistry(value: unknown): RepoRegistry {
  if (!isObject(value)) {
    throw new Error("Repo registry must be an object");
  }

  if (typeof value.version !== "string") {
    throw new Error("Repo registry version must be a string");
  }

  if (typeof value.updated_at !== "string") {
    throw new Error("Repo registry updated_at must be a string");
  }

  if (!Array.isArray(value.repos)) {
    throw new Error("Repo registry repos must be an array");
  }

  return {
    version: value.version,
    updated_at: value.updated_at,
    repos: value.repos.map((repo, index) => {
      const normalized = normalize(repo as Repo);
      const validated = validate(normalized);

      if (validated instanceof Error) {
        throw new Error(`Invalid repo at index ${index}: ${validated.message}`);
      }

      return validated;
    }),
  };
}

export function load(): RepoRegistry {
  const content = fs.readFileSync(registryFilePath(), "utf-8");
  return validateRegistry(JSON.parse(content));
}

export function validate(repo: unknown): Repo | Error {
  if (!isObject(repo)) {
    return new Error("Repo must be an object");
  }

  if (typeof repo.id !== "string") {
    return new Error("Repo id must be a string");
  }

  if (typeof repo.url !== "string") {
    return new Error("Repo url must be a string");
  }

  if (typeof repo.owner !== "string") {
    return new Error("Repo owner must be a string");
  }

  if (typeof repo.repo !== "string") {
    return new Error("Repo repo must be a string");
  }

  if (repo.description !== undefined && typeof repo.description !== "string") {
    return new Error("Repo description must be a string");
  }

  if (repo.stars !== undefined && repo.stars !== null && typeof repo.stars !== "number") {
    return new Error("Repo stars must be a number or null");
  }

  if (repo.tags !== undefined && !isStringArray(repo.tags)) {
    return new Error("Repo tags must be a string array");
  }

  if (repo.level !== undefined && !isRepoLevel(repo.level)) {
    return new Error("Repo level must be a valid difficulty");
  }

  if (!isOptionalString(repo.cloned_at)) {
    return new Error("Repo cloned_at must be a string when present");
  }

  if (repo.last_commit !== undefined && repo.last_commit !== null && typeof repo.last_commit !== "string") {
    return new Error("Repo last_commit must be a string or null");
  }

  if (!isOptionalString(repo.renamed_at)) {
    return new Error("Repo renamed_at must be a string when present");
  }

  return {
    id: repo.id,
    url: repo.url,
    owner: repo.owner,
    repo: repo.repo,
    description: repo.description,
    stars: repo.stars,
    tags: repo.tags ? [...repo.tags] : undefined,
    level: repo.level,
    cloned_at: repo.cloned_at,
    last_commit: repo.last_commit === undefined ? undefined : repo.last_commit,
    renamed_at: repo.renamed_at,
  };
}

export function normalize(repo: Repo): Repo {
  const raw = repo as Repo & { cloned_at?: unknown; last_commit?: unknown; renamed_at?: unknown };
  const normalizedLastCommit = raw.last_commit === undefined || raw.last_commit === null
    ? raw.last_commit ?? undefined
    : typeof raw.last_commit === "string"
      ? raw.last_commit
      : null;

  return {
    ...repo,
    cloned_at: normalizeOptionalString(raw.cloned_at),
    last_commit: normalizedLastCommit,
    renamed_at: normalizeOptionalString(raw.renamed_at),
  };
}

export function save(registry: RepoRegistry): void {
  const normalizedRegistry = validateRegistry(registry);
  const filePath = registryFilePath();
  const directory = path.dirname(filePath);
  const tempFilePath = path.join(directory, `repos.json.${process.pid}.${Date.now()}.tmp`);
  const content = JSON.stringify({
    ...normalizedRegistry,
    repos: sortRepos(normalizedRegistry.repos),
  }, null, 2) + "\n";

  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(tempFilePath, content);
  fs.renameSync(tempFilePath, filePath);
}

export function upsert(registry: RepoRegistry, repo: Repo): RepoRegistry {
  const validated = validate(normalize(repo));

  if (validated instanceof Error) {
    throw validated;
  }

  const repos = registry.repos.filter(entry => entry.id !== validated.id);
  repos.push(validated);

  return {
    ...registry,
    repos: sortRepos(repos),
  };
}

export function remove(registry: RepoRegistry, id: string): RepoRegistry {
  return {
    ...registry,
    repos: sortRepos(registry.repos.filter(repo => repo.id !== id)),
  };
}

export function find(registry: RepoRegistry, id: string): Repo | undefined {
  return registry.repos.find(repo => repo.id === id);
}

export function list(registry: RepoRegistry): Repo[] {
  return sortRepos(registry.repos);
}
