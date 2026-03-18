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
// Constants
// ============================================================================

// Get project root (try different methods for bun compatibility)
function getProjectRoot(): string {
  // Try __dirname first
  if (typeof __dirname !== "undefined") {
    return path.resolve(__dirname, "..");
  }
  // Fallback to cwd
  return process.cwd();
}

const PROJECT_ROOT = getProjectRoot();
const RESEARCH_DIR = path.join(PROJECT_ROOT, "research/github");
const ESSAY_DIR = path.join(PROJECT_ROOT, "essay");

// ============================================================================
// Manifest Loading
// ============================================================================

/**
 * Load and validate a manifest from a directory
 */
export function loadManifest(manifestPath: string): ArtifactManifest {
  const content = fs.readFileSync(manifestPath, "utf-8");
  const parsed = JSON.parse(content);
  const result = validate(parsed);

  if (result instanceof Error) {
    throw new Error(`Invalid manifest at ${manifestPath}: ${result.message}`);
  }

  return result;
}

/**
 * Load manifest from a research directory
 */
export function loadResearchManifest(repoId: string): ArtifactManifest {
  const dirPath = path.join(RESEARCH_DIR, repoId);
  const manifestPath = path.join(dirPath, MANIFEST_FILENAME);
  return loadManifest(manifestPath);
}

/**
 * List all available research sources with their manifests
 */
export function listResearchSources(): SynthesisSource[] {
  const sources: SynthesisSource[] = [];

  if (!fs.existsSync(RESEARCH_DIR)) {
    return sources;
  }

  // Research uses owner/repo structure (two levels deep)
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
      } catch (error) {
        // Skip invalid manifests
        console.warn(`Warning: Failed to load manifest for ${ownerEntry.name}/${repoEntry.name}: ${error}`);
      }
    }
  }

  return sources;
}

/**
 * List all available essay sources
 */
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
    } catch (error) {
      console.warn(`Warning: Failed to load manifest for ${entry.name}: ${error}`);
    }
  }

  return sources;
}

/**
 * List all available sources (research + essay)
 */
export function listAllSources(): SynthesisSource[] {
  return [...listResearchSources(), ...listEssaySources()];
}

// ============================================================================
// Filtering
// ============================================================================

/**
 * Check if a manifest matches the filter criteria
 */
export function matchesFilter(manifest: ArtifactManifest, filter: TopicFilter): boolean {
  // Filter by tags (ANY match, not ALL)
  if (filter.tags && filter.tags.length > 0) {
    const manifestTags = manifest.tags || [];
    const hasMatchingTag = filter.tags.some(tag =>
      manifestTags.some(mtag => mtag.toLowerCase() === tag.toLowerCase())
    );
    if (!hasMatchingTag) return false;
  }

  // Filter by language
  if (filter.language && manifest.language !== filter.language) {
    return false;
  }

  // Filter by kind
  if (filter.kind && manifest.kind !== filter.kind) {
    return false;
  }

  // Filter by date range
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

/**
 * Filter sources by topic criteria
 */
export function filterSources(
  sources: SynthesisSource[],
  filter: TopicFilter
): SynthesisSource[] {
  return sources.filter(source => matchesFilter(source.manifest, filter));
}

/**
 * Find sources by tag (case-insensitive partial match)
 */
export function findByTag(sources: SynthesisSource[], tagQuery: string): SynthesisSource[] {
  const query = tagQuery.toLowerCase();
  return sources.filter(source =>
    (source.manifest.tags || []).some(tag => tag.toLowerCase().includes(query))
  );
}

/**
 * Find sources by title or description (case-insensitive partial match)
 */
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

/**
 * Validate all manifests in the research directory
 */
export function validateAllManifests(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  const researchDir = RESEARCH_DIR;
  const essayDir = ESSAY_DIR;

  // Check research directory (owner/repo structure)
  if (fs.existsSync(researchDir)) {
    for (const ownerEntry of fs.readdirSync(researchDir)) {
      const ownerPath = path.join(researchDir, ownerEntry);
      if (!fs.statSync(ownerPath).isDirectory()) continue;

      for (const repoEntry of fs.readdirSync(ownerPath)) {
        const manifestPath = path.join(ownerPath, repoEntry, MANIFEST_FILENAME);
        if (!fs.existsSync(manifestPath)) continue;

        try {
          loadManifest(manifestPath);
        } catch (error) {
          result.valid = false;
          result.errors.push({
            path: manifestPath,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  // Check essay directory
  if (fs.existsSync(essayDir)) {
    for (const entry of fs.readdirSync(essayDir)) {
      const manifestPath = path.join(essayDir, entry, MANIFEST_FILENAME);
      if (!fs.existsSync(manifestPath)) continue;

      try {
        loadManifest(manifestPath);
      } catch (error) {
        result.valid = false;
        result.errors.push({
          path: manifestPath,
          error: error instanceof Error ? error.message : String(error),
        });
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

/**
 * Get statistics about available sources
 */
export function getSynthesisStats(): SynthesisStats {
  const sources = listAllSources();

  const byKind: Record<string, number> = {};
  const byLanguage: Record<string, number> = {};
  const tagFrequency: Record<string, number> = {};

  let oldest: Date | null = null;
  let newest: Date | null = null;

  for (const source of sources) {
    // Count by kind
    byKind[source.kind] = (byKind[source.kind] || 0) + 1;

    // Count by language
    const lang = source.manifest.language || "unknown";
    byLanguage[lang] = (byLanguage[lang] || 0) + 1;

    // Count tags
    for (const tag of source.manifest.tags || []) {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    }

    // Date range
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

/**
 * Read the content of a source's main document (README.md or notes.md)
 */
export function readSourceContent(source: SynthesisSource): string | null {
  const contentPath = source.readmePath || source.notesPath;
  if (!contentPath || !fs.existsSync(contentPath)) {
    return null;
  }

  return fs.readFileSync(contentPath, "utf-8");
}

/**
 * Read source content with manifest metadata as header
 */
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
