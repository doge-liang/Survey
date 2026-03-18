#!/usr/bin/env bun
/**
 * Research Integrity Verification Script
 * Validates research directory integrity by checking:
 * 1. All repos.json entries have corresponding README.md and manifest.json
 * 2. All research/github/* entries are indexed in repos.json
 * 3. All manifests are valid against schema
 * 
 * Usage:
 *   bun scripts/verify-research-integrity.ts
 *   bun scripts/verify-research-integrity.ts --fix
 */

import { parseArgs } from "util";
import * as fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { validate } from "./lib/manifest";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    fix: { type: "boolean" },
    help: { type: "boolean" },
  },
  strict: false,
  allowPositionals: true,
});

if (values.help) {
  console.log("Usage:");
  console.log("  bun scripts/verify-research-integrity.ts       Verify integrity");
  console.log("  bun scripts/verify-research-integrity.ts --fix Fix minor issues");
  console.log("  bun scripts/verify-research-integrity.ts --help Show this help");
  process.exit(0);
}

interface RepoEntry {
  id: string;
  url?: string;
  category?: string;
  level?: string;
}

interface IntegrityResult {
  valid: boolean;
  reposInRegistry: number;
  reposInResearch: number;
  orphanedInRegistry: string[]; // in repos.json but missing research
  orphanedInResearch: string[]; // in research/ but not in repos.json
  invalidManifests: { path: string; error: string }[];
  missingManifests: string[]; // have README but no manifest
  missingReadmes: string[]; // have manifest but no README
}

async function loadReposRegistry(): Promise<RepoEntry[]> {
  const registryPath = "data/repos.json";
  try {
    const content = await Bun.file(registryPath).text();
    const data = JSON.parse(content);
    return data.repos || [];
  } catch (error) {
    console.error(`❌ Failed to load repos.json: ${error}`);
    return [];
  }
}

async function scanResearchDirectory(): Promise<string[]> {
  const researchDir = "research/github";
  const repos: string[] = [];
  
  if (!existsSync(researchDir)) {
    return repos;
  }

  const entries = await fs.readdir(researchDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const ownerDir = join(researchDir, entry.name);
    const subEntries = await fs.readdir(ownerDir, { withFileTypes: true });
    
    for (const subEntry of subEntries) {
      if (subEntry.isDirectory()) {
        repos.push(`${entry.name}/${subEntry.name}`);
      }
    }
  }
  
  return repos.sort();
}

async function validateManifest(repoId: string): Promise<{ valid: boolean; error?: string }> {
  const manifestPath = `research/github/${repoId}/manifest.json`;
  
  if (!existsSync(manifestPath)) {
    return { valid: false, error: "Manifest file not found" };
  }

  try {
    const content = await Bun.file(manifestPath).text();
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

async function runIntegrityCheck(): Promise<IntegrityResult> {
  console.log("🔍 Running research integrity check...\n");

  const [registryRepos, researchRepos] = await Promise.all([
    loadReposRegistry(),
    scanResearchDirectory(),
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
    const researchPath = `research/github/${repo.id}`;
    if (!existsSync(researchPath)) {
      result.orphanedInRegistry.push(repo.id);
    } else {
      // Check if README exists
      if (!existsSync(`${researchPath}/README.md`)) {
        result.missingReadmes.push(repo.id);
      }
      // Check if manifest exists and is valid
      if (!existsSync(`${researchPath}/manifest.json`)) {
        result.missingManifests.push(repo.id);
      } else {
        const validation = await validateManifest(repo.id);
        if (!validation.valid) {
          result.invalidManifests.push({
            path: `${researchPath}/manifest.json`,
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

function printResults(result: IntegrityResult): void {
  console.log("📊 Research Integrity Report");
  console.log("=" .repeat(50));
  console.log();
  console.log(`Repositories in registry:  ${result.reposInRegistry}`);
  console.log(`Repositories in research:  ${result.reposInResearch}`);
  console.log();

  if (result.orphanedInRegistry.length > 0) {
    console.log(`⚠️  Orphaned in registry (${result.orphanedInRegistry.length}):`);
    for (const id of result.orphanedInRegistry) {
      console.log(`   - ${id} (in repos.json but no research directory)`);
    }
    console.log();
  }

  if (result.orphanedInResearch.length > 0) {
    console.log(`⚠️  Orphaned in research (${result.orphanedInResearch.length}):`);
    for (const id of result.orphanedInResearch) {
      console.log(`   - ${id} (has research directory but not in repos.json)`);
    }
    console.log();
  }

  if (result.missingReadmes.length > 0) {
    console.log(`⚠️  Missing README.md (${result.missingReadmes.length}):`);
    for (const id of result.missingReadmes) {
      console.log(`   - ${id}`);
    }
    console.log();
  }

  if (result.missingManifests.length > 0) {
    console.log(`⚠️  Missing manifest.json (${result.missingManifests.length}):`);
    for (const id of result.missingManifests) {
      console.log(`   - ${id}`);
    }
    console.log();
  }

  if (result.invalidManifests.length > 0) {
    console.log(`❌ Invalid manifests (${result.invalidManifests.length}):`);
    for (const { path, error } of result.invalidManifests) {
      console.log(`   - ${path}`);
      console.log(`     Error: ${error}`);
    }
    console.log();
  }

  if (result.valid) {
    console.log("✅ All integrity checks passed!");
  } else {
    console.log(`❌ Found ${
      result.orphanedInRegistry.length +
      result.orphanedInResearch.length +
      result.invalidManifests.length +
      result.missingManifests.length +
      result.missingReadmes.length
    } issue(s) to fix.`);
  }
}

async function main() {
  const result = await runIntegrityCheck();
  printResults(result);
  
  if (values.fix && !result.valid) {
    console.log("\n🔧 Fix mode is enabled but not yet implemented.");
    console.log("   Manual fixes required for now.");
  }
  
  process.exit(result.valid ? 0 : 1);
}

main();
