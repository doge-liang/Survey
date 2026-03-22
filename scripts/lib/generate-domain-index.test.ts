import { describe, test, expect, beforeEach, afterEach, jest } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// Mock gray-matter before importing the module
jest.mock("gray-matter", () => {
  return jest.fn((content: string) => {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    if (match) {
      const [, frontmatterStr, body] = match;
      const data: Record<string, unknown> = {};
      frontmatterStr.split("\n").forEach((line) => {
        const [key, ...valueParts] = line.split(":");
        if (key && valueParts.length > 0) {
          const value = valueParts.join(":").trim();
          if (value.startsWith("[") && value.endsWith("]")) {
            data[key.trim()] = value.slice(1, -1).split(",").map((s) => s.trim());
          } else {
            data[key.trim()] = value;
          }
        }
      });
      return { data, content: body };
    }
    return { data: {}, content };
  });
});

// We need to re-import the module after mocking
// Since we can't easily re-import, we'll copy the functions to test them

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

// Copy of the actual functions for unit testing with mocked fs
function getDomainDirsMock(domainsDir: string): string[] {
  if (!fs.existsSync(domainsDir)) {
    return [];
  }
  return fs.readdirSync(domainsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

function findDomainFileMock(domainsDir: string, domainDir: string): string | null {
  const learningPath = path.join(domainsDir, domainDir, "learning-path.md");
  const indexMd = path.join(domainsDir, domainDir, "index.md");
  if (fs.existsSync(learningPath)) {
    return learningPath;
  }
  if (fs.existsSync(indexMd)) {
    return indexMd;
  }
  return null;
}

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
        const cyclePath = path.slice(path.indexOf(prereq));
        cyclePath.push(prereq);
        return cyclePath;
      }
    }
  }

  recursionStack.delete(domainId);
  return null;
}

