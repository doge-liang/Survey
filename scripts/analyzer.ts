#!/usr/bin/env bun

import type { AnalysisResult, Config, ProjectMetadata } from "./types.ts";
import { LLMClient } from "./llm.ts";
import { loadConfig } from "./config.ts";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { mkdir, readFile } from "fs/promises";
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { basename, dirname, join, relative } from "path";

interface BasicInfo {
  name: string;
  description: string;
  readme: string;
  files: string[];
}

const VALID_CATEGORIES = new Set(["llm基础", "推理引擎", "rag", "agent", "微调", "向量数据库", "其他"]);
const VALID_COMPLEXITIES = new Set(["simple", "medium", "advanced"]);
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build"]);
const README_LIMIT = 3000;
const FILE_LIMIT = 20;

export class ProjectAnalyzer {
  private config: Config;
  private llm: LLMClient;

  constructor(config: Config) {
    this.config = config;
    this.llm = new LLMClient(config.llm);
  }

  async analyze(projectPath: string, force = false): Promise<ProjectMetadata> {
    const resolvedProjectPath = this.resolveProjectPath(projectPath);
    const info = await this.getProjectInfo(resolvedProjectPath);
    const directory = this.toWorkspacePath(resolvedProjectPath);
    const contentHash = this.calculateContentHash(resolvedProjectPath);
    const cached = force ? undefined : await this.readCachedMetadata(directory, contentHash);
    if (cached) {
      return cached;
    }

    const analysis = await this.analyzeWithLLM(resolvedProjectPath);
    const metadata: ProjectMetadata = {
      directory,
      name: info.name,
      description: info.description,
      repoUrl: this.getRepoUrl(resolvedProjectPath),
      categories: analysis.categories,
      tags: analysis.tags,
      summary: analysis.summary,
      complexity: analysis.complexity,
      primaryLanguage: analysis.primaryLanguage,
      lastUpdated: this.getLastUpdated(resolvedProjectPath),
      lastAnalyzed: new Date().toISOString(),
      contentHash,
    };

    await this.writeCachedMetadata(metadata);
    return metadata;
  }

  async analyzeWithLLM(projectPath: string): Promise<AnalysisResult> {
    const info = await this.getProjectInfo(projectPath);
    const response = await this.llm.analyze(this.generatePrompt(info));
    return this.parseAnalysisResponse(response);
  }

  async getProjectInfo(projectPath: string): Promise<BasicInfo> {
    const resolvedProjectPath = this.resolveProjectPath(projectPath);
    const packageJson = await this.readJsonFile<Record<string, unknown>>(join(resolvedProjectPath, "package.json"));
    const readme = await this.readTextFile(join(resolvedProjectPath, "README.md"), README_LIMIT);

    return {
      name: this.readString(packageJson?.name) || basename(resolvedProjectPath),
      description: this.readString(packageJson?.description) || "-",
      readme: readme || "README.md not found.",
      files: this.listProjectFiles(resolvedProjectPath),
    };
  }

  generatePrompt(info: BasicInfo): string {
    const prompt = `分析这个 GitHub 项目，返回 JSON 格式（不要其他内容）：

{
  "categories": ["分类1", "分类2"],
  "tags": ["标签1", "标签2"],
  "summary": "一句话描述项目核心功能",
  "complexity": "medium",
  "primaryLanguage": "Python"
}

分类从以下选择 2-4 个：llm基础, 推理引擎, rag, agent, 微调, 向量数据库, 其他
标签填写 3-8 个技术标签（如 python, pytorch, react）
难度选择：simple, medium, advanced
主语言填写主要编程语言

项目名称: ${info.name}
项目描述: ${info.description}

README 内容：
${info.readme}

文件结构：
${info.files.join("\n")}`;

    if (Buffer.byteLength(prompt, "utf8") <= 100_000) {
      return prompt;
    }

    const reducedReadme = info.readme.slice(0, 2000);
    return this.generatePrompt({ ...info, readme: `${reducedReadme}\n...[truncated]` });
  }

  parseAnalysisResponse(response: string): AnalysisResult {
    const parsed = JSON.parse(this.extractJson(response)) as Partial<AnalysisResult>;
    const categories = this.readValidatedArray(parsed.categories, 2, 4, (value) => VALID_CATEGORIES.has(value), "categories");
    const tags = this.readValidatedArray(parsed.tags, 3, 8, () => true, "tags");
    const summary = this.readRequiredString(parsed.summary, "summary");
    const complexity = this.readRequiredString(parsed.complexity, "complexity");
    const primaryLanguage = this.readRequiredString(parsed.primaryLanguage, "primaryLanguage");

    if (!VALID_COMPLEXITIES.has(complexity)) {
      throw new Error(`Invalid complexity: ${complexity}`);
    }

    return {
      categories,
      tags,
      summary,
      complexity: complexity as AnalysisResult["complexity"],
      primaryLanguage,
    };
  }

