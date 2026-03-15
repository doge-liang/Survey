/**
 * Repository Sync Script
 * 
 * Syncs GitHub repositories from registry
 * 
 * Usage:
 *   bun scripts/sync-repos.ts              # sync all repos (clone or pull)
 *   bun scripts/sync-repos.ts --check      # check which repos have updates
 *   bun scripts/sync-repos.ts --clone      # only clone missing repos
 *   bun scripts/sync-repos.ts --pull       # only pull existing repos
 *   bun scripts/sync-repos.ts <owner/repo> # sync a single repo
 *   bun scripts/sync-repos.ts --update-registry  # check for repo renames
 *   bun scripts/sync-repos.ts --update-registry --rename-dirs  # also rename local dirs
 *   bun scripts/sync-repos.ts --help       # show this help
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { $ } from "bun";

// Types
interface Repo {
  id: string;
  url: string;
  owner: string;
  repo: string;
  stars?: number;
  tags?: string[];
  cloned_at?: string;
  last_commit?: string;
  renamed_at?: string;
}

interface RepoRegistry {
  repos: Repo[];
  version?: string;
  updated_at?: string;
}

// Configuration
const GITHUB_DIR = path.join(process.cwd(), "github");
const REPOS_FILE = path.join(process.cwd(), "data", "repos.json");
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

// Parse CLI arguments
const args = process.argv.slice(2);

// Parse flags - check if they exist anywhere in args
const isCheck = args.includes("--check");
const isClone = args.includes("--clone");
const isPull = args.includes("--pull");
const isHelp = args.includes("--help") || args.includes("-h");
const isUpdateRegistry = args.includes("--update-registry");
const isRenameDirs = args.includes("--rename-dirs");

// Find single repo (format: owner/repo)
const singleRepo = args.find(a => a.includes("/") && !a.startsWith("-")) || null;

/**
 * Print usage
 */
function printUsage(): void {
  console.log(`
Repository Sync Script

Usage:
  bun scripts/sync-repos.ts              # sync all repos (clone or pull)
  bun scripts/sync-repos.ts --check      # check which repos have updates
  bun scripts/sync-repos.ts --clone      # only clone missing repos
  bun scripts/sync-repos.ts --pull       # only pull existing repos
  bun scripts/sync-repos.ts <owner/repo> # sync a single repo
  bun scripts/sync-repos.ts --update-registry  # check for repo renames
  bun scripts/sync-repos.ts --update-registry --rename-dirs  # also rename local dirs
  bun scripts/sync-repos.ts --help       # show this help

Output:
  ✓ cloned: owner/repo (new)
  ✓ updated: owner/repo (3 commits behind)
  ✓ up-to-date: owner/repo
  ✗ failed: owner/repo (error message)
`);
}

/**
 * Load repo registry from file
 */
function loadRepos(): RepoRegistry {
  if (!fs.existsSync(REPOS_FILE)) {
    console.warn(`⚠️  Repos file not found: ${REPOS_FILE}`);
    console.log("   Creating empty registry...");
    return { repos: [] };
  }
  
  try {
    const content = fs.readFileSync(REPOS_FILE, "utf-8");
    const parsed = JSON.parse(content);
    // Handle both formats: { repos: [...] } or { version: "...", repos: [...] }
    if (Array.isArray(parsed)) {
      return { repos: parsed };
    }
    if (parsed.repos && Array.isArray(parsed.repos)) {
      return parsed;
    }
    return { repos: [] };
  } catch (error) {
    console.error(`Error reading repos file: ${error}`);
    return { repos: [] };
  }
}

/**
 * Save repo registry to file
 */
