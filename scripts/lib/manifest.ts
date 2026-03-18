import * as fs from "node:fs";
import * as path from "node:path";

// ============================================================================
// Types
// ============================================================================

export type ArtifactKind =
  | "github-analysis"
  | "paper-notes"
  | "survey-synthesis"
  | "domain-exploration";

export type SourceType =
  | "github"
  | "arxiv"
  | "doi"
  | "manual"
  | "domain"
  | "mixed";

export type Language = "zh" | "en" | "mixed";

export interface UpstreamId {
  type: "github" | "arxiv" | "doi";
  id: string;
  url?: string;
}

export interface RelatedArtifact {
  id: string;
  kind: ArtifactKind;
  relationship: "related" | "parent" | "child" | "derived";
}

export interface ArtifactManifest {
  $schema?: string;
  version: string;
  kind: ArtifactKind;
  id: string;
  title?: string;
  source_type: SourceType;
  upstream_url?: string;
  inputs: string[];
  outputs: string[];
  generated_by: string;
  created_at: string;
  updated_at: string;
  language?: Language;
  tags?: string[];
  description?: string;
  upstream_ids?: UpstreamId[];
  related?: RelatedArtifact[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Constants
// ============================================================================

export const MANIFEST_FILENAME = "manifest.json";
export const CURRENT_SCHEMA_VERSION = "1.0.0";

export const ARTIFACT_KINDS: ArtifactKind[] = [
  "github-analysis",
  "paper-notes",
  "survey-synthesis",
  "domain-exploration",
];

export const SOURCE_TYPES: SourceType[] = [
  "github",
  "arxiv",
  "doi",
  "manual",
  "domain",
  "mixed",
];

// ============================================================================
// Validation Helpers
// ============================================================================

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isArtifactKind(value: unknown): value is ArtifactKind {
  return isString(value) && ARTIFACT_KINDS.includes(value as ArtifactKind);
}

function isSourceType(value: unknown): value is SourceType {
  return isString(value) && SOURCE_TYPES.includes(value as SourceType);
}

function isLanguage(value: unknown): value is Language {
  return isString(value) && ["zh", "en", "mixed"].includes(value);
}

function isUpstreamIdArray(value: unknown): value is UpstreamId[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      isObject(item) &&
      isString(item.type) &&
      ["github", "arxiv", "doi"].includes(item.type) &&
      isString(item.id)
  );
}

function isRelatedArtifactArray(value: unknown): value is RelatedArtifact[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      isObject(item) &&
      isString(item.id) &&
      isArtifactKind(item.kind) &&
      isString(item.relationship) &&
      ["related", "parent", "child", "derived"].includes(item.relationship)
  );
}

// ============================================================================
// Validation
// ============================================================================

export function validate(value: unknown): ArtifactManifest | Error {
  if (!isObject(value)) {
    return new Error("Manifest must be an object");
  }

  // Required fields
  if (!isString(value.version)) {
    return new Error("Manifest version must be a string");
  }

  if (!isArtifactKind(value.kind)) {
    return new Error(
      `Manifest kind must be one of: ${ARTIFACT_KINDS.join(", ")}`
    );
  }

  if (!isString(value.id)) {
    return new Error("Manifest id must be a string");
  }

  if (!isSourceType(value.source_type)) {
    return new Error(
      `Manifest source_type must be one of: ${SOURCE_TYPES.join(", ")}`
    );
  }

  if (!isStringArray(value.inputs)) {
    return new Error("Manifest inputs must be a string array");
  }

  if (!isStringArray(value.outputs)) {
    return new Error("Manifest outputs must be a string array");
  }

  if (!isString(value.generated_by)) {
    return new Error("Manifest generated_by must be a string");
  }

  if (!isString(value.created_at)) {
    return new Error("Manifest created_at must be a string");
  }

  if (!isString(value.updated_at)) {
    return new Error("Manifest updated_at must be a string");
  }

  // Optional fields validation
  if (value.language !== undefined && !isLanguage(value.language)) {
    return new Error("Manifest language must be 'zh', 'en', or 'mixed'");
  }

  if (value.tags !== undefined && !isStringArray(value.tags)) {
    return new Error("Manifest tags must be a string array");
  }

  if (value.upstream_ids !== undefined && !isUpstreamIdArray(value.upstream_ids)) {
    return new Error("Manifest upstream_ids must be a valid array");
  }

  if (value.related !== undefined && !isRelatedArtifactArray(value.related)) {
    return new Error("Manifest related must be a valid array");
  }

  return {
    $schema: isString(value.$schema) ? value.$schema : undefined,
    version: value.version,
    kind: value.kind,
    id: value.id,
    title: isString(value.title) ? value.title : undefined,
    source_type: value.source_type,
    upstream_url: isString(value.upstream_url) ? value.upstream_url : undefined,
    inputs: [...value.inputs],
    outputs: [...value.outputs],
    generated_by: value.generated_by,
    created_at: value.created_at,
    updated_at: value.updated_at,
    language: value.language,
    tags: value.tags ? [...value.tags] : undefined,
    description: isString(value.description) ? value.description : undefined,
    upstream_ids: value.upstream_ids ? [...value.upstream_ids] : undefined,
    related: value.related ? [...value.related] : undefined,
    metadata: isObject(value.metadata) ? { ...value.metadata } : undefined,
  };
}

