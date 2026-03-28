/**
 * Domain Index Generator
 * 
 * Scans domains/ directory and generates:
 * - Forward index: data/generated/domain-index.json
 * - Reverse index: data/generated/reverse-index.json
 * 
 * Usage bun scripts/generate:-domain-index.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";
import { logger } from "./lib/logger";
import { getDomainsPath } from "./lib/project-paths";

// Configuration
const DOMAINS_DIR = getDomainsPath();
const OUTPUT_DIR = path.join(process.cwd(), "data", "generated");
const FORWARD_INDEX_FILE = path.join(OUTPUT_DIR, "domain-index.json");
const REVERSE_INDEX_FILE = path.join(OUTPUT_DIR, "reverse-index.json");

// Types
interface DomainMetadata {
  id: string;
  title: string;
  file: string;
  level?: "beginner" | "intermediate" | "advanced";
  parents?: string[];
  prerequisites?: string[];
  related?: string[];
  tags?: string[];
}

interface DomainEntry extends DomainMetadata {
  // Computed fields
  children?: string[];
}

interface ForwardIndex {
  version: string;
  generated_at: string;
  domains: Record<string, DomainEntry>;
  aliases: Record<string, string>;
  stats: {
    total_domains: number;
    by_level: Record<string, number>;
  };
}

interface ReverseIndex {
  version: string;
  generated_at: string;
  children: Record<string, string[]>;
  dependents: Record<string, string[]>;
  related_from: Record<string, string[]>;
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
 * Get all domain directories
 */
