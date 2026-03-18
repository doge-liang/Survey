#!/usr/bin/env bun
/**
 * Test end-to-end synthesis workflow
 * 
 * Usage:
 *   bun scripts/test-synthesis-e2e.ts --topic "RAG"
 */

import { parseArgs } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  listAllSources,
  filterSources,
  readSourceContent,
  readSourceWithMetadata,
  type TopicFilter,
} from "./synthesis-lib";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    topic: { type: "string", short: "t" },
    output: { type: "string", short: "o" },
  },
  allowPositionals: false,
});

async function runE2ETest(topic: string): Promise<void> {
  console.log(`=== E2E Synthesis Test: ${topic} ===\n`);

  // Step 1: Filter sources by topic tags
  const tags = topic.split(",").map(t => t.trim().toLowerCase());
  const filter: TopicFilter = { tags };

  console.log(`Step 1: Filtering sources by tags [${tags.join(", ")}]...`);
  const allSources = listAllSources();
  const filtered = filterSources(allSources, filter);
  console.log(`  Found ${filtered.length} matching sources out of ${allSources.length} total\n`);

  if (filtered.length === 0) {
    console.log("No sources found for this topic.");
    return;
  }

  // Step 2: Read manifest metadata for each source
  console.log("Step 2: Reading manifest metadata...");
  const sourcesWithMeta = filtered.map(s => ({
    id: s.manifest.id,
    title: s.manifest.title,
    tags: s.manifest.tags,
    language: s.manifest.language,
    updated_at: s.manifest.updated_at,
    upstream_url: s.manifest.upstream_url,
  }));

  for (const s of sourcesWithMeta) {
    console.log(`  ✓ ${s.id}`);
    console.log(`    Title: ${s.title || "N/A"}`);
    console.log(`    Tags: ${(s.tags || []).join(", ")}`);
  }
  console.log();

  // Step 3: Read content files
  console.log("Step 3: Reading content files...");
  const contents: { id: string; title?: string; content: string }[] = [];

  for (const source of filtered) {
    const content = readSourceWithMetadata(source);
    if (content) {
      contents.push({
        id: source.manifest.id,
        title: source.manifest.title,
        content,
      });
      console.log(`  ✓ Read: ${source.manifest.id}`);
    } else {
      console.log(`  ✗ Missing: ${source.manifest.id}`);
    }
  }
  console.log();

  // Step 4: Generate synthesis summary
  console.log("Step 4: Synthesis summary...");
  console.log("=".repeat(50));
  console.log(`Topic: ${topic}`);
  console.log(`Sources analyzed: ${contents.length}`);
  console.log(`Total content size: ${contents.reduce((sum, c) => sum + c.content.length, 0)} chars`);
  console.log();

  console.log("Source IDs:");
  for (const c of contents) {
    console.log(`  - ${c.id}${c.title ? `: ${c.title}` : ""}`);
  }
  console.log();

  // Step 5: Tag frequency analysis
  console.log("Tag frequency in selected sources:");
  const tagFreq: Record<string, number> = {};
  for (const source of filtered) {
    for (const tag of source.manifest.tags || []) {
      tagFreq[tag] = (tagFreq[tag] || 0) + 1;
    }
  }

  const sortedTags = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  for (const [tag, count] of sortedTags) {
    console.log(`  ${tag}: ${count}`);
  }
  console.log();

  console.log("✅ E2E test completed successfully!");
  console.log("\nNext steps for full synthesis:");
  console.log("  1. Use these sources to generate comparison.md");
  console.log("  2. Create knowledge-graph.md with entity relationships");
  console.log("  3. Document findings in survey/{topic}/");
}

async function main(): Promise<void> {
  if (!values.topic) {
    console.log("Usage: bun scripts/test-synthesis-e2e.ts --topic \"RAG\"");
    process.exit(1);
  }

  await runE2ETest(values.topic);
}

main().catch(console.error);
