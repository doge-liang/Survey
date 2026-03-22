import * as fs from "node:fs";
import * as path from "node:path";
import { validate, MANIFEST_FILENAME } from "./lib/manifest";
import type { ArtifactManifest } from "./lib/manifest";

// ============================================================================
// Types
// ============================================================================

export interface SynthesisSource {
  id: string;
  kind: "github-analysis" | "paper-notes" | "survey-synthesis" | "domain-exploration";
  manifestPath: string;
  readmePath?: string;
  notesPath?: string;
  manifest: ArtifactManifest;
}

export interface TopicFilter {
  tags?: string[];
  language?: "zh" | "en" | "mixed";
  kind?: ArtifactManifest["kind"];
  minDate?: string;
  maxDate?: string;
}

// ============================================================================
// SynthesisOutput Types
// ============================================================================

export interface SynthesisSourceItem {
  id: string;
  title: string;
  tags: string[];
  language: string;
  updated_at: string;
}

export interface Relationship {
  from: string;
  to: string;
  type: string;
}

export interface Pattern {
  name: string;
  description: string;
  sources: string[];
}

export interface ComparisonEntry {
  source: string;
  value: string;
}

export interface Comparison {
  dimension: string;
  entries: ComparisonEntry[];
}

export interface SynthesisOutput {
  topic: string;
  timestamp: string;
  sources: SynthesisSourceItem[];
  relationships: Relationship[];
  patterns?: Pattern[];
  comparison?: Comparison[];
  summary: string;
  warnings?: string[];
}

// ============================================================================
// Constants
// ============================================================================

function getProjectRoot(): string {
  if (typeof __dirname !== "undefined") {
    return path.resolve(__dirname, "..");
  }
  return process.cwd();
}

const PROJECT_ROOT = getProjectRoot();
const RESEARCH_DIR = path.join(PROJECT_ROOT, "research/github");
const ESSAY_DIR = path.join(PROJECT_ROOT, "paper");

// ============================================================================
// Manifest Loading
// ============================================================================

export function loadManifest(manifestPath: string): ArtifactManifest {
  const content = fs.readFileSync(manifestPath, "utf-8");
  const parsed = JSON.parse(content);
  const result = validate(parsed);

  if (result instanceof Error) {
    throw new Error(`Invalid manifest at ${manifestPath}: ${result.message}`);
  }

  return result;
}

export function loadResearchManifest(repoId: string): ArtifactManifest {
  const dirPath = path.join(RESEARCH_DIR, repoId);
  const manifestPath = path.join(dirPath, MANIFEST_FILENAME);
  return loadManifest(manifestPath);
}

export function listResearchSources(): SynthesisSource[] {
  const sources: SynthesisSource[] = [];

  if (!fs.existsSync(RESEARCH_DIR)) {
    return sources;
  }

  const ownerEntries = fs.readdirSync(RESEARCH_DIR, { withFileTypes: true });

  for (const ownerEntry of ownerEntries) {
    if (!ownerEntry.isDirectory()) continue;

    const ownerPath = path.join(RESEARCH_DIR, ownerEntry.name);
    const repoEntries = fs.readdirSync(ownerPath, { withFileTypes: true });

    for (const repoEntry of repoEntries) {
      if (!repoEntry.isDirectory()) continue;

      const manifestPath = path.join(ownerPath, repoEntry.name, MANIFEST_FILENAME);
      const readmePath = path.join(ownerPath, repoEntry.name, "README.md");

      if (!fs.existsSync(manifestPath)) continue;

      try {
        const manifest = loadManifest(manifestPath);

        sources.push({
          id: manifest.id,
          kind: manifest.kind,
          manifestPath,
          readmePath: fs.existsSync(readmePath) ? readmePath : undefined,
          manifest,
        });
      } catch {
        // Intentionally ignored - manifest load failure is non-fatal
      }
    }
  }

  return sources;
}

export function listEssaySources(): SynthesisSource[] {
  const sources: SynthesisSource[] = [];

  if (!fs.existsSync(ESSAY_DIR)) {
    return sources;
  }

  const entries = fs.readdirSync(ESSAY_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const manifestPath = path.join(ESSAY_DIR, entry.name, MANIFEST_FILENAME);
    const notesPath = path.join(ESSAY_DIR, entry.name, "notes.md");

    if (!fs.existsSync(manifestPath)) continue;

    try {
      const manifest = loadManifest(manifestPath);

      sources.push({
        id: manifest.id,
        kind: manifest.kind,
        manifestPath,
        notesPath: fs.existsSync(notesPath) ? notesPath : undefined,
        manifest,
      });
    } catch {
      // Intentionally ignored - manifest load failure is non-fatal
    }
  }

  return sources;
}

