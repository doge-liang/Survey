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
 *   bun scripts/sync-repos.ts --update-registry --rename-dirs  # also rename local dirs
 *   bun scripts/sync-repos.ts --verify       # verify registry integrity
 *   bun scripts/sync-repos.ts --verify-fix   # auto-fix orphaned repos
 *   bun scripts/sync-repos.ts --verify-fix --concurrent 3   # limit orphan clone concurrency
 *   bun scripts/sync-repos.ts --help       # show this help
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { $ } from "bun";

import {
  find as findRepo,
  list as listRepos,
  load as loadRegistry,
  save as saveRegistry,
  upsert as upsertRepo,
} from "./lib/repo-registry";
import type { Repo, RepoRegistry } from "./lib/repo-registry";

interface VerificationIssue {
  type: "orphaned" | "unindexed" | "invalid";
  repo: Repo | LocalRepo;
  message: string;
}

interface VerificationResult {
  orphaned: Repo[];
  unindexed: LocalRepo[];
  invalid: Repo[];
}

interface OrphanFixResult {
  owner: string;
  repo: string;
  status: "cloned" | "failed";
  message: string;
}

interface OrphanFixSummary {
  succeeded: number;
  failed: number;
  results: OrphanFixResult[];
}

interface OrphanFixProgress {
  current: number;
  total: number;
  owner: string;
  repo: string;
}

interface OrphanFixOptions {
  concurrency?: number;
  delayMs?: number;
  onProgress?: (progress: OrphanFixProgress) => void;
  sleepFn?: (ms: number) => Promise<void>;
}

interface LocalRepo {
  owner: string;
  repo: string;
  path: string;
}



/**
 * Get local directory for a repo
 */
function getRepoDir(owner: string, repo: string): string {
  // Nested format: owner/repo
  return path.join(GITHUB_DIR, owner, repo);
}

// Configuration
const GITHUB_DIR = path.join(process.cwd(), "sources", "github");
const REPOS_FILE = path.join(process.cwd(), "data", "repos.json");
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms
const DEFAULT_VERIFY_FIX_CONCURRENCY = 1;
const VERIFY_FIX_CLONE_DELAY = 500; // ms

// Parse CLI arguments
const args = process.argv.slice(2);

// Parse flags - check if they exist anywhere in args
const isCheck = args.includes("--check");
const isClone = args.includes("--clone");
const isPull = args.includes("--pull");
const isHelp = args.includes("--help") || args.includes("-h");
const isRenameDirs = args.includes("--rename-dirs");
const isUpdateRegistry = args.includes("--update-registry");
const isVerify = args.includes("--verify");
const isVerifyFix = args.includes("--verify-fix");
const isVerifyInteractive = args.includes("--verify-interactive");
const isVerifyMode = isVerifyCommand(args);
const verifyFixConcurrency = getVerifyFixConcurrency(args);

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
  bun scripts/sync-repos.ts --verify       # verify registry integrity
  bun scripts/sync-repos.ts --verify-fix   # auto-fix orphaned repos
  bun scripts/sync-repos.ts --verify-fix --concurrent 3   # limit orphan clone concurrency
  bun scripts/sync-repos.ts --help       # show this help

Output:
  ✓ cloned: owner/repo (new)
  ✓ updated: owner/repo (3 commits behind)
  ✓ up-to-date: owner/repo
  ✗ failed: owner/repo (error message)
