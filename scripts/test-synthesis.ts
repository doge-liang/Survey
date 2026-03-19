#!/usr/bin/env bun
/**
 * Test synthesis workflow and validate manifests
 *
 * Usage:
 *   bun scripts/test-synthesis.ts --list-sources
 *   bun scripts/test-synthesis.ts --validate-manifests
 *   bun scripts/test-synthesis.ts --stats
 *   bun scripts/test-synthesis.ts --topic "LLM Training"
 *   bun scripts/test-synthesis.ts --tag "RAG"
 *   bun scripts/test-synthesis.ts --search "nano"
 *   bun scripts/test-synthesis.ts --topic "LLM" --output results.json
 */

import { parseArgs } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  listAllSources,
  listResearchSources,
  listEssaySources,
  loadManifest,
  validateAllManifests,
  getSynthesisStats,
  filterSources,
  findByTag,
  searchSources,
  readSourceContent,
  buildSynthesisOutput,
  type TopicFilter,
  type SynthesisSource,
} from "./synthesis-lib";

// ============================================================================
// CLI Arguments
// ============================================================================

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    "list-sources": { type: "boolean", short: "l" },
    "validate-manifests": { type: "boolean", short: "v" },
    "stats": { type: "boolean", short: "s" },
    "topic": { type: "string", short: "t" },
    "tag": { type: "string", short: "g" },
    "search": { type: "string" },
    "language": { type: "string" },
    "output": { type: "string", short: "o" },
    "json": { type: "boolean", short: "j" },
    "help": { type: "boolean", short: "h" },
  },
  allowPositionals: false,
});

// ============================================================================
// Help
// ============================================================================

if (values.help) {
  console.log(`
Test synthesis workflow and validate manifests

Usage:
  bun scripts/test-synthesis.ts [options]

Options:
  -l, --list-sources      List all available sources
  -v, --validate-manifests  Validate all manifests
  -s, --stats             Show synthesis statistics
  -t, --topic <tags>      Filter by comma-separated tags (e.g., "LLM,RAG")
  -g, --tag <tag>         Find sources by tag (partial match)
      --search <keyword>  Search sources by title/description
      --language <lang>   Filter by language (zh, en, mixed)
  -o, --output <file>     Write JSON output to file
  -j, --json              Output as JSON
  -h, --help              Show this help

Examples:
  bun scripts/test-synthesis.ts --list-sources
  bun scripts/test-synthesis.ts --validate-manifests
  bun scripts/test-synthesis.ts --stats
  bun scripts/test-synthesis.ts --topic "LLM Training" --json
  bun scripts/test-synthesis.ts --tag "RAG" --output rag-sources.json
  bun scripts/test-synthesis.ts --search "nano" --json
`);
  process.exit(0);
}

// ============================================================================
// Commands
// ============================================================================

function listSourcesCommand(): void {
  const research = listResearchSources();
  const papers = listEssaySources();

  console.log("=== Research Sources ===\n");
  for (const source of research) {
    console.log(`  ${source.manifest.id}`);
    console.log(`    Kind: ${source.kind}`);
    console.log(`    Title: ${source.manifest.title || "N/A"}`);
    console.log(`    Tags: ${(source.manifest.tags || []).join(", ") || "none"}`);
    console.log(`    Language: ${source.manifest.language || "unknown"}`);
    console.log(`    Updated: ${source.manifest.updated_at}`);
    console.log();
  }

  console.log("=== Paper Sources ===\n");
  for (const source of papers) {
    console.log(`  ${source.manifest.id}`);
    console.log(`    Kind: ${source.kind}`);
    console.log(`    Title: ${source.manifest.title || "N/A"}`);
    console.log(`    Tags: ${(source.manifest.tags || []).join(", ") || "none"}`);
    console.log(`    Language: ${source.manifest.language || "unknown"}`);
    console.log(`    Updated: ${source.manifest.updated_at}`);
    console.log();
  }

  console.log(`\nTotal: ${research.length + papers.length} sources`);
  console.log(`  Research: ${research.length}`);
  console.log(`  Essays: ${papers.length}`);
}

function validateManifestsCommand(): void {
  console.log("Validating all manifests...\n");

  const result = validateAllManifests();

  if (result.valid && result.errors.length === 0) {
    console.log("✅ All manifests are valid!");
    process.exit(0);
  }

  if (result.errors.length > 0) {
    console.log(`❌ Found ${result.errors.length} error(s):\n`);
    for (const error of result.errors) {
      console.log(`  ${error.path}:`);
      console.log(`    ${error.error}`);
      console.log();
    }
  }

  if (result.warnings.length > 0) {
    console.log(`⚠️  Found ${result.warnings.length} warning(s):\n`);
    for (const warning of result.warnings) {
      console.log(`  ${warning.path}:`);
      console.log(`    ${warning.warning}`);
      console.log();
    }
  }

  process.exit(1);
}

