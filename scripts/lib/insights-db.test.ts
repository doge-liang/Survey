import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  querySessionMetadata,
  querySessionSummaries,
  queryToolCounts,
  queryMessageParts,
  querySessionStats,
  queryAllSessionsStats,
} from "./insights-db";
import type { SessionMetadata, SessionSummary } from "./insights-db";

const originalCwd = process.cwd();
let tempDir: string;
let dbPath: string;
let db: Database;

function createTestDatabase() {
  dbPath = path.join(tempDir, "test-opencode.db");
  db = new Database(dbPath);

  // Create schema matching OpenCode's structure
  db.exec(`
    CREATE TABLE session (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      parent_id TEXT,
      slug TEXT NOT NULL,
      directory TEXT NOT NULL,
      title TEXT NOT NULL,
      version TEXT NOT NULL,
      share_url TEXT,
      summary_additions INTEGER,
      summary_deletions INTEGER,
      summary_files INTEGER,
      summary_diffs TEXT,
      revert TEXT,
      permission TEXT,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL,
      time_compacting INTEGER,
      time_archived INTEGER,
      workspace_id TEXT
    );

    CREATE TABLE message (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE part (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE project (
      id TEXT PRIMARY KEY,
      worktree TEXT NOT NULL,
      vcs TEXT,
      name TEXT,
      icon_url TEXT,
      icon_color TEXT,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL,
      time_initialized INTEGER,
      sandboxes TEXT NOT NULL DEFAULT '[]',
      commands TEXT,
      icon_url_override TEXT
    );

    CREATE TABLE todo (
      session_id TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      position INTEGER NOT NULL,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL,
      PRIMARY KEY (session_id, position)
    );
  `);
  return db;
}

function insertSession(sid: string, overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  const defaults: Record<string, unknown> = {
    $project_id: "proj-1",
    $slug: `slug-${sid}`,
    $directory: "/test/project",
    $title: `Session ${sid}`,
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

  // Convert $ prefixed keys to positional with values from overrides
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
    { $id: sid, ...defaults },
  );
}

function insertMessage(id: string, sessionId: string, overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  const data = {
    role: "user",
    time: { created: now },
    agent: "default",
    model: { providerID: "test", modelID: "test-model" },
    ...overrides,
  };
  db.run(
    `INSERT INTO message (id, session_id, time_created, time_updated, data)
     VALUES ($id, $sessionId, $timeCreated, $timeUpdated, $data)`,
    {
      $id: id,
      $sessionId: sessionId,
      $timeCreated: now,
      $timeUpdated: now,
      $data: JSON.stringify(data),
    },
  );
}

function insertAssistantMessage(msgId: string, sessionId: string, overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  const data = {
    role: "assistant",
    parentID: `user-${msgId}`,
    mode: "default",
    agent: "default",
    path: { cwd: "/test/project", root: "/test/project" },
    cost: 0.001,
    tokens: { total: 1000, input: 800, output: 200, reasoning: 0, cache: { write: 0, read: 0 } },
    modelID: "test-model",
    providerID: "test",
    finish: "stop",
    time: { created: now, completed: now + 1000 },
    ...overrides,
  };
  db.run(
    `INSERT INTO message (id, session_id, time_created, time_updated, data)
     VALUES ($id, $sessionId, $timeCreated, $timeUpdated, $data)`,
    {
      $id: msgId,
      $sessionId: sessionId,
      $timeCreated: now,
      $timeUpdated: now + 1000,
      $data: JSON.stringify(data),
    },
  );
}

function insertPart(id: string, messageId: string, sessionId: string, data: Record<string, unknown>) {
  const now = Date.now();
  db.run(
    `INSERT INTO part (id, message_id, session_id, time_created, time_updated, data)
     VALUES ($id, $messageId, $sessionId, $timeCreated, $timeUpdated, $data)`,
    {
      $id: id,
      $messageId: messageId,
      $sessionId: sessionId,
      $timeCreated: now,
      $timeUpdated: now,
      $data: JSON.stringify(data),
    },
  );
}

function insertProject(id: string, worktree: string, vcs: string = "git") {
  const now = Date.now();
  db.run(
    `INSERT INTO project (id, worktree, vcs, time_created, time_updated, sandboxes)
     VALUES ($id, $worktree, $vcs, $tc, $tc, '[]')`,
    { $id: id, $worktree: worktree, $vcs: vcs, $tc: now },
  );
}

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "insights-db-test-"));
  process.chdir(tempDir);
  createTestDatabase();
});

