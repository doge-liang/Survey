#!/usr/bin/env bun
/**
 * GitHub 项目索引生成脚本
 * 自动扫描 github/ 目录，生成增强版项目索引 README.md
 * 支持增量更新和 AI 分析
 */

import { readdir, readFile, stat, writeFile } from "fs/promises";
import { join } from "path";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { createHash } from "crypto";
import type { ProjectMetadata, Config } from "./types.ts";
import { ProjectAnalyzer } from "./analyzer.ts";
import { loadConfig } from "./config.ts";

// 类别 Emoji 映射
const CATEGORY_EMOJI: Record<string, string> = {
  "llm基础": "🧠",
  "推理引擎": "⚡",
  "rag": "🔍",
  "agent": "🤖",
  "微调": "🎯",
  "向量数据库": "🗄️",
  "其他": "📦",
};

// 难度转星星
const COMPLEXITY_STARS: Record<string, string> = {
  simple: "⭐",
  medium: "⭐⭐",
  advanced: "⭐⭐⭐",
};

interface ProjectInfo {
  directory: string;
  name: string;
  description: string;
  repoUrl: string;
  lastUpdated?: string;
  categories?: string[];
  tags?: string[];
  summary?: string;
  complexity?: string;
  primaryLanguage?: string;
  contentHash?: string;
}

/**
 * 计算项目内容哈希（用于增量更新检测）
 */
function calculateContentHash(projectPath: string): string {
  const readmePath = join(projectPath, "README.md");
  const packagePath = join(projectPath, "package.json");

  let readme = "";
  let packageJson = "";

  try {
    if (existsSync(readmePath)) {
      readme = Bun.file(readmePath).text().then(t => t.slice(0, 3000)).catch(() => "");
    }
  } catch {}

  try {
    if (existsSync(packagePath)) {
      packageJson = Bun.file(packagePath).text().catch(() => "");
    }
  } catch {}

  // 同步版本
  const fs = require("fs");
  if (!readme && existsSync(readmePath)) {
    readme = fs.readFileSync(readmePath, "utf-8").slice(0, 3000);
  }
  if (!packageJson && existsSync(packagePath)) {
    packageJson = fs.readFileSync(packagePath, "utf-8");
  }

  return createHash("sha256")
    .update(JSON.stringify({ readme, packageJson }))
    .digest("hex");
}

/**
 * 扫描 github/ 目录获取所有项目
 */
async function scanProjects(githubDir: string): Promise<string[]> {
  const projects: string[] = [];

  try {
    const entries = await readdir(githubDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        projects.push(entry.name);
      }
    }
  } catch (error) {
    console.error(`❌ Error scanning directory: ${error}`);
  }

  return projects.sort((a, b) => a.localeCompare(b));
}

/**
 * 读取已缓存的 metadata
 */
async function loadMetadataCache(metadataPath: string): Promise<ProjectMetadata[]> {
  if (!existsSync(metadataPath)) {
    return [];
  }

  try {
    const content = await readFile(metadataPath, "utf-8");
    return JSON.parse(content) as ProjectMetadata[];
  } catch {
    return [];
  }
}

/**
 * 保存 metadata 缓存
 */
async function saveMetadataCache(metadataPath: string, metadata: ProjectMetadata[]): Promise<void> {
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2) + "\n");
}

/**
 * 获取需要分析的项目列表（增量更新）
 */
function getProjectsToAnalyze(
  projectDirs: string[],
  cachedMetadata: ProjectMetadata[]
): string[] {
  const cachedMap = new Map<string, ProjectMetadata>();
  for (const m of cachedMetadata) {
    cachedMap.set(m.directory, m);
  }

  return projectDirs.filter((dir) => {
    const cached = cachedMap.get(dir);
    if (!cached) return true; // 新项目

    // 检查内容是否变化
    const currentHash = calculateContentHash(join(process.cwd(), "github", dir));
    return currentHash !== cached.contentHash;
  });
}

/**
 * 获取单个项目的基础信息
 */
