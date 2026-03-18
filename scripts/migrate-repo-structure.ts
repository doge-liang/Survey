#!/usr/bin/env bun
/**
 * 迁移脚本：将仓库从旧格式 github/{owner}-{repo}/ 迁移到新格式 github/{owner}/{repo}/
 * 
 * 同时更新 data/repos.json 中的 id 字段
 */

import * as fs from "fs";
import * as path from "path";

const GITHUB_DIR = path.join(process.cwd(), "sources", "github");
const REPOS_FILE = path.join(process.cwd(), "data", "repos.json");

// 手动确认的仓库映射（不在 repos.json 中的）
const MANUAL_MAPPINGS: Record<string, { owner: string; repo: string; url?: string }> = {
  "inception-rag": { owner: "inception-rag", repo: "inception-rag", url: "https://github.com/inception-rag/inception-rag" },
  "Infrasys-AI-AIInfra": { owner: "Infrasys-AI", repo: "AIInfra", url: "https://github.com/Infrasys-AI/AIInfra" },
  "Infrasys-AI-AISystem": { owner: "Infrasys-AI", repo: "AISystem", url: "https://github.com/Infrasys-AI/AISystem" },
  "kiranpalsingh1806-awesome-leetcode": { owner: "kiranpalsingh1806", repo: "awesome-leetcode", url: "https://github.com/kiranpalsingh1806/awesome-leetcode" },
  "llama-models": { owner: "meta-llama", repo: "llama-models", url: "https://github.com/meta-llama/llama-models" },
  "oh-my-opencode": { owner: "code-yeongyu", repo: "oh-my-opencode", url: "https://github.com/code-yeongyu/oh-my-opencode" },
  "QasimWani-LeetHub": { owner: "QasimWani", repo: "LeetHub", url: "https://github.com/QasimWani/LeetHub" },
  "youngyangyang04-leetcode-master": { owner: "youngyangyang04", repo: "leetcode-master", url: "https://github.com/youngyangyang04/leetcode-master" },
};

interface Repo {
  id: string;
  url: string;
  owner: string;
  repo: string;
  description?: string;
  stars?: number | null;
  tags?: string[];
  level?: string;
  cloned_at?: string | null;
  last_commit?: string | null;
}

interface RepoRegistry {
  version: string;
  updated_at: string;
  repos: Repo[];
}

function loadRepos(): RepoRegistry {
  const content = fs.readFileSync(REPOS_FILE, "utf-8");
  return JSON.parse(content);
}

function saveRepos(registry: RepoRegistry) {
  fs.writeFileSync(REPOS_FILE, JSON.stringify(registry, null, 2) + "\n");
}

function getRepoMapping(dirName: string, registry: RepoRegistry): { owner: string; repo: string } | null {
  // 首先检查是否在 repos.json 中
  const repoEntry = registry.repos.find(r => r.id === dirName);
  if (repoEntry) {
    return { owner: repoEntry.owner, repo: repoEntry.repo };
  }
  
  // 然后检查手动映射
  const manual = MANUAL_MAPPINGS[dirName];
  if (manual) {
    return { owner: manual.owner, repo: manual.repo };
  }
  
  return null;
}

async function migrateRepo(oldDir: string, owner: string, repo: string): Promise<boolean> {
  const oldPath = path.join(GITHUB_DIR, oldDir);
  const newDir = path.join(GITHUB_DIR, owner, repo);
  
  // 确保新目录的父目录存在
  const parentDir = path.dirname(newDir);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
  
  // 检查目标目录是否已存在
  if (fs.existsSync(newDir)) {
    console.log(`  ⚠️  目标目录已存在: ${newDir}`);
    return false;
  }
  
  try {
    // 移动目录
    fs.renameSync(oldPath, newDir);
    console.log(`  ✓ 迁移成功: ${oldDir} → ${owner}/${repo}/`);
    return true;
  } catch (error) {
    console.log(`  ✗ 迁移失败: ${oldDir} - ${error}`);
    return false;
  }
}

async function main() {
  console.log("🚀 开始迁移仓库目录结构...\n");
  
  // 加载 repos.json
  const registry = loadRepos();
  console.log(`📋 已加载 repos.json，包含 ${registry.repos.length} 个仓库记录\n`);
  
  // 获取 github 目录下的所有子目录
  const items = fs.readdirSync(GITHUB_DIR, { withFileTypes: true });
  const directories = items
    .filter(item => item.isDirectory())
    .map(item => item.name)
    .filter(name => name !== ".git");
  
  console.log(`📁 发现 ${directories.length} 个目录需要处理\n`);
  
  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const dir of directories) {
    const mapping = getRepoMapping(dir, registry);
    
    if (!mapping) {
      console.log(`⚠️  跳过: ${dir} (无法确定 owner/repo)`);
      skipped++;
      continue;
    }
    
    console.log(`📦 处理: ${dir}`);
    const success = await migrateRepo(dir, mapping.owner, mapping.repo);
    
    if (success) {
      migrated++;
    } else {
      failed++;
    }
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("📊 迁移统计:");
  console.log(`  ✓ 成功: ${migrated}`);
  console.log(`  ⚠️  跳过: ${skipped}`);
  console.log(`  ✗ 失败: ${failed}`);
  console.log("=".repeat(50));
  
  // 更新 repos.json 中的 id 字段
  console.log("\n📝 更新 repos.json...");
  let updated = 0;
  
  for (const repo of registry.repos) {
    const oldId = repo.id;
    const newId = `${repo.owner}/${repo.repo}`;
    
    if (oldId !== newId) {
      repo.id = newId;
      updated++;
      console.log(`  更新: ${oldId} → ${newId}`);
    }
  }
  
  // 添加手动映射的仓库到 repos.json（如果不存在）
  for (const [oldDir, info] of Object.entries(MANUAL_MAPPINGS)) {
    const newId = `${info.owner}/${info.repo}`;
    const exists = registry.repos.some(r => r.id === newId);
    
    if (!exists) {
      registry.repos.push({
        id: newId,
        url: info.url || `https://github.com/${info.owner}/${info.repo}`,
        owner: info.owner,
        repo: info.repo,
        description: "",
        stars: null,
        tags: [],
        level: "intermediate",
        cloned_at: new Date().toISOString(),
        last_commit: null,
      });
      console.log(`  添加: ${newId}`);
      updated++;
    }
  }
  
  // 保存更新后的 repos.json
  registry.updated_at = new Date().toISOString();
  saveRepos(registry);
  
  console.log(`\n✅ 更新了 ${updated} 条 repos.json 记录`);
  console.log("\n🎉 迁移完成！");
}

main().catch(console.error);