`);
}

export function isVerifyCommand(cliArgs: string[]): boolean {
  return cliArgs.includes("--verify")
    || cliArgs.includes("--verify-fix")
    || cliArgs.includes("--verify-interactive");
}

function parsePositiveIntegerFlag(cliArgs: string[], flag: string): number | null {
  const index = cliArgs.indexOf(flag);
  if (index === -1 || index === cliArgs.length - 1) {
    return null;
  }

  const value = Number.parseInt(cliArgs[index + 1] || "", 10);
  if (!Number.isFinite(value) || value < 1) {
    return null;
  }

  return value;
}

function getVerifyFixConcurrency(cliArgs: string[]): number {
  return parsePositiveIntegerFlag(cliArgs, "--concurrent") ?? DEFAULT_VERIFY_FIX_CONCURRENCY;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isRetryableCloneError(error: unknown): boolean {
  const errorMsg = getErrorMessage(error).toLowerCase();

  return !(
    errorMsg.includes("not found")
    || errorMsg.includes("404")
    || errorMsg.includes("repository not found")
    || errorMsg.includes("authentication failed")
    || errorMsg.includes("could not read username")
    || errorMsg.includes("destination path")
    || errorMsg.includes("already exists")
  );
}

/**
 * Detect orphaned entries: in repos.json but no local repo exists
 */
function detectOrphanedEntries(registry: RepoRegistry): Repo[] {
  const orphaned: Repo[] = [];
  for (const repo of registry.repos) {
    const dir = getRepoDir(repo.owner, repo.repo);
    if (!fs.existsSync(dir)) {
      orphaned.push(repo);
    }
  }
  return orphaned;
}

function detectUnindexedRepos(registry: RepoRegistry, githubDir: string): LocalRepo[] {
  const unindexed: LocalRepo[] = [];
  const registryIds = new Set(
    registry.repos.map(r => r.owner + "/" + r.repo)
  );

  // Scan github/ directory for owner directories
  const owners = fs.readdirSync(githubDir).filter(f => {
    const stat = fs.statSync(path.join(githubDir, f));
    return stat.isDirectory() && !f.startsWith('.');
  });

  for (const owner of owners) {
    const ownerPath = path.join(githubDir, owner);
    const repos = fs.readdirSync(ownerPath).filter(f => {
      const stat = fs.statSync(path.join(ownerPath, f));
      return stat.isDirectory() && !f.startsWith('.');
    });

    for (const repo of repos) {
      const id = owner + "/" + repo;
      if (!registryIds.has(id)) {
        unindexed.push({ owner, repo, path: path.join(ownerPath, repo) });
      }
    }
  }

  return unindexed;
}

/**
 * Detect invalid entries: missing required fields
 */
function detectInvalidEntries(registry: RepoRegistry): Repo[] {
  const invalid: Repo[] = [];
  for (const repo of registry.repos) {
    if (!repo.id || !repo.owner || !repo.repo || !repo.url) {
      invalid.push(repo);
    }
  }
  return invalid;
}
/**
 * Run complete registry verification
 */
 function verifyRegistry(registry: RepoRegistry, githubDir: string): VerificationResult {
  return {
    orphaned: detectOrphanedEntries(registry),
    unindexed: detectUnindexedRepos(registry, githubDir),
    invalid: detectInvalidEntries(registry)
  };
}

function printVerificationReport(registry: RepoRegistry, result: VerificationResult): void {
  console.log("\n📋 Registry Verification Report");
  console.log("============================\n");
  
  const totalInRegistry = result.orphaned.length + (registry.repos?.length || 0) - result.orphaned.length;
  console.log(`Total repos in registry: ${registry.repos?.length || 0}`);
  
  // Orphaned entries
  console.log("\n🔴 Orphaned entries (in registry, no local clone):");
  if (result.orphaned.length === 0) {
    console.log("   ✓ None");
  } else {
    console.log(`   ⚠️  ${result.orphaned.length} found:`);
    for (const repo of result.orphaned) {
      console.log(`      - ${repo.owner}/${repo.repo} (${repo.url})`);
    }
  }
  
  // Unindexed repos
  console.log("\n🟡 Unindexed repos (local, not in registry):");
  if (result.unindexed.length === 0) {
    console.log("   ✓ None");
  } else {
    console.log(`   ⚠️  ${result.unindexed.length} found:`);
    for (const repo of result.unindexed) {
      console.log(`      - ${repo.owner}/${repo.repo}`);
      console.log(`        Path: ${repo.path}`);
    }
  }
  
  // Invalid entries
  console.log("\n🔴 Invalid entries (missing required fields):");
  if (result.invalid.length === 0) {
    console.log("   ✓ None");
  } else {
    console.log(`   ✗ ${result.invalid.length} found:`);
    for (const repo of result.invalid) {
      console.log(`      - ${repo.owner}/${repo.repo}`);
    }
  }
  console.log("\n============================");
}

/**
 * Handle verify commands
 */
async function handleVerifyCommand(): Promise<void> {
  console.log("\n🔍 Running registry verification...\n");

  const registry = loadRepos();
  const result = verifyRegistry(registry, GITHUB_DIR);

  printVerificationReport(registry, result);

  if (isVerifyFix || isVerifyInteractive) {
    console.log("\n🔧 Fix Mode:\n");

    if (result.orphaned.length > 0) {
      console.log(`Cloning ${result.orphaned.length} orphaned repos with concurrency ${verifyFixConcurrency}...\n`);

      const summary = await fixOrphanedRepos(registry, result.orphaned, cloneRepo, {
        concurrency: verifyFixConcurrency,
        delayMs: VERIFY_FIX_CLONE_DELAY,
        onProgress: ({ current, total, owner, repo }) => {
          console.log(`   Cloning ${current}/${total}: ${owner}/${repo}...`);
        },
      });

      for (const item of summary.results) {
        const fullName = `${item.owner}/${item.repo}`;
        if (item.status === "cloned") {
          console.log(`   ✓ Cloned: ${fullName}`);
        } else {
          console.log(`   ✗ Failed: ${fullName} - ${item.message}`);
        }
      }

      console.log(`\nOrphan clone summary: ${summary.succeeded} succeeded, ${summary.failed} failed`);

      if (summary.succeeded > 0) {
        saveRepos(registry);
        console.log(`\n✅ Registry updated: ${REPOS_FILE}`);
      }
    }

    if (result.unindexed.length > 0 && !isVerifyFix) {
      console.log("\n⚠️  Unindexed repos found. Run with --verify-fix to auto-add to registry.");
    }

    if (result.invalid.length > 0 && !isVerifyFix) {
      console.log("\n⚠️  Invalid entries found. Run with --verify-fix to remove from registry.");
    }
  }

  console.log("");
}

function createEmptyRegistry(): RepoRegistry {
  return {
    version: "1",
    updated_at: new Date().toISOString(),
    repos: [],
  };
}

function normalizeRegistry(registry: RepoRegistry): RepoRegistry {
  return {
    version: registry.version ?? "1",
    updated_at: registry.updated_at ?? new Date().toISOString(),
    repos: listRepos(registry),
  };
}

/**
 * Load repo registry from file
 */
function loadRepos(): RepoRegistry {
  if (!fs.existsSync(REPOS_FILE)) {
    console.warn(`⚠️  Repos file not found: ${REPOS_FILE}`);
    console.log("   Creating empty registry...");
    return createEmptyRegistry();
  }

  try {
    return normalizeRegistry(loadRegistry());
  } catch {
    // Intentionally ignored - repo file read errors use empty registry
  }
}

/**
 * Save repo registry to file
 */
function saveRepos(registry: RepoRegistry): void {
  saveRegistry({
    ...normalizeRegistry(registry),
    updated_at: new Date().toISOString(),
  });
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
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  shouldRetry: (error: unknown) => boolean = () => true
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error)) {
        break;
      }

      if (i < retries - 1) {
        const delay = RETRY_DELAY * Math.pow(2, i);
        console.log(`   Retry ${i + 1}/${retries} after ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw new Error(`Failed after ${retries} attempt(s): ${getErrorMessage(lastError)}`);
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
    // Intentionally ignored - git not available or not a repo
  }