async function getProjectInfo(
  projectPath: string,
  directoryName: string
): Promise<ProjectInfo> {
  let name = directoryName;
  let description = "-";
  let repoUrl = "";

  // 1. 尝试从 package.json 获取信息
  try {
    const packageJsonPath = join(projectPath, "package.json");
    const packageContent = await readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageContent);

    name = packageJson.name || directoryName;
    description = packageJson.description || "-";

    if (packageJson.repository?.url) {
      repoUrl = packageJson.repository.url
        .replace(/^\git\+/, "")
        .replace(/\.git$/, "");
    }
  } catch {
    // package.json 不存在或解析失败
  }

  // 2. 尝试从 git remote 获取仓库 URL
  if (!repoUrl) {
    try {
      const remoteOutput = execSync("git remote -v", {
        cwd: projectPath,
        encoding: "utf-8",
      });
      const match = remoteOutput.match(/origin\s+(\S+)/);
      if (match) {
        repoUrl = match[1].replace(/\.git$/, "");
        if (repoUrl.startsWith("git@github.com:")) {
          repoUrl = repoUrl.replace("git@github.com:", "https://github.com/");
        }
      }
    } catch {
      // git remote 失败
    }
  }

  // 3. 尝试获取最后更新时间
  let lastUpdated: string | undefined;
  try {
    const gitStat = await stat(join(projectPath, ".git"));
    lastUpdated = gitStat.mtime.toISOString().split("T")[0];
  } catch {
    // 无法获取
  }

  const contentHash = calculateContentHash(projectPath);

  return {
    directory: directoryName,
    name,
    description,
    repoUrl,
    lastUpdated,
    contentHash,
  };
}

/**
 * 生成增强版 README.md 内容
 */
function generateEnhancedReadme(projects: ProjectInfo[]): string {
  const now = new Date().toISOString().split("T")[0];

  // 统计各类别数量
  const categoryCount = new Map<string, number>();
  for (const project of projects) {
    if (project.categories) {
      for (const cat of project.categories) {
        categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
      }
    }
  }

  // 按类别分组项目
  const projectsByCategory = new Map<string, ProjectInfo[]>();
  for (const project of projects) {
    const cats = project.categories && project.categories.length > 0
      ? project.categories
      : ["其他"];

    for (const cat of cats) {
      if (!projectsByCategory.has(cat)) {
        projectsByCategory.set(cat, []);
      }
      projectsByCategory.get(cat)!.push(project);
    }
  }

  // 构建 README 内容
  let content = `# GitHub 项目索引

> 自动生成 | 最后更新: ${now} | 项目总数: ${projects.length}

## 📊 统计
`;

  // 添加统计行
  const sortedCategories = Array.from(categoryCount.entries()).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sortedCategories) {
    const emoji = CATEGORY_EMOJI[cat] || "📦";
    content += `- ${emoji} ${cat}: ${count} 个\n`;
  }

  content += `\n## 项目列表\n`;

  // 按类别添加项目
  for (const [category, categoryProjects] of projectsByCategory) {
    const emoji = CATEGORY_EMOJI[category] || "📦";
    content += `\n### ${emoji} ${category}\n\n`;
    content += `| 项目 | 描述 | 语言 | 难度 |\n`;
    content += `|------|------|------|------|\n`;

    for (const project of categoryProjects) {
      const repoLink = project.repoUrl
        ? `[${project.name}](${project.repoUrl})`
        : project.name;
      const desc = project.summary || project.description;
      const shortDesc = desc.length > 40 ? desc.substring(0, 40) + "..." : desc;
      const lang = project.primaryLanguage || "-";
      const stars = project.complexity ? COMPLEXITY_STARS[project.complexity] || "-" : "-";

      content += `| ${repoLink} | ${shortDesc} | ${lang} | ${stars} |\n`;
    }
  }

  content += `
---

## 快速开始

### 查看项目详情

\`\`\`bash
# 进入项目目录
cd github/<project-name>

# 查看 README
cat README.md
\`\`\`

### 更新索引

\`\`\`bash
# 运行索引生成脚本
bun scripts/update-github-index.ts
\`\`\`

---

## 注意事项

- 克隆的源码目录已添加到 \`.gitignore\`，不会提交到主仓库
- 仅提交分析文档和本 README
- 支持增量更新：仅重新分析有变更的项目

---

*生成脚本: \`scripts/update-github-index.ts\`*
`;

  return content;
}

/**
 * 兼容性旧格式 README（无 AI 分析时）
 */
function generateBasicReadme(projects: ProjectInfo[]): string {
  const now = new Date().toISOString().split("T")[0];

  let content = `# GitHub 项目索引

> 本文档由脚本自动生成，最后更新于：${now}  
> 项目总数：${projects.length}

## 项目列表

| 目录 | 项目名 | 描述 | 仓库链接 |
|------|--------|------|----------|
`;

  for (const project of projects) {
    const repoLink = project.repoUrl
      ? `[GitHub](${project.repoUrl})`
      : "-";
    const shortDesc =
      project.description.length > 50
        ? project.description.substring(0, 50) + "..."
        : project.description;

    content += `| \`${project.directory}\` | ${project.name} | ${shortDesc} | ${repoLink} |\n`;
  }

  content += `
---

## 快速开始

### 查看项目详情

\`\`\`bash
# 进入项目目录
cd github/<project-name>

# 查看 README
cat README.md

# 创建分析文档
touch analysis.md notes.md
\`\`\`

### 更新索引

\`\`\`bash
# 运行索引生成脚本
bun scripts/update-github-index.ts
\`\`\`

---

## 注意事项

- 克隆的源码目录已添加到 \`.gitignore\`，不会提交到主仓库
- 仅提交分析文档和本 README

---

*生成脚本：\`scripts/update-github-index.ts\`*
`;

  return content;
}