afterEach(() => {
  process.chdir(originalCwd);
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("querySessionSummaries", () => {
  test("returns empty array when no sessions exist", () => {
    const result = querySessionSummaries(db);
    expect(result).toEqual([]);
  });

  test("returns session summary with metadata", () => {
    const now = Date.now();
    insertSession("ses-1", { time_created: now - 3600000, time_updated: now });
    insertMessage("msg-1", "ses-1");
    insertMessage("msg-2", "ses-1");
    insertAssistantMessage("msg-3", "ses-1");

    const result = querySessionSummaries(db);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ses-1");
    expect(result[0].directory).toBe("/test/project");
    expect(result[0].messageCount).toBe(3);
    expect(result[0].durationMinutes).toBeGreaterThan(0);
  });

  test("excludes archived sessions", () => {
    insertSession("ses-active", { time_archived: null });
    insertSession("ses-archived", { time_archived: Date.now() });

    const result = querySessionSummaries(db);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ses-active");
  });

  test("calculates duration in minutes", () => {
    const start = Date.now() - 600000; // 10 minutes ago
    const end = Date.now();
    insertSession("ses-1", { time_created: start, time_updated: end });

    const result = querySessionSummaries(db);
    expect(result).toHaveLength(1);
    expect(result[0].durationMinutes).toBeGreaterThanOrEqual(9);
    expect(result[0].durationMinutes).toBeLessThanOrEqual(11);
  });

  test("returns sessions ordered by time_created descending", () => {
    insertSession("ses-old", { time_created: 1000, slug: "old-slug" });
    insertSession("ses-new", { time_created: 2000, slug: "new-slug" });

    const result = querySessionSummaries(db);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("ses-new");
    expect(result[1].id).toBe("ses-old");
  });
});

describe("querySessionMetadata", () => {
  test("returns session with full metadata", () => {
    insertSession("ses-1", {
      title: "Test Session",
      summary_additions: 500,
      summary_deletions: 100,
      summary_files: 10,
    });
    insertProject("proj-1", "/test/project");

    const result = querySessionMetadata(db, "ses-1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("ses-1");
    expect(result!.title).toBe("Test Session");
    expect(result!.additions).toBe(500);
    expect(result!.deletions).toBe(100);
    expect(result!.filesModified).toBe(10);
  });

  test("returns null for nonexistent session", () => {
    const result = querySessionMetadata(db, "nonexistent");
    expect(result).toBeNull();
  });
});

describe("queryToolCounts", () => {
  test("counts tools by name", () => {
    insertSession("ses-1");
    insertMessage("msg-1", "ses-1");
    insertPart("prt-1", "msg-1", "ses-1", {
      type: "tool",
      tool: "read",
      state: { status: "completed" },
    });
    insertPart("prt-2", "msg-1", "ses-1", {
      type: "tool",
      tool: "bash",
      state: { status: "completed" },
    });
    insertPart("prt-3", "msg-1", "ses-1", {
      type: "tool",
      tool: "read",
      state: { status: "completed" },
    });

    const result = queryToolCounts(db, "ses-1");
    expect(result.read).toBe(2);
    expect(result.bash).toBe(1);
  });

  test("returns empty object for session with no tools", () => {
    insertSession("ses-1");
    insertMessage("msg-1", "ses-1");
    insertPart("prt-1", "msg-1", "ses-1", {
      type: "text",
      text: "hello",
    });

    const result = queryToolCounts(db, "ses-1");
    expect(result).toEqual({});
  });

  test("includes tool errors count", () => {
    insertSession("ses-1");
    insertMessage("msg-1", "ses-1");
    insertPart("prt-1", "msg-1", "ses-1", {
      type: "tool",
      tool: "bash",
      state: { status: "error", error: "command failed" },
    });
    insertPart("prt-2", "msg-1", "ses-1", {
      type: "tool",
      tool: "read",
      state: { status: "completed" },
    });

    const result = queryToolCounts(db, "ses-1");
    expect(result.bash).toBe(1);
    expect(result.retries).toBe(1);
  });
});

describe("queryMessageParts", () => {
  test("returns parts for a session in order", () => {
    insertSession("ses-1");
    insertMessage("msg-1", "ses-1");
    insertPart("prt-1", "msg-1", "ses-1", { type: "text", text: "user message text" });
    insertPart("prt-2", "msg-1", "ses-1", {
      type: "tool",
      tool: "read",
      state: { status: "completed", output: "file content" },
    });

    const result = queryMessageParts(db, "ses-1");
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("text");
    expect(result[0].text).toBe("user message text");
    expect(result[1].type).toBe("tool");
    expect(result[1].tool).toBe("read");
  });

  test("returns empty array for session with no parts", () => {
    insertSession("ses-1");
    const result = queryMessageParts(db, "ses-1");
    expect(result).toEqual([]);
  });
});

describe("querySessionStats", () => {
  test("counts user and assistant messages", () => {
    insertSession("ses-1");
    insertMessage("msg-u1", "ses-1");
    insertMessage("msg-u2", "ses-1");
    insertAssistantMessage("msg-a1", "ses-1");

    const result = querySessionStats(db, "ses-1");
    expect(result.userMessageCount).toBe(2);
    expect(result.assistantMessageCount).toBe(1);
  });

  test("aggregates token counts from assistant messages", () => {
    insertSession("ses-1");
    insertAssistantMessage("msg-1", "ses-1", {
      tokens: { total: 2000, input: 1500, output: 500, reasoning: 0, cache: { write: 0, read: 0 } },
    });
    insertAssistantMessage("msg-2", "ses-1", {
      tokens: { total: 1000, input: 700, output: 300, reasoning: 0, cache: { write: 0, read: 0 } },
    });

    const result = querySessionStats(db, "ses-1");
    expect(result.totalInputTokens).toBe(2200);
    expect(result.totalOutputTokens).toBe(800);
  });

  test("aggregates cost from assistant messages", () => {
    insertSession("ses-1");
    insertAssistantMessage("msg-1", "ses-1", { cost: 0.005 });
    insertAssistantMessage("msg-2", "ses-1", { cost: 0.003 });

    const result = querySessionStats(db, "ses-1");
    expect(result.totalCost).toBeCloseTo(0.008);
  });

  test("detects feature usage", () => {
    insertSession("ses-1");
    insertMessage("msg-1", "ses-1");
    insertPart("prt-1", "msg-1", "ses-1", { type: "tool", tool: "task", state: { status: "completed" } });
    insertPart("prt-2", "msg-1", "ses-1", { type: "tool", tool: "exa_web_search_exa", state: { status: "completed" } });
    insertPart("prt-3", "msg-1", "ses-1", { type: "tool", tool: "webfetch", state: { status: "completed" } });

    const result = querySessionStats(db, "ses-1");
    expect(result.usedTaskAgent).toBe(true);
    expect(result.usedWebSearch).toBe(true);
    expect(result.usedWebFetch).toBe(true);
  });

  test("records hours of user messages for time-of-day analysis", () => {
    insertSession("ses-1");
    const morning = new Date("2026-01-15T09:30:00Z").getTime();
    const afternoon = new Date("2026-01-15T14:00:00Z").getTime();
    const evening = new Date("2026-01-15T21:00:00Z").getTime();

    db.run(
      `INSERT INTO message (id, session_id, time_created, time_updated, data)
       VALUES ('msg-1', 'ses-1', $t1, $t1, '{"role":"user","time":{"created":0}}')`,
      { $t1: morning },
    );
    db.run(
      `INSERT INTO message (id, session_id, time_created, time_updated, data)
       VALUES ('msg-2', 'ses-1', $t2, $t2, '{"role":"user","time":{"created":0}}')`,
      { $t2: afternoon },
    );
    db.run(
      `INSERT INTO message (id, session_id, time_created, time_updated, data)
       VALUES ('msg-3', 'ses-1', $t3, $t3, '{"role":"user","time":{"created":0}}')`,
      { $t3: evening },
    );

    const result = querySessionStats(db, "ses-1");
    expect(result.userMessageHours).toContain(9);
    expect(result.userMessageHours).toContain(14);
    expect(result.userMessageHours).toContain(21);
  });

  test("counts tool errors", () => {
    insertSession("ses-1");
    insertMessage("msg-1", "ses-1");
    insertPart("prt-1", "msg-1", "ses-1", { type: "tool", tool: "bash", state: { status: "error" } });
    insertPart("prt-2", "msg-1", "ses-1", { type: "tool", tool: "read", state: { status: "error" } });

    const result = querySessionStats(db, "ses-1");
    expect(result.toolErrors).toBe(2);
  });
});

describe("queryAllSessionsStats", () => {
  test("aggregates across all sessions", () => {
    insertSession("ses-a", { time_created: 1000, time_updated: 1000 + 120000, summary_additions: 100, summary_deletions: 10, summary_files: 3 });
    insertMessage("msg-a1", "ses-a");
    insertMessage("msg-a2", "ses-a");
    insertAssistantMessage("msg-a3", "ses-a", { tokens: { total: 1000, input: 800, output: 200, reasoning: 0, cache: { write: 0, read: 0 } } });
    insertSession("ses-b", { time_created: 2000, time_updated: 2000 + 120000, summary_additions: 50, summary_deletions: 5, summary_files: 2 });
    insertMessage("msg-b1", "ses-b");
    insertMessage("msg-b2", "ses-b");

    const result = queryAllSessionsStats(db);
    expect(result.totalSessions).toBe(2);
    expect(result.totalAnalyzed).toBe(2);
    expect(result.totalUserMessages).toBe(4);
    expect(result.totalAdditions).toBe(150);
    expect(result.totalDeletions).toBe(15);
    expect(result.totalFilesModified).toBe(5);
  });

  test("filters out sessions with <2 messages or <1 minute", () => {
    // Session too short (< 1 min)
    insertSession("ses-short", { time_created: 1000, time_updated: 1050 }); // 50ms duration
    insertMessage("msg-s1", "ses-short");
    insertMessage("msg-s2", "ses-short");
    // Session with too few messages
    insertSession("ses-few", { time_created: 1000, time_updated: 200000 });
    insertMessage("msg-f1", "ses-few");

    const result = queryAllSessionsStats(db);
    expect(result.totalAnalyzed).toBe(0);
  });

  test("sessions shorter than 1 min are excluded", () => {
    insertSession("ses-fast", {
      time_created: 1000,
      time_updated: 1001, // 1ms = 0 minutes
    });
    insertMessage("msg-1", "ses-fast");
    insertMessage("msg-2", "ses-fast");

    const result = queryAllSessionsStats(db);
    expect(result.totalAnalyzed).toBe(0);
  });
});
