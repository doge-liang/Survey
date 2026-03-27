import {
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
} from "./lib/project-paths";

/**
 * CLI wrapper for project-paths module.
 * Prints resolved paths in various formats.
 */

interface CLIOptions {
  json?: boolean;
  key?: string;
  subpath?: string[];
}

function printUsage(): void {
  console.log(`
Usage: bun scripts/project-paths.ts [options] [key] [subpath...]

Print resolved absolute paths for Survey project directories.

Arguments:
  key           Path key (papers, github, surveys, domains, registries, manifests, sources)
  subpath       Optional subpath components to append

Options:
  --json        Output all paths as JSON
  --help        Show this help message

Examples:
  bun scripts/project-paths.ts papers
  bun scripts/project-paths.ts github vercel next.js
  bun scripts/project-paths.ts --json
  bun scripts/project-paths.ts domains AI index.md
`);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Print all paths
    console.log("Project Root:", getProjectRootPath());
    console.log("");
    console.log("Resolved Paths:");
    const manifest = getPathManifest();
    for (const [key, relPath] of Object.entries(manifest)) {
      console.log(`  ${key}: ${resolvePath(key as PathKey)}`);
    }
    return;
  }

  // Parse arguments
  let outputJson = false;
  let pathKey: string | undefined;
  const subpaths: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--json") {
      outputJson = true;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      return;
    } else if (!pathKey) {
      pathKey = arg;
    } else {
      subpaths.push(arg);
    }
  }

  if (outputJson) {
    const manifest = getPathManifest();
    const resolved: Record<string, string> = {};
    for (const key of Object.keys(manifest)) {
      resolved[key] = resolvePath(key as PathKey);
    }
    console.log(JSON.stringify(resolved, null, 2));
    return;
  }

  if (pathKey) {
    if (!isPathKey(pathKey)) {
      console.error(`Error: Unknown path key "${pathKey}"`);
      console.error(`Valid keys: ${Object.keys(getPathManifest()).join(", ")}`);
      process.exit(1);
    }

    const resolved = resolvePath(pathKey, ...subpaths);
    console.log(resolved);
    return;
  }
}

main();
