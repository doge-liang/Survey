/**
 * Centralized path resolution for the Survey project.
 * Re-exports all path-related utilities from project-paths.
 */

export {
  resolvePath,
  getPapersPath,
  getGithubPath,
  getSurveysPath,
  getDomainsPath,
  getRegistriesPath,
  getManifestsPath,
  getSourcesPath,
  getProjectRootPath,
  getPathManifest,
  isPathKey,
  type PathKey,
} from "./project-paths";