/**
 * Get commit count behind origin
 */
async function getCommitsBehind(dir: string): Promise<number> {
  try {
    const result = await $.verbose(false)`cd ${dir} && git rev-list --count HEAD..origin/HEAD`.text();
    return parseInt(result.trim(), 10) || 0;
  } catch {
    // Intentionally ignored - git fetch failed
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

  if (fs.existsSync(dir) && !isGitRepo(dir)) {
    throw new Error(`destination already exists and is not a git repo: ${dir}`);
  }

  try {
    await withRetry(async () => {
      await $`git clone --depth 1 ${url} ${dir}`.quiet();
    }, MAX_RETRIES, isRetryableCloneError);
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    if (errorMsg.includes("not found") || errorMsg.includes("404")) {
      throw new Error("not found");
    }
    throw error;
  }
}
export async function fixOrphanedRepos(
  registry: RepoRegistry,
  orphanedRepos: Repo[],
  clone: (owner: string, repo: string) => Promise<void> = cloneRepo,
  options: OrphanFixOptions = {}
): Promise<OrphanFixSummary> {
  const concurrency = Math.max(1, Math.floor(options.concurrency ?? 1));
  const delayMs = Math.max(0, options.delayMs ?? 0);
  const sleepFn = options.sleepFn ?? sleep;
  const results: OrphanFixResult[] = new Array(orphanedRepos.length);

  const cloneSingleRepo = async (repo: Repo, index: number): Promise<void> => {
    if (isVerifyInteractive) {
      console.log(`Clone ${repo.owner}/${repo.repo}? (y/n)`);
      // In non-interactive context, just proceed
    }

    options.onProgress?.({
      current: index + 1,
      total: orphanedRepos.length,
      owner: repo.owner,
      repo: repo.repo,
    });

    try {
      await clone(repo.owner, repo.repo);
      await updateRepoEntry(registry, repo.owner, repo.repo, true);
      results[index] = {
        owner: repo.owner,
        repo: repo.repo,
        status: "cloned",
        message: "",
      };
    } catch (error) {
      await updateRepoEntry(registry, repo.owner, repo.repo, false);
      results[index] = {
        owner: repo.owner,
        repo: repo.repo,
        status: "failed",
        message: getErrorMessage(error),
      };
    }

    if (delayMs > 0 && index < orphanedRepos.length - 1) {
      await sleepFn(delayMs);
    }
  };

  if (concurrency === 1) {
    for (const [index, repo] of orphanedRepos.entries()) {
      await cloneSingleRepo(repo, index);
    }
  } else {
    let nextIndex = 0;
    const workerCount = Math.min(concurrency, orphanedRepos.length);
    const workers = Array.from({ length: workerCount }, async () => {
      while (nextIndex < orphanedRepos.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        await cloneSingleRepo(orphanedRepos[currentIndex]!, currentIndex);
      }
    });

    await Promise.all(workers);
  }

  const succeeded = results.filter(result => result?.status === "cloned").length;
  const failed = results.filter(result => result?.status === "failed").length;

  return {
    succeeded,
    failed,
    results,
  };
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
      // Intentionally ignored - git pull failed
    }
  }

