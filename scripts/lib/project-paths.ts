import * as path from "node:path";

/**
 * Path keys for the Survey project.
 * Each key maps to a specific directory used for different types of research materials.
 */
export type PathKey = "papers" | "github" | "surveys" | "domains" | "registries" | "manifests" | "sources";

/**
 * Mapping of path keys to their relative paths from project root.
 * These paths are resolved at runtime to absolute paths.
 */
const PATH_MANIFEST: Record<PathKey, string> = {
  /** Academic papers and their metadata (arXiv, DOI, etc.) */
  papers: "research/papers",

  /** GitHub project research and analysis reports */
  github: "research/github",

  /** Multi-source survey synthesis and comparison reports */
  surveys: "research/surveys",

  /** Domain learning paths and exploration guides */
  domains: "research/domains",

  /** Repository registries and configuration (repos.json, etc.) */
  registries: "data/registries",

  /** Manifest files tracking research artifacts (manifest.json) */
  manifests: "data/manifests",

  /** Cloned source repositories from GitHub */
  sources: "sources",
};

/**
 * Project root directory resolved at runtime using import.meta.dir.
 *
 * import.meta.dir gives the directory of this module (scripts/lib/).
 * Since scripts/ is two levels deep from project root, we traverse up.
 * This ensures paths are always relative to the actual project root.
 */
function getProjectRoot(): string {
  // Traverse up from scripts/lib/ to project root
  return path.resolve(import.meta.dir, "..", "..");
}

/**
 * Normalizes a path to use forward slashes for cross-platform compatibility.
 * @param absolutePath - The absolute path to normalize
 * @returns Path with forward slashes
 */
function normalizePath(absolutePath: string): string {
  return absolutePath.replace(/\\/g, "/");
}

/**
 * Resolves a path key to an absolute path, with optional subpath components.
 *
 * @param key - The path key (papers, github, surveys, domains, registries, manifests, sources)
 * @param subpath - Optional subpath components to append to the resolved path
 * @returns Absolute path resolved at runtime using import.meta.dir
 *
 * @example
 * resolvePath("papers")           // "/path/to/Survey/paper"
 * resolvePath("github", "owner")  // "/path/to/Survey/research/github/owner"
 * resolvePath("domains", "AI", "index.md")  // "/path/to/Survey/domains/AI/index.md"
 */
export function resolvePath(key: PathKey, ...subpath: string[]): string {
  const relativePath = PATH_MANIFEST[key];
  if (!relativePath) {
    throw new Error(`Unknown path key: ${key}`);
  }

  const joined = path.join(getProjectRoot(), relativePath, ...subpath);
  return normalizePath(joined);
}

/**
 * Type-safe getter for papers directory.
 * Returns absolute path to the papers directory.
 */
export function getPapersPath(): string {
  return resolvePath("papers");
}

/**
 * Type-safe getter for github research directory.
 * Returns absolute path to the GitHub research directory.
 */
export function getGithubPath(): string {
  return resolvePath("github");
}

/**
 * Type-safe getter for surveys directory.
 * Returns absolute path to the surveys directory.
 */
export function getSurveysPath(): string {
  return resolvePath("surveys");
}

/**
 * Type-safe getter for domains directory.
 * Returns absolute path to the domains directory.
 */
export function getDomainsPath(): string {
  return resolvePath("domains");
}

/**
 * Type-safe getter for registries directory.
 * Returns absolute path to the data/registries directory containing registries.
 */
export function getRegistriesPath(): string {
  return resolvePath("registries");
}

/**
 * Type-safe getter for manifests directory.
 * Returns absolute path to the manifests directory.
 */
export function getManifestsPath(): string {
  return resolvePath("manifests");
}

/**
 * Type-safe getter for sources directory.
 * Returns absolute path to the sources directory containing cloned repos.
 */
export function getSourcesPath(): string {
  return resolvePath("sources");
}

/**
 * Returns the project root absolute path.
 */
export function getProjectRootPath(): string {
  return normalizePath(getProjectRoot());
}

/**
 * Gets all path keys and their corresponding relative paths.
 * Useful for debugging or generating manifest files.
 */
export function getPathManifest(): Record<PathKey, string> {
  return { ...PATH_MANIFEST };
}

/**
 * Validates if a string is a valid PathKey.
 */
export function isPathKey(value: string): value is PathKey {
  return value in PATH_MANIFEST;
}
