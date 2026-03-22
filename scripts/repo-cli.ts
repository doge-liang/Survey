import * as fs from "node:fs";
import * as path from "node:path";

import { find, list, load, normalize, remove, save, upsert, validate } from "./lib/repo-registry";
import { discoverRepos } from "./lib/github-repos";

import type { Repo, RepoLevel, RepoRegistry } from "./lib/repo-registry";

const LEVELS = new Set<RepoLevel>(["beginner", "intermediate", "advanced", "expert"]);

interface CliIo {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

interface ParsedArgs {
  positionals: string[];
  flags: Record<string, string | boolean>;
}

function defaultIo(): CliIo {
  return {
    stdout: message => {
      console.log(message);
    },
    stderr: message => {
      console.error(message);
    },
  };
}

function registryPath(): string {
  return path.join(process.cwd(), "data", "repos.json");
}

function readRawRegistry(): RepoRegistry & { repos: unknown[] } {
  const filePath = registryPath();
  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(content) as Partial<RepoRegistry> & { repos?: unknown[] };

  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.repos)) {
    throw new Error("Repo registry repos must be an array");
  }

  if (typeof parsed.version !== "string") {
    throw new Error("Repo registry version must be a string");
  }

  if (typeof parsed.updated_at !== "string") {
    throw new Error("Repo registry updated_at must be a string");
  }

  return {
    version: parsed.version,
    updated_at: parsed.updated_at,
    repos: parsed.repos,
  };
}

function parseArgs(args: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const key = arg.slice(2);
    if (key === "json") {
      flags[key] = true;
      continue;
    }

    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    flags[key] = value;
    index += 1;
  }

  return { positionals, flags };
}

function parseRepoId(value: string): { owner: string; repo: string } {
  const parts = value.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid repo id: ${value}`);
  }

  return {
    owner: parts[0],
    repo: parts[1],
  };
}

function getStringFlag(flags: Record<string, string | boolean>, name: string): string | undefined {
  const value = flags[name];
  return typeof value === "string" ? value : undefined;
}

function parseTags(value: string | undefined): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  const tags = value.split(",").map(tag => tag.trim()).filter(Boolean);
  return tags.length > 0 ? tags : [];
}

function parseLevel(value: string | undefined): RepoLevel | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!LEVELS.has(value as RepoLevel)) {
    throw new Error(`Invalid level: ${value}`);
  }

  return value as RepoLevel;
}

function parseStars(value: string | undefined): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === "null") {
    return null;
  }

  const stars = Number(value);
  if (!Number.isFinite(stars) || !Number.isInteger(stars) || stars < 0) {
    throw new Error(`Invalid stars value: ${value}`);
  }

  return stars;
}

function formatRepo(repo: Repo): Record<string, unknown> {
  return {
    id: repo.id,
    url: repo.url,
    owner: repo.owner,
    repo: repo.repo,
    ...(repo.description !== undefined ? { description: repo.description } : {}),
    ...(repo.stars !== undefined ? { stars: repo.stars } : {}),
    ...(repo.tags !== undefined ? { tags: repo.tags } : {}),
    ...(repo.level !== undefined ? { level: repo.level } : {}),
    ...(repo.cloned_at !== undefined ? { cloned_at: repo.cloned_at } : {}),
    ...(repo.last_commit !== undefined ? { last_commit: repo.last_commit } : {}),
    ...(repo.renamed_at !== undefined ? { renamed_at: repo.renamed_at } : {}),
  };
}

function printJson(io: CliIo, value: unknown): void {
  io.stdout(JSON.stringify(value));
}

function requireCommand(positionals: string[]): string {
  const command = positionals[0];
  if (!command) {
    throw new Error("Missing command");
  }

  return command;
}

function requireRepoId(positionals: string[]): string {
  const repoId = positionals[1];
  if (!repoId) {
    throw new Error("Missing repo id");
  }

  parseRepoId(repoId);
  return repoId;
}

function touchRegistry(registry: RepoRegistry): RepoRegistry {
  return {
    ...registry,
    updated_at: new Date().toISOString(),
  };
}

function validateEntry(repo: unknown): Repo | Error {
  return validate(normalize(repo as Repo));
}

function handleAdd(repoId: string, flags: Record<string, string | boolean>, io: CliIo): void {
  const registry = load();
  if (find(registry, repoId)) {
    throw new Error(`Repo already exists: ${repoId}`);
  }

  const { owner, repo } = parseRepoId(repoId);
  const nextRepo: Repo = {
    id: repoId,
    url: `https://github.com/${repoId}`,
    owner,
    repo,
    description: getStringFlag(flags, "description"),
    tags: parseTags(getStringFlag(flags, "tags")),
    level: parseLevel(getStringFlag(flags, "level")),
    stars: parseStars(getStringFlag(flags, "stars")),
  };

  save(upsert(touchRegistry(registry), nextRepo));
  io.stdout(`Added ${repoId}`);
}

function handleUpdate(repoId: string, flags: Record<string, string | boolean>, io: CliIo): void {
  const registry = load();
  const existing = find(registry, repoId);
  if (!existing) {
    throw new Error(`Repo not found: ${repoId}`);
  }

  const description = getStringFlag(flags, "description");
  const updated: Repo = {
    ...existing,
    ...(description !== undefined ? { description } : {}),
    ...(flags.tags !== undefined ? { tags: parseTags(getStringFlag(flags, "tags")) } : {}),
    ...(flags.level !== undefined ? { level: parseLevel(getStringFlag(flags, "level")) } : {}),
    ...(flags.stars !== undefined ? { stars: parseStars(getStringFlag(flags, "stars")) } : {}),
  };

  save(upsert(touchRegistry(registry), updated));
  io.stdout(`Updated ${repoId}`);
}