function applyRegistryUpdate(target: RepoRegistry, next: RepoRegistry): void {
  target.version = next.version;
  target.updated_at = next.updated_at;
  target.repos = next.repos;
}

/**
 * Get or create repo entry in registry
 */
function getOrCreateRepoEntry(registry: RepoRegistry, owner: string, repo: string): Repo {
  const id = `${owner}/${repo}`;
  const existing = findRepo(registry, id)
    ?? registry.repos.find(entry => entry.owner === owner && entry.repo === repo);

  if (existing) {
    if (existing.id !== id || existing.url !== `https://github.com/${owner}/${repo}`) {
      const next = upsertRepo(normalizeRegistry(registry), {
        ...existing,
        id,
        url: `https://github.com/${owner}/${repo}`,
        owner,
        repo,
      });
      applyRegistryUpdate(registry, next);
      return findRepo(registry, id)!;
    }

    return existing;
  }

  const next = upsertRepo(normalizeRegistry(registry), {
    id,
    url: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
  });
  applyRegistryUpdate(registry, next);
  return findRepo(registry, id)!;
}

/**
 * Update repo entry after sync
 */
async function updateRepoEntry(registry: RepoRegistry, owner: string, repo: string, success: boolean): Promise<void> {
  const entry = getOrCreateRepoEntry(registry, owner, repo);
  
  if (success) {
    const dir = getRepoDir(owner, repo);
    const commit = await getCurrentCommit(dir);
    
    entry.last_commit = commit;
    // Only set cloned_at on first clone, not on pull
    if (!entry.cloned_at) {
      entry.cloned_at = new Date().toISOString();
    }
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
      await updateRepoEntry(registry, owner, repo, true);
      return { status: "cloned", message: "(new)" };
    } else {
      // Pull
      const commitsBehind = await pullRepo(owner, repo);
      await updateRepoEntry(registry, owner, repo, true);
      
      if (commitsBehind > 0) {
        return { status: "updated", message: `(${commitsBehind} commits behind)` };
      } else {
        return { status: "up-to-date", message: "" };
      }
    }
  } catch (error) {
    const errorMsg = String(error);
    await updateRepoEntry(registry, owner, repo, false);
    
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
    // Intentionally ignored - check failed
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
  const oldId = `${oldOwner}/${oldRepo}`;
  const newId = `${newOwner}/${newRepo}`;
  const entry = findRepo(registry, oldId)
    ?? registry.repos.find(repo => repo.owner === oldOwner && repo.repo === oldRepo);

  if (entry) {
    const next = upsertRepo(normalizeRegistry(registry), {
      ...entry,
      owner: newOwner,
      repo: newRepo,
      url: `https://github.com/${newOwner}/${newRepo}`,
      id: newId,
      renamed_at: new Date().toISOString(),
    });
    applyRegistryUpdate(registry, next);

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
  } else if (isVerifyMode) {
    // Verify mode - check registry integrity
    await handleVerifyCommand();
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

if (import.meta.main) {
  main().catch(console.error);
}