export function listAllSources(): SynthesisSource[] {
  return [...listResearchSources(), ...listEssaySources()];
}

// ============================================================================
// Filtering
// ============================================================================

export function matchesFilter(manifest: ArtifactManifest, filter: TopicFilter): boolean {
  if (filter.tags && filter.tags.length > 0) {
    const manifestTags = manifest.tags || [];
    const hasMatchingTag = filter.tags.some(tag =>
      manifestTags.some(mtag => mtag.toLowerCase() === tag.toLowerCase())
    );
    if (!hasMatchingTag) return false;
  }

  if (filter.language && manifest.language !== filter.language) {
    return false;
  }

  if (filter.kind && manifest.kind !== filter.kind) {
    return false;
  }

  if (filter.minDate) {
    const manifestDate = new Date(manifest.updated_at);
    const minDate = new Date(filter.minDate);
    if (manifestDate < minDate) return false;
  }

  if (filter.maxDate) {
    const manifestDate = new Date(manifest.updated_at);
    const maxDate = new Date(filter.maxDate);
    if (manifestDate > maxDate) return false;
  }

  return true;
}

export function filterSources(
  sources: SynthesisSource[],
  filter: TopicFilter
): SynthesisSource[] {
  return sources.filter(source => matchesFilter(source.manifest, filter));
}

export function findByTag(sources: SynthesisSource[], tagQuery: string): SynthesisSource[] {
  const query = tagQuery.toLowerCase();
  return sources.filter(source =>
    (source.manifest.tags || []).some(tag => tag.toLowerCase().includes(query))
  );
}

export function searchSources(sources: SynthesisSource[], keyword: string): SynthesisSource[] {
  const query = keyword.toLowerCase();
  return sources.filter(source => {
    const titleMatch = (source.manifest.title || "").toLowerCase().includes(query);
    const descMatch = (source.manifest.description || "").toLowerCase().includes(query);
    const idMatch = source.manifest.id.toLowerCase().includes(query);
    return titleMatch || descMatch || idMatch;
  });
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: { path: string; error: string }[];
  warnings: { path: string; warning: string }[];
}

export function validateAllManifests(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  const researchDir = RESEARCH_DIR;
  const paperDir = ESSAY_DIR;

  if (fs.existsSync(researchDir)) {
    for (const ownerEntry of fs.readdirSync(researchDir)) {
      const ownerPath = path.join(researchDir, ownerEntry);
      if (!fs.statSync(ownerPath).isDirectory()) continue;

      for (const repoEntry of fs.readdirSync(ownerPath)) {
        const manifestPath = path.join(ownerPath, repoEntry, MANIFEST_FILENAME);
        if (!fs.existsSync(manifestPath)) continue;

        try {
          loadManifest(manifestPath);
        } catch {
          // Intentionally ignored - validation errors handled via result object
        }
      }
    }
  }

  if (fs.existsSync(paperDir)) {
    for (const entry of fs.readdirSync(paperDir)) {
      const manifestPath = path.join(paperDir, entry, MANIFEST_FILENAME);
      if (!fs.existsSync(manifestPath)) continue;

      try {
        loadManifest(manifestPath);
      } catch {
        // Intentionally ignored - validation errors handled via result object
      }
    }
  }

  return result;
}

// ============================================================================
// Statistics
// ============================================================================

export interface SynthesisStats {
  totalSources: number;
  byKind: Record<string, number>;
  byLanguage: Record<string, number>;
  tagFrequency: Record<string, number>;
  dateRange: { oldest: string; newest: string } | null;
}

export function getSynthesisStats(): SynthesisStats {
  const sources = listAllSources();

  const byKind: Record<string, number> = {};
  const byLanguage: Record<string, number> = {};
  const tagFrequency: Record<string, number> = {};

  let oldest: Date | null = null;
  let newest: Date | null = null;

  for (const source of sources) {
    byKind[source.kind] = (byKind[source.kind] || 0) + 1;

    const lang = source.manifest.language || "unknown";
    byLanguage[lang] = (byLanguage[lang] || 0) + 1;

    for (const tag of source.manifest.tags || []) {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    }

    const date = new Date(source.manifest.updated_at);
    if (!oldest || date < oldest) oldest = date;
    if (!newest || date > newest) newest = date;
  }

  return {
    totalSources: sources.length,
    byKind,
    byLanguage,
    tagFrequency,
    dateRange: oldest && newest ? {
      oldest: oldest.toISOString(),
      newest: newest.toISOString(),
    } : null,
  };
}

// ============================================================================
// Content Reading
// ============================================================================

