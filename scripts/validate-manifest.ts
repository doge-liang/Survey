#!/usr/bin/env bun
/**
 * Manifest Validation Script
 * Validates manifest.json files against the schema
 *
 * Usage:
 *   bun scripts/validate-manifest.ts --file <path/to/manifest.json>
 *   bun scripts/validate-manifest.ts --all
 */

import { parseArgs } from "util";
import { validate } from "./lib/manifest";
import * as fs from "node:fs/promises";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    file: { type: "string" },
    all: { type: "boolean" },
    help: { type: "boolean" },
  },
  strict: false,
  allowPositionals: true,
});

if (values.help || (!values.file && !values.all)) {
  console.log("Usage:");
  console.log("  bun scripts/validate-manifest.ts --file <path>     Validate single manifest");
  console.log("  bun scripts/validate-manifest.ts --all             Validate all manifests in research/github/*/");
  console.log("  bun scripts/validate-manifest.ts --help            Show this help");
  process.exit(0);
}

async function validateSingleFile(filePath: string): Promise<boolean> {
  try {
    const content = await Bun.file(filePath).text();
    const manifest = JSON.parse(content);
    const result = validate(manifest);

    if (result instanceof Error) {
      console.error(`❌ Invalid manifest: ${filePath}`);
      console.error(`   Error: ${result.message}`);
      return false;
    }

    console.log(`✅ Valid manifest: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to validate ${filePath}: ${error}`);
    return false;
  }
}

async function validateAll(): Promise<boolean> {
  const researchDir = "research/github";

  // Check if directory exists
  try {
    const stat = await fs.stat(researchDir);
    if (!stat.isDirectory()) {
      console.error(`❌ ${researchDir} is not a directory`);
      return false;
    }
  } catch {
    console.log(`ℹ️  Directory ${researchDir} does not exist yet (no manifests to validate)`);
    return true;
  }

  let validCount = 0;
  let invalidCount = 0;
  let totalCount = 0;

  // Walk through all subdirectories
  for await (const entry of walkResearchDir(researchDir)) {
    if (entry.name === "manifest.json") {
      totalCount++;
      const isValid = await validateSingleFile(entry.path);
      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
      }
    }
  }

  console.log(`\n📊 Validation Summary:`);
  console.log(`   Valid: ${validCount}`);
  console.log(`   Invalid: ${invalidCount}`);
  console.log(`   Total: ${totalCount}`);

  if (totalCount === 0) {
    console.log("   ℹ️  No manifests found");
  }

  return invalidCount === 0;
}

async function* walkResearchDir(dir: string): AsyncGenerator<{ name: string; path: string }> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = `${dir}/${entry.name}`;
      
      if (entry.isDirectory()) {
        yield* walkResearchDir(fullPath);
      } else {
        yield { name: entry.name, path: fullPath };
      }
    }
  } catch (error) {
    // Directory might not exist or be readable
  }
}

// Main execution
async function main() {
  if (values.all) {
    const success = await validateAll();
    process.exit(success ? 0 : 1);
  } else if (values.file) {
    const success = await validateSingleFile(values.file);
    process.exit(success ? 0 : 1);
  } else {
    console.log("Usage:");
    console.log("  bun scripts/validate-manifest.ts --file <path>     Validate single manifest");
    console.log("  bun scripts/validate-manifest.ts --all             Validate all manifests");
    process.exit(1);
  }
}

main();
