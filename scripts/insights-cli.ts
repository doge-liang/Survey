import { Database } from "bun:sqlite";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { generateInsightsJson, type InsightsOutput } from "./insights";
import { renderReportHtml } from "./lib/insights-report";

const DB_DIR = path.join(os.homedir(), ".local", "share", "opencode");
const DB_PATH = path.join(DB_DIR, "opencode.db");
const STORAGE_DIR = path.join(DB_DIR, "storage", "session_diff");
const DEFAULT_OUTPUT_DIR = path.join(os.homedir(), ".opencode", "insights");
const DEFAULT_OUTPUT_FILE = path.join(DEFAULT_OUTPUT_DIR, "report.html");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function printUsage() {
  console.log("OpenCode Insights — Session analysis and reporting");
  console.log("");
  console.log("Usage:");
  console.log("  bun scripts/insights-cli.ts --json          Extract session data as JSON");
  console.log("  bun scripts/insights-cli.ts --report         Generate HTML report");
  console.log("  bun scripts/insights-cli.ts --json --db <path>  Use custom DB path");
  console.log("  bun scripts/insights-cli.ts --report --output <path>  Custom output path");
}

async function main() {
  const args = process.argv.slice(2);

  const jsonMode = args.includes("--json");
  const reportMode = args.includes("--report");

  if (!jsonMode && !reportMode) {
    printUsage();
    process.exit(0);
  }

  const dbIdx = args.indexOf("--db");
  const dbPath = dbIdx !== -1 ? args[dbIdx + 1] : DB_PATH;

  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found: ${dbPath}`);
    console.error("OpenCode session database does not exist yet. Use OpenCode more to generate data.");
    process.exit(1);
  }

  let db: Database;
  try {
    db = new Database(dbPath, { readonly: true });
  } catch (e) {
    console.error(`Failed to open database: ${e}`);
    process.exit(1);
  }

  const output = generateInsightsJson(db, STORAGE_DIR);
  db.close();

  if (jsonMode) {
    console.log(JSON.stringify(output, null, 2));
  }

  if (reportMode) {
    const outputIdx = args.indexOf("--output");
    const outputPath = outputIdx !== -1 ? args[outputIdx + 1] : DEFAULT_OUTPUT_FILE;

    ensureDir(path.dirname(outputPath));

    // Check for narrative content from --at-a-glance flag
    const narrativeIdx = args.indexOf("--at-a-glance");
    let narrative: Record<string, string> | undefined;
    if (narrativeIdx !== -1) {
      narrative = { atAGlance: args[narrativeIdx + 1] || "" };
    }

    const html = renderReportHtml(output, narrative);
    fs.writeFileSync(outputPath, html);

    console.log(`Report generated: ${outputPath}`);
    console.log(`Sessions analyzed: ${output.analyzedCount} (of ${output.totalSessions} total)`);
    console.log(`Date range: ${output.dateRange.start} to ${output.dateRange.end}`);
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
