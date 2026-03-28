#!/usr/bin/env bun
/**
 * Research Integrity Verification Script
 * Validates research directory integrity across 5 dimensions:
 * 1. Registry → Research Directory (repos.json ↔ research/github/)
 * 2. Registry → Source Clone (repos.json ↔ sources/github/)
 * 3. Research → Manifests (research/github/* ↔ manifest.json + outputs)
 * 4. Manifests → Indexes (manifests ↔ data/generated/*.json)
 * 5. Index Validity (github-index.json, domain-index.json schema + refs)
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

// ============================================================================
// Types
// ============================================================================

interface RepoEntry {
  id: string;
  url?: string;
  category?: string;
  level?: string;
}

interface IntegrityResult {
  valid: boolean;
  totalIssues: number;

  // Dimension 1: Registry → Research Directory
  reposInRegistry: number;
  reposInResearch: number;
  orphanedInRegistry: string[]; // in repos.json but missing research
  orphanedInResearch: string[]; // in research/ but not in repos.json
  missingReadmes: string[]; // have manifest but no README

  // Dimension 2: Registry → Source Clone
  reposCloned: number;
  reposNotCloned: string[]; // in registry but no source clone

  // Dimension 3: Research → Manifests
  researchDirsScanned: number;
  validManifests: number;
  invalidManifests: { path: string; error: string }[];
  missingManifests: string[]; // have research dir but no manifest
  outputsMissing: { repoId: string; outputs: string[] }[]; // outputs listed in manifest don't exist

  // Dimension 4: Manifests → Indexes
  requiredIndexes: string[];
  indexesFound: string[];
  indexesMissing: string[];

  // Dimension 5: Index Validity
  validIndexes: string[];
  invalidIndexes: { path: string; error: string }[];
  indexRefsInvalid: { indexPath: string; missingRefs: string[] }[];
}

// ============================================================================
// Helper Functions
// ============================================================================

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

async function validateManifest(repoId: string): Promise<{ valid: boolean; error?: string; manifest?: object }> {
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

    return { valid: true, manifest };
  } catch (error) {
    return { valid: false, error: `Parse error: ${error}` };
  }
}

async function checkManifestOutputs(repoId: string, manifest: { outputs?: string[] }): Promise<string[]> {
  const missingOutputs: string[] = [];
  const outputs = manifest.outputs || [];

  for (const output of outputs) {
    const outputPath = `research/github/${repoId}/${output}`;
    if (!existsSync(outputPath)) {
      missingOutputs.push(output);
    }
  }

  return missingOutputs;
}

// ============================================================================
// Main Verification Logic
// ============================================================================

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
    totalIssues: 0,

    // Dimension 1: Registry → Research Directory
    reposInRegistry: registryIds.size,
    reposInResearch: researchIds.size,
    orphanedInRegistry: [],
    orphanedInResearch: [],
    missingReadmes: [],

    // Dimension 2: Registry → Source Clone
    reposCloned: 0,
    reposNotCloned: [],

    // Dimension 3: Research → Manifests
    researchDirsScanned: researchIds.size,
    validManifests: 0,
    invalidManifests: [],
    missingManifests: [],
    outputsMissing: [],

    // Dimension 4: Manifests → Indexes
    requiredIndexes: ["data/generated/github-index.json", "data/generated/domain-index.json"],
    indexesFound: [],
    indexesMissing: [],

    // Dimension 5: Index Validity
    validIndexes: [],
    invalidIndexes: [],
    indexRefsInvalid: [],
  };

  // =========================================================================
  // Dimension 1: Registry → Research Directory
  // =========================================================================
  for (const repo of registryRepos) {
    const researchPath = `research/github/${repo.id}`;
    if (!existsSync(researchPath)) {
      result.orphanedInRegistry.push(repo.id);
    } else {
      // Check if README exists
      if (!existsSync(`${researchPath}/README.md`)) {
        result.missingReadmes.push(repo.id);
      }
    }
  }

  // Check for orphaned entries in research directory
  for (const repoId of researchIds) {
    if (!registryIds.has(repoId)) {
      result.orphanedInResearch.push(repoId);
    }
  }

  // =========================================================================
  // Dimension 2: Registry → Source Clone
  // =========================================================================
  for (const repo of registryRepos) {
    const sourcePath = `sources/github/${repo.id}`;
    if (existsSync(sourcePath)) {
      result.reposCloned++;
    } else {
      result.reposNotCloned.push(repo.id);
    }
  }

  // =========================================================================
  // Dimension 3: Research → Manifests (including output validation)
  // =========================================================================
  for (const repoId of researchIds) {
    const researchPath = `research/github/${repoId}`;
    const manifestPath = `${researchPath}/manifest.json`;

    if (!existsSync(manifestPath)) {
      result.missingManifests.push(repoId);
      continue;
    }

    const validation = await validateManifest(repoId);
    if (!validation.valid) {
      result.invalidManifests.push({
        path: manifestPath,
        error: validation.error || "Unknown error",
      });
      continue;
    }

    result.validManifests++;

    // Check that outputs listed in manifest actually exist
    if (validation.manifest && typeof validation.manifest === "object") {
      const missingOutputs = await checkManifestOutputs(repoId, validation.manifest as { outputs?: string[] });
      if (missingOutputs.length > 0) {
        result.outputsMissing.push({ repoId, outputs: missingOutputs });
      }
    }
  }

  // =========================================================================
  // Dimension 4: Manifests → Indexes
  // =========================================================================
  for (const indexPath of result.requiredIndexes) {
    if (existsSync(indexPath)) {
      result.indexesFound.push(indexPath);
    } else {
      result.indexesMissing.push(indexPath);
    }
  }

  // =========================================================================
  // Dimension 5: Index Validity
  // =========================================================================
  const registryIdSet = new Set(registryRepos.map(r => r.id));

  for (const indexPath of result.indexesFound) {
    try {
      const content = await Bun.file(indexPath).text();
      const indexData = JSON.parse(content);

      let refsValid = true;
      const missingRefs: string[] = [];

      // Validate github-index.json references
      if (indexPath === "data/generated/github-index.json") {
        if (indexData.repositories && Array.isArray(indexData.repositories)) {
          for (const repo of indexData.repositories) {
            if (repo.id && !registryIdSet.has(repo.id)) {
              refsValid = false;
              missingRefs.push(repo.id);
            }
          }
        }
      }

      // Validate domain-index.json structure
      if (indexPath === "data/generated/domain-index.json") {
        if (!indexData.domains || typeof indexData.domains !== "object") {
          refsValid = false;
          missingRefs.push("missing 'domains' object");
        }
      }

      if (!refsValid) {
        result.indexRefsInvalid.push({ indexPath, missingRefs });
      } else {
        result.validIndexes.push(indexPath);
      }
    } catch (error) {
      result.invalidIndexes.push({
        path: indexPath,
        error: `Parse error: ${error}`,
      });
    }
  }

  // =========================================================================
  // Calculate overall validity
  // =========================================================================
  result.totalIssues =
    result.orphanedInRegistry.length +
    result.orphanedInResearch.length +
    result.missingReadmes.length +
    result.reposNotCloned.length +
    result.invalidManifests.length +
    result.missingManifests.length +
    result.outputsMissing.length +
    result.indexesMissing.length +
    result.invalidIndexes.length +
    result.indexRefsInvalid.length;

  result.valid = result.totalIssues === 0;

  return result;
}

// ============================================================================
// Output Formatting
// ============================================================================

function printResults(result: IntegrityResult): void {
  console.log("📊 Research Integrity Report");
  console.log("=".repeat(50));
  console.log();

  // Dimension 1: Registry → Research Directory
  console.log("1️⃣  Registry → Research Directory");
  console.log(`   Repos in registry: ${result.reposInRegistry}`);
  console.log(`   Repos with research: ${result.reposInResearch}`);
  if (result.orphanedInRegistry.length > 0) {
    console.log(`   Missing: ${result.orphanedInRegistry.join(", ")}`);
  } else {
    console.log(`   Missing: none`);
  }
  if (result.orphanedInResearch.length > 0) {
    console.log(`   Orphaned in research: ${result.orphanedInResearch.join(", ")}`);
  }
  if (result.missingReadmes.length > 0) {
    console.log(`   Missing README.md: ${result.missingReadmes.join(", ")}`);
  }
  console.log();

  // Dimension 2: Registry → Source Clone
  console.log("2️⃣  Registry → Source Clone");
  console.log(`   Repos in registry: ${result.reposInRegistry}`);
  console.log(`   Repos cloned: ${result.reposCloned}`);
  if (result.reposNotCloned.length > 0) {
    console.log(`   Missing: ${result.reposNotCloned.join(", ")}`);
  } else {
    console.log(`   Missing: none`);
  }
  console.log();

  // Dimension 3: Research → Manifests
  console.log("3️⃣  Research → Manifests");
  console.log(`   Research dirs: ${result.researchDirsScanned}`);
  console.log(`   With valid manifest: ${result.validManifests}`);
  const manifestIssues: string[] = [];
  if (result.missingManifests.length > 0) {
    manifestIssues.push(`${result.missingManifests.length} missing`);
  }
  if (result.invalidManifests.length > 0) {
    manifestIssues.push(`${result.invalidManifests.length} invalid`);
  }
  if (result.outputsMissing.length > 0) {
    manifestIssues.push(`${result.outputsMissing.length} with missing outputs`);
  }
  if (manifestIssues.length > 0) {
    console.log(`   Issues: ${manifestIssues.join(", ")}`);
  } else {
    console.log(`   Issues: none`);
  }
  if (result.missingManifests.length > 0) {
    console.log(`   Missing manifest: ${result.missingManifests.join(", ")}`);
  }
  if (result.outputsMissing.length > 0) {
    for (const { repoId, outputs } of result.outputsMissing) {
      console.log(`   Missing outputs in ${repoId}: ${outputs.join(", ")}`);
    }
  }
  console.log();

  // Dimension 4: Manifests → Indexes
  console.log("4️⃣  Manifests → Indexes");
  console.log(`   Required indexes: ${result.requiredIndexes.length}`);
  console.log(`   Found: ${result.indexesFound.length}`);
  if (result.indexesMissing.length > 0) {
    console.log(`   Missing: ${result.indexesMissing.join(", ")}`);
  } else {
    console.log(`   Missing: none`);
  }
  console.log();

  // Dimension 5: Index Validity
  console.log("5️⃣  Index Validity");
  console.log(`   Valid indexes: ${result.validIndexes.length}`);
  if (result.invalidIndexes.length > 0) {
    console.log(`   Invalid (parse errors):`);
    for (const { path, error } of result.invalidIndexes) {
      console.log(`     - ${path}: ${error}`);
    }
  }
  if (result.indexRefsInvalid.length > 0) {
    console.log(`   Invalid (broken references):`);
    for (const { indexPath, missingRefs } of result.indexRefsInvalid) {
      console.log(`     - ${indexPath}: missing refs [${missingRefs.join(", ")}]`);
    }
  }
  if (result.invalidIndexes.length === 0 && result.indexRefsInvalid.length === 0) {
    console.log(`   Issues: none`);
  }
  console.log();

  // Overall summary
  console.log("-".repeat(50));
  if (result.valid) {
    console.log("Overall: ✅ All checks passed");
  } else {
    console.log(`Overall: ❌ ${result.totalIssues} issue(s) found`);
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

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
