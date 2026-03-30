import matter from "gray-matter";

// ============================================================================
// Types
// ============================================================================

export interface ParsedFrontmatter {
  data: Record<string, unknown>;
  content: string;
}

export interface GithubFrontmatter {
  id: string;
  title: string;
  source_type: "github";
  upstream_url: string;
  tags: string[];
  description?: string;
  language?: "zh" | "en" | "mixed";
  related?: Array<{ id: string; kind: string; relationship?: string }>;
  level?: string;
  status?: string;
  generated_by: string;
  created_at: string;
  updated_at: string;
}

export interface PaperFrontmatter {
  id: string;
  title: string;
  source_type: "arxiv";
  upstream_url: string;
  tags?: string[];
  description?: string;
  authors?: string[];
  year?: number;
  language?: "zh" | "en" | "mixed";
  related?: Array<{ id: string; kind: string; relationship?: string }>;
  level?: string;
  status?: string;
  generated_by: string;
  created_at: string;
  updated_at: string;
}

export interface SurveyFrontmatter {
  id: string;
  title: string;
  category: string;
  source_type: "survey";
  tags: string[];
  description?: string;
  level?: "beginner" | "intermediate" | "advanced";
  date?: string;
  related?: string[];
  related_projects?: string[];
  related_papers?: string[];
  language?: "zh" | "en" | "mixed";
  status?: string;
  generated_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Type Guards
// ============================================================================

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

// ============================================================================
// Frontmatter Detection
// ============================================================================

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n/;

const FRONTMATTER_REGEX_WITH_NEWLINE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

export function hasFrontmatter(content: string): boolean {
  if (!isString(content)) {
    return false;
  }
  return FRONTMATTER_REGEX.test(content) || FRONTMATTER_REGEX_WITH_NEWLINE.test(content);
}

// ============================================================================
// Parsing
// ============================================================================

export function parseFrontmatter(content: string): ParsedFrontmatter {
  if (!isString(content)) {
    throw new Error("Content must be a string");
  }

  // gray-matter handles both cases (with and without frontmatter)
  const parsed = matter(content);

  return {
    data: parsed.data as Record<string, unknown>,
    content: parsed.content,
  };
}

// ============================================================================
// Serialization
// ============================================================================

export function serializeFrontmatter(data: Record<string, unknown>): string {
  if (!isRecord(data)) {
    throw new Error("Data must be a record object");
  }

  const lines: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    const serialized = serializeValue(value, key);
    lines.push(serialized);
  }

  return lines.join("\n");
}

