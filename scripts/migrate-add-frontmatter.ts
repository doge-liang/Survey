#!/usr/bin/env bun
/**
 * Migration Script: Add Frontmatter to Research Artifacts
 *
 * Adds YAML frontmatter to markdown files based on manifest.json fields.
 * Idempotent - skips files that already have frontmatter.
 *
 * Usage:
 *   bun scripts/migrate-add-frontmatter.ts
 *   bun scripts/migrate-add-frontmatter.ts --type papers
 *   bun scripts/migrate-add-frontmatter.ts --type github --dir research/
 *   bun scripts/migrate-add-frontmatter.ts --type all --dry-run
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { extractManifestFields, hasFrontmatter, addFrontmatterToMarkdown } from "./lib/frontmatter";

type ArtifactType = "papers" | "github" | "surveys" | "domains" | "all";

interface ArtifactConfig {
  type: ArtifactType;
  dir: string;
  dryRun: boolean;
}

interface MigrationResult {
  added: number;
  skipped: number;
  errors: number;
}

const ARTIFACT_CONFIGS: Record<Exclude<ArtifactType, "all">, { dir: string; mdFile: string; kind: string; manifestFile: string }> = {
  papers: { dir: "research/papers", mdFile: "notes.md", kind: "paper-notes", manifestFile: "metadata.json" },
  github: { dir: "research/github", mdFile: "README.md", kind: "github-analysis", manifestFile: "manifest.json" },
  surveys: { dir: "research/surveys", mdFile: "index.md", kind: "survey-synthesis", manifestFile: "manifest.json" },
  domains: { dir: "research/domains", mdFile: "index.md", kind: "domain-exploration", manifestFile: "manifest.json" },
};

function parseArgs(): ArtifactConfig {
  const args = process.argv.slice(2);
  const config: ArtifactConfig = { type: "all", dir: "research/", dryRun: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--type" && i + 1 < args.length) {
      const type = args[++i] as ArtifactType;
      if (["papers", "github", "surveys", "domains", "all"].includes(type)) {
        config.type = type;
      } else {
        console.error(`Unknown type: ${type}`);
        process.exit(1);
      }
    } else if (arg === "--dir" && i + 1 < args.length) {
      config.dir = args[++i];
    } else if (arg === "--dry-run") {
      config.dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  return config;
}

function printUsage(): void {
  console.log(`
Usage: bun scripts/migrate-add-frontmatter.ts [options]

Options:
  --type <type>    Artifact type: papers|github|surveys|domains|all (default: all)
  --dir <path>     Base directory (default: research/)
  --dry-run        Show what would be done without making changes
  --help, -h       Show this help message

Examples:
  bun scripts/migrate-add-frontmatter.ts
  bun scripts/migrate-add-frontmatter.ts --type github
  bun scripts/migrate-add-frontmatter.ts --type papers --dry-run
`);
}

async function processArtifact(
  artifactPath: string,
  mdFile: string,
  kind: string,
  manifestFile: string,
  dryRun: boolean
): Promise<{ added: boolean; skipped: boolean; error: boolean }> {
  const manifestPath = path.join(artifactPath, manifestFile);
  const mdPath = path.join(artifactPath, mdFile);

  let mdContent: string;
  try {
    mdContent = await fs.readFile(mdPath, "utf-8");
  } catch {
    return { added: false, skipped: false, error: true };
  }

  // Skip if already has frontmatter
  if (hasFrontmatter(mdContent)) {
    return { added: false, skipped: true, error: false };
  }

  // Try to read manifest - if it doesn't exist, error (no metadata to extract)
  let manifest: Record<string, unknown>;
  try {
    const manifestContent = await fs.readFile(manifestPath, "utf-8");
    manifest = JSON.parse(manifestContent);
  } catch {
    return { added: false, skipped: false, error: true };
  }

  const frontmatterData = extractManifestFields(manifest, kind);
  const newContent = addFrontmatterToMarkdown(mdContent, frontmatterData);

  if (dryRun) {
    return { added: true, skipped: false, error: false };
  }

  await fs.writeFile(mdPath, newContent, "utf-8");
  return { added: true, skipped: false, error: false };
}

async function findArtifacts(baseDir: string, mdFile: string): Promise<string[]> {
  const artifacts: string[] = [];

  async function walk(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const mdPath = path.join(fullPath, mdFile);
          try {
            await fs.access(mdPath);
            artifacts.push(fullPath);
          } catch {
            await walk(fullPath);
          }
        }
      }
    } catch {
      // Directory doesn't exist or can't be read, skip
    }
  }

  await walk(baseDir);
  return artifacts;
}

async function migrateType(
  type: Exclude<ArtifactType, "all">,
  baseDir: string,
  dryRun: boolean
): Promise<MigrationResult> {
  const config = ARTIFACT_CONFIGS[type];
  const result: MigrationResult = { added: 0, skipped: 0, errors: 0 };

  const searchDir = path.isAbsolute(baseDir)
    ? baseDir
    : path.join(process.cwd(), baseDir, config.dir.replace("research/", ""));

  const artifacts = await findArtifacts(searchDir, config.mdFile);

  for (const artifactPath of artifacts) {
    const relativePath = path.relative(process.cwd(), artifactPath);
    const mdPath = path.join(artifactPath, config.mdFile);

    const { added, skipped, error } = await processArtifact(
      artifactPath,
      config.mdFile,
      config.kind,
      config.manifestFile,
      dryRun
    );

    if (error) {
      console.log(`[${type}] Error processing ${relativePath}/${config.mdFile}`);
      result.errors++;
    } else if (skipped) {
      console.log(`[${type}] Skipping ${relativePath}/${config.mdFile} (already has frontmatter)`);
      result.skipped++;
    } else if (added) {
      if (dryRun) {
        console.log(`[${type}] Would add frontmatter to ${relativePath}/${config.mdFile}`);
      } else {
        console.log(`[${type}] Adding frontmatter to ${relativePath}/${config.mdFile}`);
      }
      result.added++;
    }
  }

  return result;
}

async function main(): Promise<void> {
  const config = parseArgs();

  const types: Array<Exclude<ArtifactType, "all">> = ["papers", "github", "surveys", "domains"];
  const typesToProcess = config.type === "all" ? types : [config.type as Exclude<ArtifactType, "all">];

  console.log("🚀 Starting frontmatter migration...\n");
  if (config.dryRun) {
    console.log("📝 DRY RUN MODE - No changes will be made\n");
  }

  const totalResult: MigrationResult = { added: 0, skipped: 0, errors: 0 };

  for (const type of typesToProcess) {
    const result = await migrateType(type, config.dir, config.dryRun);
    totalResult.added += result.added;
    totalResult.skipped += result.skipped;
    totalResult.errors += result.errors;
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Migration Summary:");
  console.log(`  ✓ Added: ${totalResult.added}`);
  console.log(`  - Skipped: ${totalResult.skipped}`);
  if (totalResult.errors > 0) {
    console.log(`  ✗ Errors: ${totalResult.errors}`);
  }
  console.log("=".repeat(50));

  if (config.dryRun) {
    console.log("\n📝 Run without --dry-run to apply changes");
  }
}

main().catch(console.error);