function saveRepos(registry: RepoRegistry): void {
  const dataDir = path.dirname(REPOS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(REPOS_FILE, JSON.stringify(registry, null, 2), "utf-8");
}

/**
 * Get repo directory path
 */
function getRepoDir(owner: string, repo: string): string {
  // Sanitize repo name for directory (replace / with -)
  const dirName = `${owner}-${repo}`.replace(/\//g, "-");
  return path.join(GITHUB_DIR, dirName);
}

/**
 * Sleep for specified ms
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry helper with exponential backoff
 */
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        const delay = RETRY_DELAY * Math.pow(2, i);
        console.log(`   Retry ${i + 1}/${retries} after ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Check if directory is a git repo
 */
function isGitRepo(dir: string): boolean {
  return fs.existsSync(path.join(dir, ".git"));
}

/**
 * Get current commit hash
 */
async function getCurrentCommit(dir: string): Promise<string | null> {
  try {
    const result = await $.verbose(false)`cd ${dir} && git rev-parse HEAD`.text();
    return result.trim();
  } catch {
    return null;
  }
}

/**
 * Get commit count behind origin
 */
async function getCommitsBehind(dir: string): Promise<number> {
  try {
    const result = await $.verbose(false)`cd ${dir} && git rev-list --count HEAD..origin/HEAD`.text();
    return parseInt(result.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

/**
 * Check if repo has updates
 */
async function checkForUpdates(owner: string, repo: string): Promise<{ hasUpdates: boolean; commitsBehind: number }> {
  const dir = getRepoDir(owner, repo);
  
  if (!isGitRepo(dir)) {
    return { hasUpdates: false, commitsBehind: 0 };
  }
  
  const commitsBehind = await getCommitsBehind(dir);
  return { hasUpdates: commitsBehind > 0, commitsBehind };
}

/**
 * Clone a repository
 */
async function cloneRepo(owner: string, repo: string): Promise<void> {
  const dir = getRepoDir(owner, repo);
  const url = `https://github.com/${owner}/${repo}.git`;
  
  console.log(`   Cloning ${url}...`);
  
  try {
    await withRetry(async () => {
      await $`git clone --depth 1 ${url} ${dir}`.quiet();
    });
  } catch (error) {
    // Check if it's a "repo not found" error
    const errorMsg = String(error);
    if (errorMsg.includes("not found") || errorMsg.includes("404")) {
      throw new Error("not found");
    }
    throw error;
  }
}

/**
 * Pull a repository
 */
async function pullRepo(owner: string, repo: string): Promise<number> {
  const dir = getRepoDir(owner, repo);
  
  if (!isGitRepo(dir)) {
    throw new Error("not a git repo");
  }
  
  try {
    await withRetry(async () => {
      // First do a fetch to get latest
      await $.verbose(false)`cd ${dir} && git fetch origin`.quiet();
      // Then rebase on top of origin/HEAD
      await $`cd ${dir} && git rebase`.quiet();
    });
    
    const commitsBehind = await getCommitsBehind(dir);
    return commitsBehind;
  } catch {
    // Try pull as fallback
    try {
      await $`cd ${dir} && git pull --rebase`.quiet();
      return await getCommitsBehind(dir);
    } catch {
      return 0;
    }
  }
}

/**
 * Get or create repo entry in registry
 */
function getOrCreateRepoEntry(registry: RepoRegistry, owner: string, repo: string): Repo {
  const id = `${owner}-${repo}`.replace(/\//g, "-");
  
  // Ensure repos array exists
  if (!registry.repos) {
    registry.repos = [];
  }
  
  let entry = registry.repos.find(r => r.id === id || (r.owner === owner && r.repo === repo));
  
  if (!entry) {
    entry = {
      id,
      url: `https://github.com/${owner}/${repo}`,
      owner,
      repo,
    };
    registry.repos.push(entry);
  }
  
  return entry;
}

/**
 * Update repo entry after sync
 */
function updateRepoEntry(registry: RepoRegistry, owner: string, repo: string, success: boolean): void {
  const entry = getOrCreateRepoEntry(registry, owner, repo);
  
  if (success) {
    const dir = getRepoDir(owner, repo);
    const commit = await getCurrentCommit(dir);
    
    entry.last_commit = commit ?? undefined;
    // Only set cloned_at on first clone, not on pull
    if (!entry.cloned_at) {
      entry.cloned_at = new Date().toISOString();
    }
  }
    const dir = getRepoDir(owner, repo);
    const commit = getCurrentCommit(dir);
    
    entry.last_commit = commit as string;
    entry.cloned_at = new Date().toISOString();
  }
}

/**
 * Sync a single repository
 */
async function syncRepo(
  registry: RepoRegistry,
  owner: string,
  repo: string,
  forceClone = false
): Promise<{ status: "cloned" | "updated" | "up-to-date" | "failed"; message: string }> {
  const dir = getRepoDir(owner, repo);
  const exists = fs.existsSync(dir) && isGitRepo(dir);
  
  try {
    if (!exists || forceClone) {
      // Clone
      await cloneRepo(owner, repo);
      updateRepoEntry(registry, owner, repo, true);
      return { status: "cloned", message: "(new)" };
    } else {
      // Pull
      const commitsBehind = await pullRepo(owner, repo);
      updateRepoEntry(registry, owner, repo, true);
      
      if (commitsBehind > 0) {
        return { status: "updated", message: `(${commitsBehind} commits behind)` };
      } else {
        return { status: "up-to-date", message: "" };
      }
    }
  } catch (error) {
    const errorMsg = String(error);
    updateRepoEntry(registry, owner, repo, false);
    
    if (errorMsg.includes("not found")) {
      return { status: "failed", message: "(not found)" };
    }
    
    return { status: "failed", message: `(${errorMsg.slice(0, 50)})` };
  }
}

/**
 * Check updates for a repository
 */
async function checkRepoUpdates(
  owner: string,
  repo: string
): Promise<{ status: "has-updates" | "up-to-date" | "not-cloned" | "failed"; commitsBehind: number }> {
  const dir = getRepoDir(owner, repo);
  
  if (!isGitRepo(dir)) {
    return { status: "not-cloned", commitsBehind: 0 };
  }
  
  try {
    const { hasUpdates, commitsBehind } = await checkForUpdates(owner, repo);
    
    if (hasUpdates) {
      return { status: "has-updates", commitsBehind };
    } else {
      return { status: "up-to-date", commitsBehind: 0 };
    }
  } catch {
    return { status: "failed", commitsBehind: 0 };
  }
}

/**
 * Check if a repo has been renamed/moved
 */
async function checkRepoRedirect(
  owner: string,
  repo: string
): Promise<{ renamed: boolean; newOwner?: string; newRepo?: string }> {
  const url = `https://github.com/${owner}/${repo}`;
  
  try {
    const response = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": "Survey-Sync" },
    });
    
    if (response.status === 301 || response.status === 302) {
      const location = response.headers.get("location");
      if (location) {
        const match = location.match(/github\.com\/([^\/]+)\//);
        const newOwner = match?.[1];
        
        let newRepo = "";
        if (location.includes("?")) {
          const repoMatch = location.match(/github\.com\/[^\/]+\/([^?]+)/);
          newRepo = repoMatch?.[1] || "";
        } else {
          const parts = location.replace("https://github.com/", "").split("/");
          newRepo = parts.slice(1).join("/");
        }
        
        newRepo = newRepo.replace(/\.git$/, "");
        
        if (newOwner && newRepo && (newOwner !== owner || newRepo !== repo)) {
          return { renamed: true, newOwner, newRepo };
        }
      }
    }
    
    return { renamed: false };
  } catch {
    return { renamed: false };
  }
}

/**
 * Rename a local directory
 */
async function renameLocalDir(
  oldOwner: string,
  oldRepo: string,
  newOwner: string,
  newRepo: string
): Promise<boolean> {
  const oldDir = getRepoDir(oldOwner, oldRepo);
  const newDir = getRepoDir(newOwner, newRepo);
  
  if (!fs.existsSync(oldDir)) {
    console.log(`   ⚠️  Source directory not found: ${oldDir}`);
    return false;
  }
  
  if (fs.existsSync(newDir)) {
    console.log(`   ⚠️  Target directory already exists: ${newDir}`);
    return false;
  }
  
  try {
    fs.renameSync(oldDir, newDir);
    console.log(`   ✓ Renamed: ${oldDir} → ${newDir}`);
    return true;
  } catch (error) {
    console.log(`   ✗ Failed to rename: ${error}`);
    return false;
  }
}

/**
 * Update repo entry in registry after rename
 */
function updateRepoEntryAfterRename(
  registry: RepoRegistry,
  oldOwner: string,
  oldRepo: string,
  newOwner: string,
  newRepo: string
): void {
  const oldId = `${oldOwner}-${oldRepo}`.replace(/\//g, "-");
  const newId = `${newOwner}-${newRepo}`.replace(/\//g, "-");
  
  const entry = registry.repos.find(r => r.id === oldId);
  
  if (entry) {
    entry.owner = newOwner;
    entry.repo = newRepo;
    entry.url = `https://github.com/${newOwner}/${newRepo}`;
    entry.id = newId;
    entry.renamed_at = new Date().toISOString();
    
    console.log(`   ✓ Updated: ${oldOwner}/${oldRepo} → ${newOwner}/${newRepo}`);
  }
}

/**
 * Check all repos for renames
 */
async function checkAllRepoRenames(
  registry: RepoRegistry
): Promise<Array<{
  oldOwner: string;
  oldRepo: string;
  newOwner: string;
  newRepo: string;
  dirRenamed: boolean;
}>> {
  const results: Array<{
    oldOwner: string;
    oldRepo: string;
    newOwner: string;
    newRepo: string;
    dirRenamed: boolean;
  }> = [];
  
  console.log("🔍 检查仓库重命名...\n");
  
  for (const repo of registry.repos) {
    const fullName = `${repo.owner}/${repo.repo}`;
    const result = await checkRepoRedirect(repo.owner, repo.repo);
    
    if (result.renamed && result.newOwner && result.newRepo) {
      console.log(`⚠️  ${fullName} → ${result.newOwner}/${result.newRepo}`);
      
      // Save old owner/repo before updating registry
      const oldOwner = repo.owner;
      const oldRepo = repo.repo;
      
      // Update registry
      updateRepoEntryAfterRename(registry, oldOwner, oldRepo, result.newOwner, result.newRepo);
      
      // Optionally rename local dir
      let dirRenamed = false;
      if (isRenameDirs) {
        dirRenamed = await renameLocalDir(oldOwner, oldRepo, result.newOwner, result.newRepo);
      }
      
      results.push({
        oldOwner,
        oldRepo,
        newOwner: result.newOwner,
        newRepo: result.newRepo,
        dirRenamed,
      });
    } else {
      console.log(`✓ ${fullName} - 无变化`);
    }
  }
  
  return results;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  if (isHelp) {
    printUsage();
    return;
  }
  
  // Ensure github directory exists
  if (!fs.existsSync(GITHUB_DIR)) {
    fs.mkdirSync(GITHUB_DIR, { recursive: true });
  }
  
  // Load repos
  const registry = loadRepos();
  
  console.log("\n📦 Repository Sync");
  console.log("==================\n");
  
  // Determine which repos to process
  let reposToProcess: Repo[] = [];
  
  if (singleRepo) {
    // Single repo mode
    const [owner, repo] = singleRepo.split("/");
    if (!owner || !repo) {
      console.error("❌ Invalid repo format. Use: owner/repo");
      process.exit(1);
    }
    reposToProcess = [getOrCreateRepoEntry(registry, owner, repo)];
  } else {
    // All repos
    reposToProcess = registry.repos || [];
  }
  
  if (reposToProcess.length === 0) {
    console.log("⚠️  No repos to sync. Add repos to data/repos.json");
    return;
  }
  
  console.log(`Found ${reposToProcess.length} repo(s) to process\n`);
  
  const results: Array<{ owner: string; repo: string; status: string; message: string }> = [];
  
  if (isCheck) {
    // Check mode - just check for updates
    console.log("🔍 Checking for updates...\n");
    
    for (const repo of reposToProcess) {
      const result = await checkRepoUpdates(repo.owner, repo.repo);
      
      let status: string;
      let message: string;
      
      switch (result.status) {
        case "has-updates":
          status = "has-updates";
          message = `(${result.commitsBehind} commits behind)`;
          break;
        case "up-to-date":
          status = "up-to-date";
          message = "";
          break;
        case "not-cloned":
          status = "not-cloned";
          message = "(not cloned)";
          break;
        default:
          status = "failed";
          message = "(check failed)";
      }
      
      results.push({ owner: repo.owner, repo: repo.repo, status, message });
    }
  } else if (isUpdateRegistry) {
    // Update registry mode - check for repo renames
    const renameResults = await checkAllRepoRenames(registry);
    
    // Save registry
    saveRepos(registry);
    console.log(`\n✅ Registry updated: ${REPOS_FILE}`);
    
    // Summary
    const renamedCount = renameResults.length;
    const dirRenamedCount = renameResults.filter(r => r.dirRenamed).length;
    
    if (isRenameDirs) {
      console.log(`\n统计：${renamedCount} 个仓库已重命名，${dirRenamedCount} 个本地目录已重命名`);
    } else {
      console.log(`\n统计：${renamedCount} 个仓库已重命名，已更新 repos.json`);
      console.log(`\n提示：使用 --rename-dirs 同时重命名本地目录`);
    }
    
    console.log("");
    return;
  } else {
    // Sync mode
    for (const repo of reposToProcess) {
      const dir = getRepoDir(repo.owner, repo.repo);
      const exists = fs.existsSync(dir) && isGitRepo(dir);
      
      let result: { status: "cloned" | "updated" | "up-to-date" | "failed"; message: string };
      
      if (isClone && exists) {
        // Clone only mode - skip existing
        result = { status: "up-to-date", message: "(skipped)" };
      } else if (isPull && !exists) {
        // Pull only mode - skip missing
        result = { status: "failed", message: "(not cloned)" };
      } else {
        // Normal sync
        result = await syncRepo(registry, repo.owner, repo.repo);
      }
      
      results.push({ owner: repo.owner, repo: repo.repo, ...result });
    }
  }
  
  // Print results
  console.log("\n同步结果：");
  console.log("");
  
  for (const result of results) {
    const fullName = `${result.owner}/${result.repo}`;
    
    if (isCheck) {
      switch (result.status) {
        case "has-updates":
          console.log(`✓ ${fullName} ${result.message}`);
          break;
        case "up-to-date":
          console.log(`✓ up-to-date: ${fullName}`);
          break;
        case "not-cloned":
          console.log(`- not cloned: ${fullName}`);
          break;
        default:
          console.log(`✗ failed: ${fullName} ${result.message}`);
      }
    } else {
      switch (result.status) {
        case "cloned":
          console.log(`✓ cloned: ${fullName} ${result.message}`);
          break;
        case "updated":
          console.log(`✓ updated: ${fullName} ${result.message}`);
          break;
        case "up-to-date":
          console.log(`✓ up-to-date: ${fullName}`);
          break;
        default:
          console.log(`✗ failed: ${fullName} ${result.message}`);
      }
    }
  }
  
  // Summary
  const successCount = results.filter(r => 
    r.status === "cloned" || r.status === "updated" || r.status === "up-to-date" || r.status === "has-updates"
  ).length;
  const failedCount = results.filter(r => r.status === "failed").length;
  
  console.log(`\n统计：${successCount} 同步成功，${failedCount} 失败`);
  
  // Save registry if we did actual syncing
  if (!isCheck) {
    saveRepos(registry);
    console.log(`\n✅ Registry updated: ${REPOS_FILE}`);
  }
  
  console.log("");
}

main().catch(console.error);