  calculateContentHash(projectPath: string): string {
    const resolvedProjectPath = this.resolveProjectPath(projectPath);
    const readmePath = join(resolvedProjectPath, "README.md");
    const packagePath = join(resolvedProjectPath, "package.json");
    const readme = existsSync(readmePath) ? readFileSync(readmePath, "utf-8").slice(0, README_LIMIT) : "";
    const packageJson = existsSync(packagePath) ? readFileSync(packagePath, "utf-8") : "";

    return createHash("sha256")
      .update(JSON.stringify({ readme, packageJson, files: this.listProjectFiles(resolvedProjectPath) }))
      .digest("hex");
  }

  private resolveProjectPath(projectPath: string): string {
    return projectPath.startsWith(process.cwd()) ? projectPath : join(process.cwd(), projectPath);
  }

  private listProjectFiles(projectPath: string): string[] {
    const files: string[] = [];
    const visit = (currentPath: string) => {
      if (files.length >= FILE_LIMIT) {
        return;
      }

      for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
        if (files.length >= FILE_LIMIT) {
          return;
        }

        const fullPath = join(currentPath, entry.name);
        const relativePath = relative(projectPath, fullPath).replace(/\\/g, "/");
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) {
            visit(fullPath);
          }
          continue;
        }

        files.push(relativePath);
      }
    };

    visit(projectPath);
    return files;
  }

  private async readCachedMetadata(directory: string, contentHash: string): Promise<ProjectMetadata | undefined> {
    const items = await this.readMetadataFile();
    return items.find((item) => item.directory === directory && item.contentHash === contentHash);
  }

  private async writeCachedMetadata(metadata: ProjectMetadata): Promise<void> {
    const outputPath = join(process.cwd(), this.config.outputFile);
    const items = await this.readMetadataFile();
    const filtered = items.filter((item) => item.directory !== metadata.directory);
    await mkdir(dirname(outputPath), { recursive: true });
    await Bun.write(outputPath, JSON.stringify([...filtered, metadata], null, 2) + "\n");
  }

  private async readMetadataFile(): Promise<ProjectMetadata[]> {
    const outputPath = join(process.cwd(), this.config.outputFile);
    if (!existsSync(outputPath)) {
      return [];
    }

    const content = await readFile(outputPath, "utf-8");
    const parsed = JSON.parse(content) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error(`${this.config.outputFile} must contain a JSON array`);
    }

    return parsed as ProjectMetadata[];
  }

  private async readJsonFile<T>(filePath: string): Promise<T | undefined> {
    try {
      return JSON.parse(await readFile(filePath, "utf-8")) as T;
    } catch {
      return undefined;
    }
  }

  private async readTextFile(filePath: string, limit: number): Promise<string> {
    try {
      return (await readFile(filePath, "utf-8")).slice(0, limit).trim();
    } catch {
      return "";
    }
  }

  private extractJson(response: string): string {
    const trimmed = response.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("LLM response does not contain JSON");
    }

    return match[0];
  }

  private readValidatedArray(
    value: unknown,
    min: number,
    max: number,
    validator: (item: string) => boolean,
    field: string,
  ): string[] {
    if (!Array.isArray(value)) {
      throw new Error(`${field} must be an array`);
    }
    if (value.length < min || value.length > max) {
      throw new Error(`${field} must have ${min}-${max} items`);
    }
    const result: string[] = [];
    for (const item of value) {
      if (typeof item !== "string") {
        throw new Error(`${field} must contain strings`);
      }
      if (!validator(item)) {
        throw new Error(`Invalid ${field} value: ${item}`);
      }
      result.push(item);
    }
    return result;
  }

  private readRequiredString(value: unknown, field: string): string {
    if (typeof value !== "string") {
      throw new Error(`${field} must be a string`);
    }
    return value.trim();
  }

  private readString(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
  }

  private toWorkspacePath(projectPath: string): string {
    return relative(process.cwd(), projectPath).replace(/\\/g, "/");
  }

  private getRepoUrl(projectPath: string): string {
    try {
      const output = execFileSync("git", ["remote", "get-url", "origin"], {
        cwd: projectPath,
        encoding: "utf-8",
      }).trim();
      return output.replace(/\.git$/, "").replace(/^git@github\.com:/, "https://github.com/");
    } catch {
      return "";
    }
  }

  private getLastUpdated(projectPath: string): string | undefined {
    try {
      const stats = statSync(join(projectPath, ".git"));
      return stats.mtime.toISOString().split("T")[0];
    } catch {
      return undefined;
    }
  }
}

// CLI
if (import.meta.main) {
  const args = process.argv.slice(2);
  const projectIndex = args.indexOf("--project");
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const usage = "Usage: bun scripts/analyzer.ts --project <path> [--dry-run] [--force]";

  if (args.includes("--help")) {
    console.log(usage);
    process.exit(0);
  }

  if (projectIndex === -1 || !args[projectIndex + 1]) {
    console.log(usage);
    process.exit(1);
  }

  const projectPath = args[projectIndex + 1];
  const config = loadConfig();
  const analyzer = new ProjectAnalyzer(config);

  if (dryRun) {
    const info = await analyzer.getProjectInfo(join(process.cwd(), projectPath));
    console.log("Project Info:");
    console.log(JSON.stringify(info, null, 2));
  } else {
    const metadata = await analyzer.analyze(projectPath, force);
    console.log("Analysis Result:");
    console.log(JSON.stringify(metadata, null, 2));
  }
}