function serializeValue(value: unknown, key: string): string {
  if (value === null || value === undefined) {
    return `${key}:`;
  }

  if (typeof value === "boolean") {
    return `${key}: ${value}`;
  }

  if (typeof value === "number") {
    return `${key}: ${value}`;
  }

  if (typeof value === "string") {
    // Check if string needs quoting
    if (value.includes(":") || value.includes("#") || value.includes("\n") || value.includes('"') || value.includes("'") || value.startsWith(" ") || value.endsWith(" ")) {
      // Use double-quoted string with escaped characters
      const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
      return `${key}: "${escaped}"`;
    }
    return `${key}: ${value}`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${key}: []`;
    }

    const items: string[] = [];
    for (const item of value) {
      if (typeof item === "object" && item !== null) {
        // Array of objects - use block style
        items.push(serializeObjectAsBlock(item as Record<string, unknown>, key));
      } else {
        items.push(serializeArrayItem(item));
      }
    }

    if (items.every((item) => !item.includes("\n"))) {
      // Simple array on one line
      return `${key}: [${items.join(", ")}]`;
    }

    // Multi-line array with block style
    const blockItems = items.map((item) => `      ${item}`).join("\n");
    return `${key}:\n${blockItems.split("\n").map((_, i) => (i === 0 ? `${key}:` : `    `)).join("\n")}\
`;
  }

  if (typeof value === "object") {
    return serializeObjectAsBlock(value as Record<string, unknown>, key);
  }

  // Fallback: convert to string
  return `${key}: ${String(value)}`;
}

function serializeArrayItem(item: unknown): string {
  if (item === null || item === undefined) {
    return "null";
  }
  if (typeof item === "boolean" || typeof item === "number") {
    return String(item);
  }
  if (typeof item === "string") {
    if (item.includes(":") || item.includes("#") || item.includes("\n") || item.includes('"') || item.includes("'") || item.startsWith(" ") || item.endsWith(" ")) {
      const escaped = item.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
      return `"${escaped}"`;
    }
    return item;
  }
  if (Array.isArray(item)) {
    return `[${item.map(serializeArrayItem).join(", ")}]`;
  }
  if (typeof item === "object") {
    return serializeObjectAsBlock(item as Record<string, unknown>, "");
  }
  return String(item);
}

function serializeObjectAsBlock(obj: Record<string, unknown>, key: string): string {
  const entries = Object.entries(obj);
  if (entries.length === 0) {
    return `${key}: {}`;
  }

  const lines: string[] = [];
  for (const [k, v] of entries) {
    lines.push(`${k}: ${serializeSimpleValue(v)}`);
  }

  if (lines.length <= 2 && lines.every((line) => line.length < 60)) {
    return `${key}: { ${lines.join(", ")} }`;
  }

  const inner = lines.map((line) => `    ${line}`).join("\n");
  return `${key}:\n${inner}`;
}

function serializeSimpleValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    if (value.includes(":") || value.includes("#") || value.includes("\n") || value.includes('"') || value.includes("'") || value.startsWith(" ") || value.endsWith(" ")) {
      const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
      return `"${escaped}"`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return `[${value.map(serializeSimpleValue).join(", ")}]`;
  }
  if (typeof value === "object") {
    return serializeObjectAsBlock(value as Record<string, unknown>, "");
  }
  return String(value);
}

// ============================================================================
// Adding Frontmatter to Markdown
// ============================================================================

export function addFrontmatterToMarkdown(
  content: string,
  data: Record<string, unknown>
): string {
  if (!isString(content)) {
    throw new Error("Content must be a string");
  }

  if (!isRecord(data)) {
    throw new Error("Data must be a record object");
  }

  const serialized = serializeFrontmatter(data);
  const frontmatter = `---\n${serialized}\n---`;
  const contentWithoutFrontmatter = stripFrontmatter(content);

  if (contentWithoutFrontmatter.startsWith("\n") || contentWithoutFrontmatter.startsWith("\r")) {
    return `${frontmatter}${contentWithoutFrontmatter}`;
  }
  return `${frontmatter}\n${contentWithoutFrontmatter}`;
}

function stripFrontmatter(content: string): string {
  const stripped = content.replace(FRONTMATTER_REGEX, "").replace(FRONTMATTER_REGEX_WITH_NEWLINE, "");
  return stripped;
}

// ============================================================================
// Manifest Field Extraction
// ============================================================================

type ArtifactKind = "github-analysis" | "paper-notes" | "survey-synthesis" | "domain-exploration";

export function extractManifestFields(
  manifest: object,
  kind: string
): Record<string, unknown> {
  if (!isRecord(manifest)) {
    throw new Error("Manifest must be an object");
  }

  const record = manifest as Record<string, unknown>;

  switch (kind) {
    case "github-analysis":
      return extractGithubFields(record);
    case "paper-notes":
      return extractPaperFields(record);
    case "survey-synthesis":
      return extractSurveyFields(record);
    case "domain-exploration":
      return extractDomainFields(record);
    default:
      throw new Error(`Unknown artifact kind: ${kind}`);
  }
}

function extractGithubFields(manifest: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: manifest.id,
    title: manifest.title,
    source_type: "github",
    upstream_url: manifest.upstream_url,
    generated_by: manifest.generated_by,
    created_at: manifest.created_at,
    updated_at: manifest.updated_at,
  };

  if (isStringArray(manifest.tags)) {
    result.tags = manifest.tags;
  }

  if (isString(manifest.description)) {
    result.description = manifest.description;
  }

  if (isString(manifest.language)) {
    result.language = manifest.language;
  }

  if (isRecord(manifest.related) || Array.isArray(manifest.related)) {
    result.related = transformRelated(manifest.related);
  }

  if (isString(manifest.level)) {
    result.level = manifest.level;
  }

  if (isString(manifest.status)) {
    result.status = manifest.status;
  }

  return result;
}

function extractPaperFields(manifest: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: manifest.id,
    title: manifest.title,
    source_type: "arxiv",
    upstream_url: manifest.upstream_url,
    generated_by: manifest.generated_by,
    created_at: manifest.created_at,
    updated_at: manifest.updated_at,
  };

  if (isStringArray(manifest.tags)) {
    result.tags = manifest.tags;
  }

  if (isString(manifest.description)) {
    result.description = manifest.description;
  }

  if (isStringArray(manifest.authors)) {
    result.authors = manifest.authors;
  }

  if (typeof manifest.year === "number") {
    result.year = manifest.year;
  }

  if (isString(manifest.language)) {
    result.language = manifest.language;
  }

  if (isRecord(manifest.related) || Array.isArray(manifest.related)) {
    result.related = transformRelated(manifest.related);
  }

  if (isString(manifest.level)) {
    result.level = manifest.level;
  }

  if (isString(manifest.status)) {
    result.status = manifest.status;
  }

  return result;
}

function extractSurveyFields(manifest: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: manifest.id,
    title: manifest.title,
    category: manifest.category || "",
    source_type: "survey",
    generated_by: manifest.generated_by,
    created_at: manifest.created_at,
    updated_at: manifest.updated_at,
  };

  if (isStringArray(manifest.tags)) {
    result.tags = manifest.tags;
  }

  if (isString(manifest.description)) {
    result.description = manifest.description;
  }

  if (isString(manifest.level)) {
    result.level = manifest.level;
  }

  if (isString(manifest.date)) {
    result.date = manifest.date;
  }

  if (Array.isArray(manifest.related)) {
    result.related = manifest.related.filter(isString);
  }

  if (isRecord(manifest.metadata)) {
    const metadata = manifest.metadata as Record<string, unknown>;
    if (isStringArray(metadata.related_projects)) {
      result.related_projects = metadata.related_projects;
    }
    if (isStringArray(metadata.related_papers)) {
      result.related_papers = metadata.related_papers;
    }
  }

  if (isString(manifest.language)) {
    result.language = manifest.language;
  }

  if (isString(manifest.status)) {
    result.status = manifest.status;
  }

  return result;
}

function extractDomainFields(manifest: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: manifest.id,
    title: manifest.title,
    source_type: "domain",
    generated_by: manifest.generated_by,
    created_at: manifest.created_at,
    updated_at: manifest.updated_at,
  };

  if (isStringArray(manifest.tags)) {
    result.tags = manifest.tags;
  }

  if (isString(manifest.description)) {
    result.description = manifest.description;
  }

  if (isString(manifest.language)) {
    result.language = manifest.language;
  }

  if (isString(manifest.level)) {
    result.level = manifest.level;
  }

  if (isString(manifest.status)) {
    result.status = manifest.status;
  }

  return result;
}

function transformRelated(related: unknown): Array<{ id: string; kind: string; relationship?: string }> {
  if (Array.isArray(related)) {
    return related
      .filter(isRecord)
      .map((item) => ({
        id: isString(item.id) ? item.id : "",
        kind: isString(item.kind) ? item.kind : "",
        relationship: isString(item.relationship) ? item.relationship : undefined,
      }))
      .filter((item) => item.id !== "");
  }

  if (isRecord(related)) {
    return transformRelated([related]);
  }

  return [];
}