function statsCommand(): void {
  const stats = getSynthesisStats();

  console.log("=== Synthesis Statistics ===\n");
  console.log(`Total Sources: ${stats.totalSources}`);
  console.log();

  console.log("By Kind:");
  for (const [kind, count] of Object.entries(stats.byKind)) {
    console.log(`  ${kind}: ${count}`);
  }
  console.log();

  console.log("By Language:");
  for (const [lang, count] of Object.entries(stats.byLanguage)) {
    console.log(`  ${lang}: ${count}`);
  }
  console.log();

  console.log("Top Tags:");
  const sortedTags = Object.entries(stats.tagFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  for (const [tag, count] of sortedTags) {
    console.log(`  ${tag}: ${count}`);
  }
  console.log();

  if (stats.dateRange) {
    console.log("Date Range:");
    console.log(`  Oldest: ${stats.dateRange.oldest}`);
    console.log(`  Newest: ${stats.dateRange.newest}`);
  }
}

function topicFilterCommand(topicTags: string): void {
  const tags = topicTags.split(",").map(t => t.trim()).filter(Boolean);
  const filter: TopicFilter = { tags };

  if (values.language) {
    const lang = values.language as "zh" | "en" | "mixed";
    filter.language = lang;
  }

  const sources = listAllSources();
  const filtered = filterSources(sources, filter);

  // When JSON output is requested, use buildSynthesisOutput for correct schema
  if (values.json || values.output) {
    const synthesisOutput = buildSynthesisOutput(topicTags, filtered);
    const jsonOutput = JSON.stringify(synthesisOutput, null, 2);
    if (values.output) {
      fs.writeFileSync(values.output, jsonOutput + "\n");
      console.log(`Output written to: ${values.output}`);
    } else {
      console.log(jsonOutput);
    }
    return;
  }

  // Text output remains unchanged
  console.log(`=== Topic Filter: ${topicTags} ===\n`);
  console.log(`Query: tags=[${tags.join(", ")}]${filter.language ? `, lang=${filter.language}` : ""}`);
  console.log(`Found: ${filtered.length} of ${sources.length} sources\n`);

  for (const source of filtered) {
    console.log(`  ${source.manifest.id}`);
    console.log(`    Title: ${source.manifest.title || "N/A"}`);
    console.log(`    Tags: ${(source.manifest.tags || []).join(", ")}`);
    console.log();
  }
}

function tagSearchCommand(tagQuery: string): void {
  const sources = listAllSources();
  const found = findByTag(sources, tagQuery);

  if (values.json || values.output) {
    const output = {
      query: { tag: tagQuery },
      totalSources: sources.length,
      matchedSources: found.length,
      sources: found.map(s => ({
        id: s.manifest.id,
        title: s.manifest.title,
        kind: s.kind,
        tags: s.manifest.tags,
        language: s.manifest.language,
        updated_at: s.manifest.updated_at,
      })),
    };

    const jsonOutput = JSON.stringify(output, null, 2);
    if (values.output) {
      fs.writeFileSync(values.output, jsonOutput + "\n");
      console.log(`Output written to: ${values.output}`);
    } else {
      console.log(jsonOutput);
    }
  } else {
    console.log(`=== Tag Search: "${tagQuery}" ===\n`);
    console.log(`Found: ${found.length} of ${sources.length} sources\n`);

    for (const source of found) {
      console.log(`  ${source.manifest.id}`);
      console.log(`    Title: ${source.manifest.title || "N/A"}`);
      console.log(`    Tags: ${(source.manifest.tags || []).join(", ")}`);
      console.log();
    }
  }
}

function searchCommand(keyword: string): void {
  const sources = listAllSources();
  const found = searchSources(sources, keyword);

  if (values.json || values.output) {
    const output = {
      query: { keyword },
      totalSources: sources.length,
      matchedSources: found.length,
      sources: found.map(s => ({
        id: s.manifest.id,
        title: s.manifest.title,
        description: s.manifest.description,
        kind: s.kind,
        tags: s.manifest.tags,
        language: s.manifest.language,
      })),
    };

    const jsonOutput = JSON.stringify(output, null, 2);
    if (values.output) {
      fs.writeFileSync(values.output, jsonOutput + "\n");
      console.log(`Output written to: ${values.output}`);
    } else {
      console.log(jsonOutput);
    }
  } else {
    console.log(`=== Search: "${keyword}" ===\n`);
    console.log(`Found: ${found.length} of ${sources.length} sources\n`);

    for (const source of found) {
      console.log(`  ${source.manifest.id}`);
      console.log(`    Title: ${source.manifest.title || "N/A"}`);
      console.log(`    Description: ${(source.manifest.description || "").slice(0, 100)}...`);
      console.log();
    }
  }
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  // Determine which command to run
  if (values["list-sources"]) {
    listSourcesCommand();
    return;
  }

  if (values["validate-manifests"]) {
    validateManifestsCommand();
    return;
  }

  if (values["stats"]) {
    statsCommand();
    return;
  }

  if (values["topic"]) {
    topicFilterCommand(values["topic"]);
    return;
  }

  if (values["tag"]) {
    tagSearchCommand(values["tag"]);
    return;
  }

  if (values["search"]) {
    searchCommand(values["search"]);
    return;
  }

  // Default: show help
  console.log("No command specified. Use --help for usage information.");
  console.log("\nCommon commands:");
  console.log("  bun scripts/test-synthesis.ts --list-sources");
  console.log("  bun scripts/test-synthesis.ts --validate-manifests");
  console.log("  bun scripts/test-synthesis.ts --stats");
}

main();
