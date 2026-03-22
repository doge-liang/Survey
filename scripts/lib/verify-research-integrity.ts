/**
 * Research Integrity Verification Library
 * Validates research directory integrity by checking:
 * 1. All repos.json entries have corresponding README.md and manifest.json
 * 2. All research/github/* entries are indexed in repos.json
 * 3. All manifests are valid against schema
 */

import * as fs from "node:fs";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { validate } from "./manifest";

export interface RepoEntry {
  id: string;
  url?: string;
  category?: string;
  level?: string;
}

export interface IntegrityResult {
  valid: boolean;
  reposInRegistry: number;
  reposInResearch: number;
  orphanedInRegistry: string[];
  orphanedInResearch: string[];
  invalidManifests: { path: string; error: string }[];
  missingManifests: string[];
  missingReadmes: string[];
}

export interface VerifyOptions {
  basePath?: string;
  registryPath?: string;
  researchDir?: string;
}

const DEFAULT_OPTIONS: Required<VerifyOptions> = {
  basePath: "",
  registryPath: "data/repos.json",
  researchDir: "research/github",
};

export async function loadReposRegistry(basePath: string): Promise<RepoEntry[]> {
  const registryPath = join(basePath, "data/repos.json");
  try {
    const content = await fs.promises.readFile(registryPath, "utf-8");
    const data = JSON.parse(content);
    return data.repos || [];
  } catch {
    return [];
  }
}

export async function scanResearchDirectory(basePath: string): Promise<string[]> {
  const researchDir = join(basePath, "research/github");
  const repos: string[] = [];

  if (!existsSync(researchDir)) {
    return repos;
  }

  const entries = await fs.promises.readdir(researchDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const ownerDir = join(researchDir, entry.name);
    const subEntries = await fs.promises.readdir(ownerDir, { withFileTypes: true });

    for (const subEntry of subEntries) {
      if (subEntry.isDirectory()) {
        repos.push(`${entry.name}/${subEntry.name}`);
      }
    }
  }

  return repos.sort();
}

export async function validateManifest(repoId: string, basePath: string): Promise<{ valid: boolean; error?: string }> {
  const manifestPath = join(basePath, "research/github", repoId, "manifest.json");

  if (!existsSync(manifestPath)) {
    return { valid: false, error: "Manifest file not found" };
  }

  try {
    const content = await fs.promises.readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(content);
    const result = validate(manifest);

    if (result instanceof Error) {
      return { valid: false, error: result.message };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: `Parse error: ${error}` };
  }
}

export async function verifyResearchIntegrity(options: VerifyOptions = {}): Promise<IntegrityResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { basePath, registryPath, researchDir } = opts;

  const [registryRepos, researchRepos] = await Promise.all([
    loadReposRegistry(basePath),
    scanResearchDirectory(basePath),
  ]);

  const registryIds = new Set(registryRepos.map(r => r.id));
  const researchIds = new Set(researchRepos);

  const result: IntegrityResult = {
    valid: true,
    reposInRegistry: registryIds.size,
    reposInResearch: researchIds.size,
    orphanedInRegistry: [],
    orphanedInResearch: [],
    invalidManifests: [],
    missingManifests: [],
    missingReadmes: [],
  };

  // Check for orphaned entries in registry
  for (const repo of registryRepos) {
    const researchPath = join(basePath, "research/github", repo.id);
    if (!existsSync(researchPath)) {
      result.orphanedInRegistry.push(repo.id);
    } else {
      // Check if README exists
      if (!existsSync(join(researchPath, "README.md"))) {
        result.missingReadmes.push(repo.id);
      }
      // Check if manifest exists and is valid
      const manifestPath = join(researchPath, "manifest.json");
      if (!existsSync(manifestPath)) {
        result.missingManifests.push(repo.id);
      } else {
        const validation = await validateManifest(repo.id, basePath);
        if (!validation.valid) {
          result.invalidManifests.push({
            path: manifestPath,
            error: validation.error || "Unknown error",
          });
        }
      }
    }
  }

  // Check for orphaned entries in research directory
  for (const repoId of researchIds) {
    if (!registryIds.has(repoId)) {
      result.orphanedInResearch.push(repoId);
    }
  }

  result.valid =
    result.orphanedInRegistry.length === 0 &&
    result.orphanedInResearch.length === 0 &&
    result.invalidManifests.length === 0 &&
    result.missingManifests.length === 0 &&
    result.missingReadmes.length === 0;

  return result;
}
