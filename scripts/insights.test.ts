import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { extractSessionData, filterSessions, generateInsightsJson } from "./insights";
import type { InsightsOutput, ExtractedSession } from "./insights";

const originalCwd = process.cwd();
let tempDir: string;
let dbPath: string;
let db: Database;

function createTestDatabase() {
  dbPath = path.join(tempDir, "test-opencode.db");
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE session (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, parent_id TEXT,
      slug TEXT NOT NULL, directory TEXT NOT NULL, title TEXT NOT NULL,
      version TEXT NOT NULL, share_url TEXT, summary_additions INTEGER,
      summary_deletions INTEGER, summary_files INTEGER, summary_diffs TEXT,
      revert TEXT, permission TEXT, time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL, time_compacting INTEGER, time_archived INTEGER,
      workspace_id TEXT
    );
    CREATE TABLE message (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL,
      time_created INTEGER NOT NULL, time_updated INTEGER NOT NULL, data TEXT NOT NULL
    );
    CREATE TABLE part (
      id TEXT PRIMARY KEY, message_id TEXT NOT NULL, session_id TEXT NOT NULL,
      time_created INTEGER NOT NULL, time_updated INTEGER NOT NULL, data TEXT NOT NULL
    );
    CREATE TABLE project (
      id TEXT PRIMARY KEY, worktree TEXT NOT NULL, vcs TEXT,
      name TEXT, time_created INTEGER NOT NULL, time_updated INTEGER NOT NULL,
      time_initialized INTEGER, sandboxes TEXT NOT NULL DEFAULT '[]',
      icon_url TEXT, icon_color TEXT, commands TEXT, icon_url_override TEXT
    );
  `);
  return db;
}

function insertSession(id: string, overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  const defaults: Record<string, unknown> = {
    $project_id: "proj-test",
    $slug: `slug-${id}`,
    $directory: "/test/project",
    $title: `Session ${id}`,
    $version: "1.0.0",
    $time_created: now - 3600000,
    $time_updated: now,
    $parent_id: null,
    $share_url: null,
    $summary_additions: 100,
    $summary_deletions: 20,
    $summary_files: 5,
    $summary_diffs: null,
    $revert: null,
    $permission: null,
    $time_compacting: null,
    $time_archived: null,
    $workspace_id: null,
  };
  for (const [k, v] of Object.entries(overrides)) {
    defaults[`$${k}`] = v;
  }
  db.run(
    `INSERT INTO session (id, project_id, slug, directory, title, version, time_created, time_updated,
       parent_id, share_url, summary_additions, summary_deletions, summary_files,
       summary_diffs, revert, permission, time_compacting, time_archived, workspace_id)
     VALUES ($id, $project_id, $slug, $directory, $title, $version, $time_created, $time_updated,
             $parent_id, $share_url, $summary_additions, $summary_deletions, $summary_files,
             $summary_diffs, $revert, $permission, $time_compacting, $time_archived, $workspace_id)`,
    { $id: id, ...defaults },
  );
}

function insertMessage(sessionId: string, role: string, overrides: Record<string, unknown> = {}) {
  const id = `msg-${sessionId}-${Math.random().toString(36).slice(2)}`;
  const now = Date.now();
  const data = role === "assistant"
    ? {
        role: "assistant", parentID: "parent-id", mode: "default", agent: "default",
        path: { cwd: "/test", root: "/test" },
        cost: 0.001,
        tokens: { total: 1000, input: 800, output: 200, reasoning: 0, cache: { write: 0, read: 0 } },
        modelID: "test", providerID: "test", finish: "stop",
        time: { created: now, completed: now + 1000 },
        ...overrides,
      }
    : {
        role: "user", time: { created: now }, agent: "default",
        model: { providerID: "test", modelID: "test" },
        ...overrides,
      };
  db.run(
    `INSERT INTO message (id, session_id, time_created, time_updated, data)
     VALUES ($id, $sid, $tc, $tu, $data)`,
    { $id: id, $sid: sessionId, $tc: now, $tu: now, $data: JSON.stringify(data) },
  );
}

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "insights-test-"));
  process.chdir(tempDir);
  createTestDatabase();
});

afterEach(() => {
  process.chdir(originalCwd);
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("extractSessionData", () => {
  test("returns session data with metadata and chat parts", () => {
    insertSession("ses-1", { title: "Debug login flow", directory: "/projects/app" });
    insertMessage("ses-1", "user");
    insertMessage("ses-1", "user");
    insertMessage("ses-1", "assistant");

    // Insert part data linked to the session
    db.run(
      `INSERT INTO part (id, message_id, session_id, time_created, time_updated, data)
       VALUES ('prt-1', 'msg-dummy', 'ses-1', 1, 1, '{"type":"text","text":"help me debug"}')`,
    );

    const result = extractSessionData(db, "ses-1");
    expect(result).not.toBeNull();
    expect(result!.metadata.id).toBe("ses-1");
    expect(result!.metadata.title).toBe("Debug login flow");
    expect(result!.metadata.directory).toBe("/projects/app");
    expect(result!.chatParts.length).toBeGreaterThan(0);
    expect(result!.chatParts[0].type).toBe("text");
  });

  test("includes tool usage data", () => {
    insertSession("ses-1");
    insertMessage("ses-1", "user");
    insertMessage("ses-1", "user");
    insertMessage("ses-1", "assistant");

    // Insert tool parts via raw SQL
    db.run(
      `INSERT INTO part (id, message_id, session_id, time_created, time_updated, data)
       VALUES ('prt-1', 'msg-dummy', 'ses-1', 1, 1, '{"type":"tool","tool":"read","state":{"status":"completed"}}')`,
    );
    db.run(
      `INSERT INTO part (id, message_id, session_id, time_created, time_updated, data)
       VALUES ('prt-2', 'msg-dummy', 'ses-1', 2, 2, '{"type":"tool","tool":"bash","state":{"status":"completed"}}')`,
    );

    const result = extractSessionData(db, "ses-1");
    expect(result!.toolCounts.read).toBe(1);
    expect(result!.toolCounts.bash).toBe(1);
  });

  test("includes code change stats", () => {
    insertSession("ses-1", { summary_additions: 500, summary_deletions: 100, summary_files: 12 });
    insertMessage("ses-1", "user");
    insertMessage("ses-1", "user");

    const result = extractSessionData(db, "ses-1");
    expect(result!.metadata.additions).toBe(500);
    expect(result!.metadata.deletions).toBe(100);
    expect(result!.metadata.filesModified).toBe(12);
  });
});

describe("filterSessions", () => {
  test("filters out sessions with <2 user messages", () => {
    const sessions: ExtractedSession[] = [
      {
        metadata: {
          id: "ses-1", projectId: "p1", slug: "s1", directory: "/d1", title: "t1",
          timeCreated: 1000, timeUpdated: 1000 + 120000, additions: 0, deletions: 0, filesModified: 0,
        },
        stats: { sessionId: "ses-1", userMessageCount: 1, assistantMessageCount: 0, totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, languageCounts: {}, usedTaskAgent: false, usedMcp: false, usedWebSearch: false, usedWebFetch: false, userMessageHours: [], toolErrors: 0 },
        toolCounts: {},
        chatParts: [],
        featureFlags: [],
      },
    ];
    const result = filterSessions(sessions);
    expect(result).toHaveLength(0);
  });

  test("filters out sessions with <1 minute duration", () => {
    const sessions: ExtractedSession[] = [
      {
        metadata: {
          id: "ses-1", projectId: "p1", slug: "s1", directory: "/d1", title: "t1",
          timeCreated: 1000, timeUpdated: 1001, additions: 0, deletions: 0, filesModified: 0,
        },
        stats: { sessionId: "ses-1", userMessageCount: 3, assistantMessageCount: 0, totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, languageCounts: {}, usedTaskAgent: false, usedMcp: false, usedWebSearch: false, usedWebFetch: false, userMessageHours: [], toolErrors: 0 },
        toolCounts: {},
        chatParts: [],
        featureFlags: [],
      },
    ];
    const result = filterSessions(sessions);
    expect(result).toHaveLength(0);
  });

  test("keeps valid sessions", () => {
    const sessions: ExtractedSession[] = [
      {
        metadata: {
          id: "ses-1", projectId: "p1", slug: "s1", directory: "/d1", title: "t1",
          timeCreated: 1000, timeUpdated: 1000 + 120000, additions: 0, deletions: 0, filesModified: 0,
        },
        stats: { sessionId: "ses-1", userMessageCount: 5, assistantMessageCount: 0, totalInputTokens: 1000, totalOutputTokens: 500, totalCost: 0.01, languageCounts: {}, usedTaskAgent: false, usedMcp: false, usedWebSearch: false, usedWebFetch: false, userMessageHours: [], toolErrors: 0 },
        toolCounts: {},
        chatParts: [],
        featureFlags: [],
      },
    ];
    const result = filterSessions(sessions);
    expect(result).toHaveLength(1);
  });
});

describe("generateInsightsJson", () => {
  test("generates complete insights output JSON", () => {
    insertSession("ses-valid", {
      time_created: 1000,
      time_updated: 1000 + 300000,
      summary_additions: 200,
      summary_deletions: 30,
      summary_files: 8,
      title: "Implement login",
      directory: "/projects/auth",
    });
    insertMessage("ses-valid", "user");
    insertMessage("ses-valid", "user");
    insertMessage("ses-valid", "user");
    insertMessage("ses-valid", "assistant", { cost: 0.005 });
    insertMessage("ses-valid", "assistant");

    insertSession("ses-too-short", {
      time_created: 1000,
      time_updated: 1050,
    });
    insertMessage("ses-too-short", "user");
    insertMessage("ses-too-short", "user");
    insertMessage("ses-too-short", "assistant");

    const result = generateInsightsJson(db);
    expect(result.totalSessions).toBe(2);
    expect(result.analyzedCount).toBe(1);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].metadata.id).toBe("ses-valid");
  });

  test("includes aggregated statistics", () => {
    insertSession("ses-a", {
      time_created: 1000,
      time_updated: 1000 + 120000,
      summary_additions: 100,
      summary_deletions: 10,
      summary_files: 3,
    });
    insertMessage("ses-a", "user");
    insertMessage("ses-a", "user");
    insertMessage("ses-a", "assistant", { tokens: { total: 500, input: 400, output: 100, reasoning: 0, cache: { write: 0, read: 0 } }, cost: 0.002 });

    insertSession("ses-b", {
      time_created: 2000,
      time_updated: 2000 + 120000,
      summary_additions: 50,
      summary_deletions: 5,
      summary_files: 2,
    });
    insertMessage("ses-b", "user");
    insertMessage("ses-b", "user");
    insertMessage("ses-b", "assistant", { tokens: { total: 300, input: 200, output: 100, reasoning: 0, cache: { write: 0, read: 0 } }, cost: 0.001 });

    const result = generateInsightsJson(db);
    expect(result.totalUserMessages).toBe(4);
    expect(result.totalInputTokens).toBe(600);
    expect(result.totalOutputTokens).toBe(200);
    expect(result.totalAdditions).toBe(150);
    expect(result.totalDeletions).toBe(15);
  });
});