// ============================================================================
// Factory Functions
// ============================================================================

export function create(
  kind: ArtifactKind,
  id: string,
  sourceType: SourceType,
  inputs: string[],
  outputs: string[],
  generatedBy: string,
  options?: {
    title?: string;
    upstreamUrl?: string;
    language?: Language;
    tags?: string[];
    description?: string;
    upstreamIds?: UpstreamId[];
  }
): ArtifactManifest {
  const now = new Date().toISOString();
  return {
    $schema: "../data/schemas/manifest.json",
    version: CURRENT_SCHEMA_VERSION,
    kind,
    id,
    title: options?.title,
    source_type: sourceType,
    upstream_url: options?.upstreamUrl,
    inputs,
    outputs,
    generated_by: generatedBy,
    created_at: now,
    updated_at: now,
    language: options?.language,
    tags: options?.tags,
    description: options?.description,
    upstream_ids: options?.upstreamIds,
  };
}

// ============================================================================
// File Operations
// ============================================================================

function manifestFilePath(dirPath: string): string {
  return path.join(dirPath, MANIFEST_FILENAME);
}

export function exists(dirPath: string): boolean {
  const filePath = manifestFilePath(dirPath);
  return fs.existsSync(filePath);
}

export function load(dirPath: string): ArtifactManifest {
  const filePath = manifestFilePath(dirPath);
  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(content);
  const validated = validate(parsed);

  if (validated instanceof Error) {
    throw new Error(`Invalid manifest in ${dirPath}: ${validated.message}`);
  }

  return validated;
}

export function save(manifest: ArtifactManifest, dirPath: string): void {
  const validated = validate(manifest);

  if (validated instanceof Error) {
    throw new Error(`Cannot save invalid manifest: ${validated.message}`);
  }

  const filePath = manifestFilePath(dirPath);
  const directory = path.dirname(filePath);
  const tempFilePath = path.join(
    directory,
    `manifest.${process.pid}.${Date.now()}.tmp`
  );

  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(tempFilePath, JSON.stringify(validated, null, 2) + "\n");
  fs.renameSync(tempFilePath, filePath);
}

export function remove(dirPath: string): void {
  const filePath = manifestFilePath(dirPath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// ============================================================================
// Update Helpers
// ============================================================================

export function update(
  dirPath: string,
  updates: Partial<Omit<ArtifactManifest, "version" | "kind" | "id" | "created_at">>
): ArtifactManifest {
  const manifest = load(dirPath);
  const updated: ArtifactManifest = {
    ...manifest,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  save(updated, dirPath);
  return updated;
}

export function touch(dirPath: string): ArtifactManifest {
  return update(dirPath, {});
}

// ============================================================================
// Query Helpers
// ============================================================================

export function getArtifactKind(dirPath: string): ArtifactKind | undefined {
  try {
    return load(dirPath).kind;
  } catch {
    return undefined;
  }
}

export function getArtifactId(dirPath: string): string | undefined {
  try {
    return load(dirPath).id;
  } catch {
    return undefined;
  }
}

export function getOutputs(dirPath: string): string[] {
  try {
    return load(dirPath).outputs;
  } catch {
    return [];
  }
}

export function getInputs(dirPath: string): string[] {
  try {
    return load(dirPath).inputs;
  } catch {
    return [];
  }
}