function getDomainDirs(): string[] {
  if (!fs.existsSync(DOMAINS_DIR)) {
    console.warn(`Domains directory not found: ${DOMAINS_DIR}`);
    return [];
  }
  
  return fs.readdirSync(DOMAINS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
}

/**
 * Find learning-path.md or index.md in domain directory
 */
function findDomainFile(domainDir: string): string | null {
  const learningPath = path.join(DOMAINS_DIR, domainDir, "learning-path.md");
  const indexMd = path.join(DOMAINS_DIR, domainDir, "index.md");
  
  if (fs.existsSync(learningPath)) {
    return learningPath;
  }
  if (fs.existsSync(indexMd)) {
    return indexMd;
  }
  
  return null;
}

/**
 * Parse domain file and extract metadata
 */
VN|function parseDomainFile(domainDir: string, filePath: string): DomainMetadata | null {
JQ|  try {
QJ|    const content = fs.readFileSync(filePath, "utf-8");
SM|    const { data, content: body } = matter(content);
NJ|
QX|    // If frontmatter exists, use it
XZ|    if (Object.keys(data).length > 0) {
MP|      return {
VK|        id: data.id || domainDir.toLowerCase(),
TX|        title: data.title || domainDir,
NV|        file: path.relative(process.cwd(), filePath),
ZR|        level: data.level,
WS|        parents: data.parents || [],
RS|        prerequisites: data.prerequisites || [],
HJ|        related: data.related || [],
QY|        tags: data.tags || [],
QN|      };
PR|    }
RM|
JT|    // No frontmatter - extract from content
JP|    // Extract title from first heading
PW|    const titleMatch = body.match(/^#\s+(.+)$/m);
XT|    const title = titleMatch ? titleMatch[1] : domainDir;
WY|
YJ|    // Try to extract level from content
VZ|    let level: "beginner" | "intermediate" | "advanced" | undefined;
HJ|    const lowerContent = body.toLowerCase();
ZS|    if (lowerContent.includes("beginner") || lowerContent.includes("入门") || lowerContent.includes("基础")) {
NS|      level = "beginner";
WM|    } else if (lowerContent.includes("advanced") || lowerContent.includes("深入") || lowerContent.includes("进阶")) {
MR|      level = "advanced";
WJ|    } else if (lowerContent.includes("intermediate") || lowerContent.includes("中级")) {
QP|      level = "intermediate";
YJ|    }
QZ|
YS|    return {
SH|      id: domainDir.toLowerCase(),
QT|      title: title,
SV|      file: path.relative(process.cwd(), filePath),
MH|      level,
ZX|      parents: [],
YR|      prerequisites: [],
QV|      related: [],
MW|      tags: [],
    };
  } catch (error) {
    logger.error("parseDomainFile", `Failed to parse domain file: ${filePath}`, error);
    return null;
  }
YB|}

/**
 * Detect circular dependencies using DFS
 */
function detectCycle(
  domainId: string,
  domains: Record<string, DomainMetadata>,
  visited: Set<string>,
  recursionStack: Set<string>,
  path: string[]
): string[] | null {
  visited.add(domainId);
  recursionStack.add(domainId);
  path.push(domainId);
  
  const domain = domains[domainId];
  if (domain && domain.prerequisites) {
    for (const prereq of domain.prerequisites) {
      if (!visited.has(prereq)) {
        const cycle = detectCycle(prereq, domains, visited, recursionStack, [...path]);
        if (cycle) {
          return cycle;
        }
      } else if (recursionStack.has(prereq)) {
        // Found cycle
        const cyclePath = path.slice(path.indexOf(prereq));
        cyclePath.push(prereq);
        return cyclePath;
      }
    }
  }
  
  recursionStack.delete(domainId);
  return null;
}

/**
 * Check for circular dependencies
 */
function checkCircularDependencies(domains: Record<string, DomainMetadata>): string[] | null {
  const visited = new Set<string>();
  
  for (const domainId of Object.keys(domains)) {
    if (!visited.has(domainId)) {
      const cycle = detectCycle(domainId, domains, visited, new Set(), []);
      if (cycle) {
        return cycle;
      }
    }
  }
  
  return null;
}

/**
 * Build forward index
 */
function buildForwardIndex(domainEntries: DomainEntry[]): ForwardIndex {
  const domains: Record<string, DomainEntry> = {};
  const aliases: Record<string, string> = {};
  const levelCounts: Record<string, number> = {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
  };
  
  for (const entry of domainEntries) {
    // Add to domains map
    domains[entry.id] = entry;
    
    // Count by level
    if (entry.level && levelCounts[entry.level] !== undefined) {
      levelCounts[entry.level]++;
    }
    
    // Add alias for title if different from id
    if (entry.title.toLowerCase() !== entry.id) {
      aliases[entry.title] = entry.id;
    }
  }
  
  return {
    version: "1.0",
    generated_at: new Date().toISOString(),
    domains,
    aliases,
    stats: {
      total_domains: domainEntries.length,
      by_level: levelCounts,
    },
  };
}

/**
 * Build reverse index
 */
function buildReverseIndex(domains: Record<string, DomainMetadata>): ReverseIndex {
  const children: Record<string, string[]> = {};
  const dependents: Record<string, string[]> = {};
  const relatedFrom: Record<string, string[]> = {};
  
  // Build children map (inverse of parents)
  for (const [domainId, domain] of Object.entries(domains)) {
    if (domain.parents) {
      for (const parent of domain.parents) {
        if (!children[parent]) {
          children[parent] = [];
        }
        if (!children[parent].includes(domainId)) {
          children[parent].push(domainId);
        }
      }
    }
  }
  
  // Build dependents map (inverse of prerequisites)
  for (const [domainId, domain] of Object.entries(domains)) {
    if (domain.prerequisites) {
      for (const prereq of domain.prerequisites) {
        if (!dependents[prereq]) {
          dependents[prereq] = [];
        }
        if (!dependents[prereq].includes(domainId)) {
          dependents[prereq].push(domainId);
        }
      }
    }
  }
  
  // Build related_from map (inverse of related)
  for (const [domainId, domain] of Object.entries(domains)) {
    if (domain.related) {
      for (const related of domain.related) {
        if (!relatedFrom[related]) {
          relatedFrom[related] = [];
        }
        if (!relatedFrom[related].includes(domainId)) {
          relatedFrom[related].push(domainId);
        }
      }
    }
  }
  
  return {
    version: "1.0",
    generated_at: new Date().toISOString(),
    children,
    dependents,
    related_from: relatedFrom,
  };
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log("🔍 Scanning domains directory...");
  
  // Ensure output directory exists
  ensureDir(OUTPUT_DIR);
  
  // Get all domain directories
  const domainDirs = getDomainDirs();
  console.log(`Found ${domainDirs.length} domain directories: ${domainDirs.join(", ")}`);
  
  // Parse each domain
  const domainEntries: DomainEntry[] = [];
  const domainMap: Record<string, DomainMetadata> = {};
  
  for (const domainDir of domainDirs) {
    const filePath = findDomainFile(domainDir);
    
    if (!filePath) {
      console.warn(`⚠️  No learning-path.md or index.md found in ${domainDir}`);
      continue;
    }
    
    const metadata = parseDomainFile(domainDir, filePath);
    
    if (metadata) {
      domainEntries.push(metadata);
      domainMap[metadata.id] = metadata;
      console.log(`✅ Parsed: ${metadata.id} (${metadata.title})`);
    } else {
      console.warn(`⚠️  Failed to parse: ${domainDir}`);
    }
  }
  
  // Check for circular dependencies
  console.log("\n🔄 Checking for circular dependencies...");
  const cycle = checkCircularDependencies(domainMap);
  
  if (cycle) {
    console.error(`❌ Circular dependency detected: ${cycle.join(" → ")}`);
    process.exit(1);
  } else {
    console.log("✅ No circular dependencies found");
  }
  
  // Build and write forward index
  console.log("\n📝 Generating forward index...");
  const forwardIndex = buildForwardIndex(domainEntries);
  fs.writeFileSync(FORWARD_INDEX_FILE, JSON.stringify(forwardIndex, null, 2), "utf-8");
  console.log(`✅ Written to ${FORWARD_INDEX_FILE}`);
  
  // Build and write reverse index
  console.log("\n📝 Generating reverse index...");
  const reverseIndex = buildReverseIndex(domainMap);
  fs.writeFileSync(REVERSE_INDEX_FILE, JSON.stringify(reverseIndex, null, 2), "utf-8");
  console.log(`✅ Written to ${REVERSE_INDEX_FILE}`);
  
  // Summary
  console.log("\n📊 Summary:");
  console.log(`   Total domains: ${forwardIndex.stats.total_domains}`);
  console.log(`   By level: beginner=${forwardIndex.stats.by_level.beginner}, intermediate=${forwardIndex.stats.by_level.intermediate}, advanced=${forwardIndex.stats.by_level.advanced}`);
  console.log("\n✨ Done!");
}

main().catch(console.error);
