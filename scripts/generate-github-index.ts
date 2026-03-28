/**
 * GitHub Index Generator
 *
 * Scans research/github directory and generates data/generated/github-index.json
 *
 * Usage: bun scripts/generate-github-index.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { resolvePath, getGithubPath } from "./lib/project-paths";
import { logger } from "./lib/logger";

const OUTPUT_FILE = path.join(process.cwd(), "data", "generated", "github-index.json");

interface GitHubIndex {
  version: string;
  generated_at: string;
  repositories: Array<{
    id: string;
    title?: string;
    tags?: string[];
    level?: string;
    language?: string;
  }>;
}

/**
 * Ensure directory exists
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Get all research/github subdirectories
 */
function getResearchDirs(): string[] {
  const githubPath = getGithubPath();

  if (!fs.existsSync(githubPath)) {
    console.warn(`GitHub research directory not found: ${githubPath}`);
    return [];
  }

  const ownerDirs = fs.readdirSync(githubPath, { withFileTypes: true });
  const repoDirs: string[] = [];

  for (const ownerDir of ownerDirs) {
    if (ownerDir.isDirectory()) {
      const ownerPath = path.join(githubPath, ownerDir.name);
      const repos = fs.readdirSync(ownerPath, { withFileTypes: true });

      for (const repoDir of repos) {
        if (repoDir.isDirectory()) {
          repoDirs.push(`${ownerDir.name}/${repoDir.name}`);
        }
      }
    }
  }

  return repoDirs;
}

/**
 * Read manifest for a repo and extract relevant fields
 */
function extractRepoData(repoId: string): { id: string; title?: string; tags?: string[]; level?: string; language?: string } | null {
  const manifestPath = resolvePath("github", ...repoId.split("/"), "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    logger.warn("generateGithubIndex", `No manifest found for ${repoId}`);
    return null;
  }

  try {
    const content = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);

    return {
      id: manifest.id || repoId,
      title: manifest.title,
      tags: manifest.tags,
      level: manifest.level,
      language: manifest.language,
    };
  } catch (error) {
    logger.error("generateGithubIndex", `Failed to parse manifest for ${repoId}`, error);
    return null;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log("🔍 Scanning GitHub research directory...");

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  ensureDir(outputDir);

  // Get all repo directories
  const repoIds = getResearchDirs();
  console.log(`Found ${repoIds.length} research entries`);

  // Extract data from each manifest
  const repositories: GitHubIndex["repositories"] = [];

  for (const repoId of repoIds) {
    const data = extractRepoData(repoId);
    if (data) {
      repositories.push(data);
    }
  }

  // Sort by ID
  repositories.sort((a, b) => a.id.localeCompare(b.id));

  // Build index
  const index: GitHubIndex = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    repositories,
  };

  // Write to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2), "utf-8");
  console.log(`✅ Written to ${OUTPUT_FILE}`);

  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`   Total repositories: ${repositories.length}`);
  console.log("\n✨ Done!");
}

main().catch(console.error);