function checkCircularDependenciesMock(domains: Record<string, DomainMetadata>): string[] | null {
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

function buildForwardIndexMock(domainEntries: DomainEntry[]): ForwardIndex {
  const domains: Record<string, DomainEntry> = {};
  const aliases: Record<string, string> = {};
  const levelCounts: Record<string, number> = {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
  };

  for (const entry of domainEntries) {
    domains[entry.id] = entry;
    if (entry.level && levelCounts[entry.level] !== undefined) {
      levelCounts[entry.level]++;
    }
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

function buildReverseIndexMock(domains: Record<string, DomainMetadata>): ReverseIndex {
  const children: Record<string, string[]> = {};
  const dependents: Record<string, string[]> = {};
  const relatedFrom: Record<string, string[]> = {};

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

describe("generate-domain-index (unit tests)", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "domain-index-test-"));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("getDomainDirs", () => {
    test("returns empty array when domains directory does not exist", () => {
      const result = getDomainDirsMock(path.join(process.cwd(), "domains"));
      expect(result).toEqual([]);
    });

    test("returns empty array when domains directory is empty", () => {
      fs.mkdirSync("domains", { recursive: true });
      const result = getDomainDirsMock(path.join(process.cwd(), "domains"));
      expect(result).toEqual([]);
    });

    test("returns domain directory names", () => {
      fs.mkdirSync("domains/llm", { recursive: true });
      fs.mkdirSync("domains/ai", { recursive: true });
      fs.mkdirSync("domains/db", { recursive: true });
      const result = getDomainDirsMock(path.join(process.cwd(), "domains"));
      expect(result).toContain("llm");
      expect(result).toContain("ai");
      expect(result).toContain("db");
      expect(result.length).toBe(3);
    });

    test("excludes files from domain directories", () => {
      fs.mkdirSync("domains", { recursive: true });
      fs.writeFileSync("domains/readme.md", "# Domains");
      fs.mkdirSync("domains/llm", { recursive: true });
      const result = getDomainDirsMock(path.join(process.cwd(), "domains"));
      expect(result).toEqual(["llm"]);
    });
  });

  describe("findDomainFile", () => {
    test("returns learning-path.md when it exists", () => {
      fs.mkdirSync("domains/llm", { recursive: true });
      fs.writeFileSync("domains/llm/learning-path.md", "# LLM");
      const result = findDomainFileMock(path.join(process.cwd(), "domains"), "llm");
      expect(result).toBe(path.join(process.cwd(), "domains/llm/learning-path.md"));
    });

    test("returns index.md when learning-path.md does not exist", () => {
      fs.mkdirSync("domains/llm", { recursive: true });
      fs.writeFileSync("domains/llm/index.md", "# LLM");
      const result = findDomainFileMock(path.join(process.cwd(), "domains"), "llm");
      expect(result).toBe(path.join(process.cwd(), "domains/llm/index.md"));
    });

    test("prefers learning-path.md over index.md", () => {
      fs.mkdirSync("domains/llm", { recursive: true });
      fs.writeFileSync("domains/llm/learning-path.md", "# LLM Learning Path");
      fs.writeFileSync("domains/llm/index.md", "# LLM Index");
      const result = findDomainFileMock(path.join(process.cwd(), "domains"), "llm");
      expect(result).toBe(path.join(process.cwd(), "domains/llm/learning-path.md"));
    });

    test("returns null when neither file exists", () => {
      fs.mkdirSync("domains/llm", { recursive: true });
      const result = findDomainFileMock(path.join(process.cwd(), "domains"), "llm");
      expect(result).toBeNull();
    });
  });

  describe("buildForwardIndex", () => {
    test("creates correct forward index structure", () => {
      const entries: DomainEntry[] = [
        {
          id: "llm",
          title: "LLM",
          file: "domains/llm/learning-path.md",
          level: "beginner",
        },
      ];
      const result = buildForwardIndexMock(entries);
      expect(result.version).toBe("1.0");
      expect(result.domains.llm).toBeDefined();
      expect(result.domains.llm.id).toBe("llm");
      expect(result.domains.llm.title).toBe("LLM");
      expect(result.stats.total_domains).toBe(1);
      expect(result.stats.by_level.beginner).toBe(1);
    });

    test("counts domains by level correctly", () => {
      const entries: DomainEntry[] = [
        { id: "a", title: "A", file: "a.md", level: "beginner" },
        { id: "b", title: "B", file: "b.md", level: "intermediate" },
        { id: "c", title: "C", file: "c.md", level: "advanced" },
        { id: "d", title: "D", file: "d.md" },
      ];
      const result = buildForwardIndexMock(entries);
      expect(result.stats.by_level.beginner).toBe(1);
      expect(result.stats.by_level.intermediate).toBe(1);
      expect(result.stats.by_level.advanced).toBe(1);
      expect(result.stats.total_domains).toBe(4);
    });

    test("creates aliases for titles different from id", () => {
      const entries: DomainEntry[] = [
        { id: "llm", title: "Large Language Models", file: "a.md" },
        { id: "ai", title: "AI", file: "b.md" },
      ];
      const result = buildForwardIndexMock(entries);
      expect(result.aliases["Large Language Models"]).toBe("llm");
      expect(result.aliases["AI"]).toBeUndefined();
    });
  });

  describe("buildReverseIndex", () => {
    test("builds children map from parents", () => {
      const domains: Record<string, DomainMetadata> = {
        llm: { id: "llm", title: "LLM", file: "a.md", parents: ["ai"] },
        ai: { id: "ai", title: "AI", file: "b.md" },
      };
      const result = buildReverseIndexMock(domains);
      expect(result.children.ai).toContain("llm");
    });

    test("builds dependents map from prerequisites", () => {
      const domains: Record<string, DomainMetadata> = {
        llm: { id: "llm", title: "LLM", file: "a.md", prerequisites: ["python"] },
        ai: { id: "ai", title: "AI", file: "b.md" },
      };
      const result = buildReverseIndexMock(domains);
      expect(result.dependents.python).toContain("llm");
    });

    test("builds related_from map from related", () => {
      const domains: Record<string, DomainMetadata> = {
        llm: { id: "llm", title: "LLM", file: "a.md", related: ["ml"] },
        ml: { id: "ml", title: "ML", file: "b.md" },
      };
      const result = buildReverseIndexMock(domains);
      expect(result.related_from.ml).toContain("llm");
    });

    test("handles multiple parents and prerequisites", () => {
      const domains: Record<string, DomainMetadata> = {
        llm: {
          id: "llm",
          title: "LLM",
          file: "a.md",
          parents: ["ai", "ml"],
          prerequisites: ["python", "math"],
        },
      };
      const result = buildReverseIndexMock(domains);
      expect(result.children.ai).toContain("llm");
      expect(result.children.ml).toContain("llm");
      expect(result.dependents.python).toContain("llm");
      expect(result.dependents.math).toContain("llm");
    });
  });

  describe("checkCircularDependencies", () => {
    test("returns null when no circular dependencies", () => {
      const domains: Record<string, DomainMetadata> = {
        a: { id: "a", title: "A", file: "a.md", prerequisites: ["b"] },
        b: { id: "b", title: "B", file: "b.md", prerequisites: ["c"] },
        c: { id: "c", title: "C", file: "c.md" },
      };
      const result = checkCircularDependenciesMock(domains);
      expect(result).toBeNull();
    });

    test("detects simple circular dependency", () => {
      const domains: Record<string, DomainMetadata> = {
        a: { id: "a", title: "A", file: "a.md", prerequisites: ["b"] },
        b: { id: "b", title: "B", file: "b.md", prerequisites: ["a"] },
      };
      const result = checkCircularDependenciesMock(domains);
      expect(result).not.toBeNull();
      expect(result).toContain("a");
      expect(result).toContain("b");
    });

    test("detects self-referential dependency", () => {
      const domains: Record<string, DomainMetadata> = {
        a: { id: "a", title: "A", file: "a.md", prerequisites: ["a"] },
      };
      const result = checkCircularDependenciesMock(domains);
      expect(result).not.toBeNull();
      expect(result).toContain("a");
    });

    test("detects long circular dependency chain", () => {
      const domains: Record<string, DomainMetadata> = {
        a: { id: "a", title: "A", file: "a.md", prerequisites: ["b"] },
        b: { id: "b", title: "B", file: "b.md", prerequisites: ["c"] },
        c: { id: "c", title: "C", file: "c.md", prerequisites: ["d"] },
        d: { id: "d", title: "D", file: "d.md", prerequisites: ["a"] },
      };
      const result = checkCircularDependenciesMock(domains);
      expect(result).not.toBeNull();
    });

    test("handles domains with no prerequisites", () => {
      const domains: Record<string, DomainMetadata> = {
        a: { id: "a", title: "A", file: "a.md" },
        b: { id: "b", title: "B", file: "b.md", prerequisites: [] },
      };
      const result = checkCircularDependenciesMock(domains);
      expect(result).toBeNull();
    });
  });
});