function handleRemove(repoId: string, io: CliIo): void {
  const registry = load();
  if (!find(registry, repoId)) {
    throw new Error(`Repo not found: ${repoId}`);
  }

  save(remove(touchRegistry(registry), repoId));
  io.stdout(`Removed ${repoId}`);
}

function handleGet(repoId: string, asJson: boolean, io: CliIo): void {
  const registry = load();
  const repo = find(registry, repoId);
  if (!repo) {
    throw new Error(`Repo not found: ${repoId}`);
  }

  const validated = validate(repo);
  if (validated instanceof Error) {
    throw validated;
  }

  if (asJson) {
    printJson(io, {
      ...formatRepo(validated),
      valid: true,
    });
    return;
  }

  io.stdout(`${validated.id} ${validated.url}`);
}

function handleList(asJson: boolean, io: CliIo): void {
  const repos = list(load());
  if (asJson) {
    printJson(io, repos.map(repo => formatRepo(repo)));
    return;
  }

  for (const repo of repos) {
    io.stdout(repo.id);
  }
}

function handleValidate(asJson: boolean, io: CliIo): number {
  const registry = readRawRegistry();
  const errors = registry.repos.flatMap((repo): Array<{ id: string; error: string }> => {
    const validated = validateEntry(repo);
    if (!(validated instanceof Error)) {
      return [];
    }

    const id = typeof (repo as { id?: unknown })?.id === "string"
      ? (repo as { id: string }).id
      : "<unknown>";
    return [{ id, error: validated.message }];
  });

  if (errors.length === 0) {
    if (asJson) {
      printJson(io, { valid: true, count: registry.repos.length });
    } else {
      io.stdout(`Valid: ${registry.repos.length} repo(s)`);
    }
    return 0;
  }

  if (asJson) {
    printJson(io, { valid: false, errors });
  } else {
    for (const item of errors) {
      io.stderr(`${item.id}: ${item.error}`);
    }
  }
  return 1;
}

function handleRepair(io: 
CliIo): number {
  const registry = readRawRegistry();
  const normalizedRepos: Repo[] = [];

  for (const repo of registry.repos) {
    const validated = validateEntry(repo);
    if (validated instanceof Error) {
      throw validated;
    }
    normalizedRepos.push(validated);
  }

  save({
    version: registry.version,
    updated_at: new Date().toISOString(),
    repos: normalizedRepos,
  });
  io.stdout(`Repaired ${normalizedRepos.length} repo(s)`);
  return 0;
}

interface DiscoverOptions {
  top: number;
  topics?: string[];
  asJson: boolean;
}

async function handleDiscover(org: string, opts: DiscoverOptions, io: CliIo): Promise<void> {
  const repos = await discoverRepos({
    org,
    limit: opts.top,
    topics: opts.topics,
  });

  if (opts.asJson) {
    printJson(io, repos);
    return;
  }

  // Table header
  const nameCol = "Name";
  const starsCol = "Stars";
  const topicsCol = "Topics";
  const descCol = "Description";

  io.stdout(`${nameCol.padEnd(25)} ${starsCol.padEnd(8)} ${topicsCol.padEnd(20)} ${descCol}`);
  io.stdout("-".repeat(25) + " " + "-".repeat(8) + " " + "-".repeat(20) + " " + "-".repeat(40));

  for (const repo of repos) {
    const topics = repo.topics.slice(0, 3).join(",");
    const desc = repo.description ? repo.description.slice(0, 40) : "";
    io.stdout(
      `${repo.name.padEnd(25)} ${String(repo.stars).padEnd(8)} ${topics.padEnd(20)} ${desc}`,
    );
  }
}

export async function runCli(args: string[], io: CliIo = defaultIo()): Promise<number> {
  try {
    const parsed = parseArgs(args);
    const command = requireCommand(parsed.positionals);
    const asJson = parsed.flags.json === true;

    switch (command) {
      case "add":
        handleAdd(requireRepoId(parsed.positionals), parsed.flags, io);
        return 0;
      case "update":
        handleUpdate(requireRepoId(parsed.positionals), parsed.flags, io);
        return 0;
      case "remove":
        handleRemove(requireRepoId(parsed.positionals), io);
        return 0;
      case "get":
        handleGet(requireRepoId(parsed.positionals), asJson, io);
        return 0;
      case "list":
        handleList(asJson, io);
        return 0;
      case "validate":
        return handleValidate(asJson, io);
      case "repair":
        return handleRepair(io);
      case "discover": {
        const org = getStringFlag(parsed.flags, "org");
        if (!org) {
          throw new Error("--org is required");
        }
        const top = parseInt(getStringFlag(parsed.flags, "top") || "30", 10);
        if (isNaN(top) || top <= 0) {
          throw new Error("--top must be a positive number");
        }
        const topicsFlag = getStringFlag(parsed.flags, "topics");
        const topics = topicsFlag ? topicsFlag.split(",").map(t => t.trim()).filter(Boolean) : undefined;
        await handleDiscover(org, { top, topics, asJson }, io);
        return 0;
      }
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (e) {
    io.stderr(e instanceof Error ? e.message : String(e));
    return 1;
  }
}

if (import.meta.main) {
  const exitCode = await runCli(process.argv.slice(2));
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}