/**
 * 主函数
 */
async function main() {
  const githubDir = join(process.cwd(), "github");
  const metadataPath = join(githubDir, "metadata.json");

  console.log("🔍 正在扫描 github/ 目录...");
  const projectDirs = await scanProjects(githubDir);
  console.log(`✅ 发现 ${projectDirs.length} 个项目`);

  // 加载配置
  const config = loadConfig();
  const hasLLM = !!config.llm.apiKey;

  let projects: ProjectInfo[] = [];

  if (!hasLLM) {
    // 无 LLM API Key，使用基础模式
    console.log("⚠️ 未检测到 LLM API Key，跳过 AI 分析");

    for (let i = 0; i < projectDirs.length; i++) {
      const dir = projectDirs[i];
      console.log(`[${i + 1}/${projectDirs.length}] 读取 ${dir}...`);
      const projectPath = join(githubDir, dir);
      const info = await getProjectInfo(projectPath, dir);
      projects.push(info);
    }

    console.log("📝 正在生成基础版 README.md...");
    const readmeContent = generateBasicReadme(projects);
    const readmePath = join(githubDir, "README.md");
    await Bun.write(readmePath, readmeContent);
    console.log(`✅ 索引已生成: ${readmePath}`);
  } else {
    // 使用 AI 分析
    console.log("🤖 检测到 LLM API Key，启用 AI 分析");

    // 加载缓存的 metadata
    const cachedMetadata = await loadMetadataCache(metadataPath);
    console.log(`📋 已缓存 ${cachedMetadata.length} 个项目的分析结果`);

    // 确定需要分析的项目
    const projectsToAnalyze = getProjectsToAnalyze(projectDirs, cachedMetadata);
    console.log(`🔄 需要分析 ${projectsToAnalyze.length} 个项目（增量模式）`);

    // 创建分析器
    const analyzer = new ProjectAnalyzer(config);

    // 先加载所有基础信息
    const basicInfos = new Map<string, ProjectInfo>();
    for (const dir of projectDirs) {
      const projectPath = join(githubDir, dir);
      const info = await getProjectInfo(projectPath, dir);
      basicInfos.set(dir, info);
    }

    // 分析需要更新的项目
    const allMetadata: ProjectMetadata[] = [...cachedMetadata];

    for (let i = 0; i < projectsToAnalyze.length; i++) {
      const dir = projectsToAnalyze[i];
      console.log(`[${i + 1}/${projectsToAnalyze.length}] 🧠 分析 ${dir}...`);

      try {
        const metadata = await analyzer.analyze(join(githubDir, dir));

        // 更新缓存
        const existingIndex = allMetadata.findIndex(m => m.directory === dir);
        if (existingIndex >= 0) {
          allMetadata[existingIndex] = metadata;
        } else {
          allMetadata.push(metadata);
        }

        // 合并基础信息
        const basicInfo = basicInfos.get(dir)!;
        projects.push({
          ...basicInfo,
          categories: metadata.categories,
          tags: metadata.tags,
          summary: metadata.summary,
          complexity: metadata.complexity,
          primaryLanguage: metadata.primaryLanguage,
          contentHash: metadata.contentHash,
        });
      } catch (error) {
        console.error(`❌ 分析失败 ${dir}: ${error}`);
        // 使用基础信息
        projects.push(basicInfos.get(dir)!);
      }
    }

    // 添加未变化的项目
    for (const dir of projectDirs) {
      if (!projectsToAnalyze.includes(dir)) {
        const cached = cachedMetadata.find(m => m.directory === dir);
        const basicInfo = basicInfos.get(dir)!;
        if (cached) {
          projects.push({
            ...basicInfo,
            categories: cached.categories,
            tags: cached.tags,
            summary: cached.summary,
            complexity: cached.complexity,
            primaryLanguage: cached.primaryLanguage,
            contentHash: cached.contentHash,
          });
        } else {
          projects.push(basicInfo);
        }
      }
    }

    // 保存 metadata 缓存
    await saveMetadataCache(metadataPath, allMetadata);
    console.log(`✅ Metadata 已保存: ${metadataPath}`);

    // 生成增强版 README
    console.log("📝 正在生成增强版 README.md...");
    const readmeContent = generateEnhancedReadme(projects);
    const readmePath = join(githubDir, "README.md");
    await Bun.write(readmePath, readmeContent);
    console.log(`✅ 索引已生成: ${readmePath}`);
  }

  console.log("\n提示: 运行 `git diff github/README.md` 查看变更");
}

// 运行主函数
main().catch((error) => {
  console.error("❌ 错误:", error);
  process.exit(1);
});
