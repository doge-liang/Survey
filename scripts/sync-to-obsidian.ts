#!/usr/bin/env bun
/**
 * Sync Survey research outputs to Obsidian vault.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

const VAULT_ROOT = "/mnt/d/Workspace/Notebook/research";

async function copyDir(src: string, dest: string): Promise<number> {
  let copied = 0;
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copied += await copyDir(srcPath, destPath);
    } else if (entry.name.endsWith(".md")) {
      await fs.copyFile(srcPath, destPath);
      console.log(`  Copy ${path.relative(process.cwd(), srcPath)} → ${path.relative(VAULT_ROOT, destPath)}`);
      copied++;
    }
  }
  return copied;
}

async function main() {
  console.log("🔄 Syncing Survey → Obsidian vault...\n");
  console.log(`Vault: ${VAULT_ROOT}\n`);

  const sections = [
    { src: "research/papers", dest: path.join(VAULT_ROOT, "papers") },
    { src: "research/github", dest: path.join(VAULT_ROOT, "github") },
    { src: "research/surveys", dest: path.join(VAULT_ROOT, "surveys") },
    { src: "research/domains", dest: path.join(VAULT_ROOT, "domains") },
  ];

  let total = 0;
  for (const section of sections) {
    try {
      const count = await copyDir(section.src, section.dest);
      console.log(`\n[${section.src}] → ${count} files\n`);
      total += count;
    } catch (e) {
      console.log(`\n[${section.src}] Error: ${e}\n`);
    }
  }

  console.log("=".repeat(50));
  console.log(`✅ Synced ${total} files to vault`);
  console.log("=".repeat(50));
}

main().catch(console.error);