export function readSourceContent(source: SynthesisSource): string | null {
  const contentPath = source.readmePath || source.notesPath;
  if (!contentPath || !fs.existsSync(contentPath)) {
    return null;
  }

  return fs.readFileSync(contentPath, "utf-8");
}

export function readSourceWithMetadata(source: SynthesisSource): string {
  const m = source.manifest;
  const metadata = [
    `# ${m.title || m.id}`,
    ``,
    `**ID:** ${m.id}`,
    `**Kind:** ${m.kind}`,
    `**Language:** ${m.language || "unknown"}`,
    `**Tags:** ${(m.tags || []).join(", ") || "none"}`,
    `**Updated:** ${m.updated_at}`,
    m.upstream_url ? `**Source:** ${m.upstream_url}` : "",
    ``,
    "---",
    ``,
  ].filter(Boolean).join("\n");

  const content = readSourceContent(source);
  if (!content) return metadata;

  return metadata + "\n" + content;
}

// ============================================================================
// SynthesisOutput Builder
// ============================================================================

export function buildSynthesisOutput(
  topic: string,
  sources: SynthesisSource[]
): SynthesisOutput {
  const warnings: string[] = [];
  const relationships: Relationship[] = [];

  const projectedSources: SynthesisSourceItem[] = sources.map((s) => ({
    id: s.manifest.id,
    title: s.manifest.title || s.manifest.id,
    tags: s.manifest.tags || [],
    language: s.manifest.language || "mixed",
    updated_at: s.manifest.updated_at,
  }));

  const sourceIds = new Set(sources.map((s) => s.manifest.id));
  let hasExplicitRelations = false;

  for (const source of sources) {
    const related = (source.manifest as Record<string, unknown>).related as Array<{ id: string; type?: string }> | undefined;
    if (related && Array.isArray(related)) {
      for (const rel of related) {
        if (sourceIds.has(rel.id)) {
          relationships.push({
            from: source.manifest.id,
            to: rel.id,
            type: rel.type || "related",
          });
          hasExplicitRelations = true;
        }
      }
    }
  }

  if (!hasExplicitRelations && sources.length > 1) {
    warnings.push("relationships_inferred: no explicit manifest.related edges found");
    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const tagsi = new Set(sources[i].manifest.tags || []);
        const tagsj = new Set(sources[j].manifest.tags || []);
        const shared = [...tagsi].filter((t) => tagsj.has(t));
        const otherShared = shared.filter((t) => t !== topic);
        if (otherShared.length > 0) {
          relationships.push({
            from: sources[i].manifest.id,
            to: sources[j].manifest.id,
            type: "shares_tags",
          });
        } else if (shared.length > 0) {
          relationships.push({
            from: sources[i].manifest.id,
            to: sources[j].manifest.id,
            type: "shares_tags",
          });
        }
      }
    }
  }

  const tagCounts = new Map<string, number>();
  for (const s of sources) {
    for (const tag of s.manifest.tags || []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  const patterns: Pattern[] = [];
  for (const [tag, count] of tagCounts) {
    if (count >= 2 && tag !== topic) {
      const patternSources = sources
        .filter((s) => (s.manifest.tags || []).includes(tag))
        .map((s) => s.manifest.id);
      patterns.push({
        name: tag,
        description: `Appears in ${count} sources`,
        sources: patternSources,
      });
    }
  }

  const comparison: Comparison[] = [];
  const langCounts = new Map<string, number>();
  for (const s of sources) {
    const lang = s.manifest.language || "unknown";
    langCounts.set(lang, (langCounts.get(lang) || 0) + 1);
  }
  if (langCounts.size > 1) {
    comparison.push({
      dimension: "language",
      entries: [...langCounts].map(([lang, count]) => ({
        source: lang,
        value: `${count} source${count > 1 ? "s" : ""}`,
      })),
    });
  }

  const summary = generateSummary(topic, sources.length, patterns.length, relationships.length);

  return {
    topic,
    timestamp: new Date().toISOString(),
    sources: projectedSources,
    relationships,
    patterns: patterns.length > 0 ? patterns : undefined,
    comparison: comparison.length > 0 ? comparison : undefined,
    summary,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function generateSummary(
  topic: string,
  sourceCount: number,
  patternCount: number,
  relationshipCount: number
): string {
  const parts: string[] = [];
  parts.push(`Found ${sourceCount} sources for topic "${topic}"`);
  if (patternCount > 0) {
    parts.push(`${patternCount} pattern${patternCount > 1 ? "s" : ""} identified`);
  }
  if (relationshipCount > 0) {
    parts.push(`${relationshipCount} relationship${relationshipCount > 1 ? "s" : ""} found`);
  }
  return parts.join(". ") + ".";
}
