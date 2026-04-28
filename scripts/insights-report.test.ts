import { describe, expect, test } from "bun:test";

import { renderReportHtml, renderStatsSummary, buildReportData } from "./lib/insights-report";
import type { InsightsOutput } from "./insights";

function createMockOutput(overrides?: Partial<InsightsOutput>): InsightsOutput {
  return {
    generatedAt: "2026-04-27T10:00:00.000Z",
    dateRange: { start: "2026-03-01T00:00:00.000Z", end: "2026-04-27T00:00:00.000Z" },
    totalSessions: 50,
    analyzedCount: 42,
    totalUserMessages: 1200,
    totalDurationHours: 35.5,
    totalInputTokens: 500000,
    totalOutputTokens: 120000,
    totalCost: 2.45,
    totalAdditions: 15000,
    totalDeletions: 3000,
    totalFilesModified: 200,
    activeDays: 28,
    topTools: [
      { name: "read", count: 500 },
      { name: "bash", count: 300 },
      { name: "edit", count: 150 },
      { name: "grep", count: 100 },
      { name: "glob", count: 80 },
    ],
    languageCounts: { TypeScript: 50, Python: 20, Markdown: 15, JSON: 10 },
    hourDistribution: Array(24).fill(0).map((_, i) => i > 6 && i < 22 ? 10 : 2),
    featureUsage: {
      taskAgentSessions: 15,
      mcpSessions: 8,
      webSearchSessions: 20,
      webFetchSessions: 12,
    },
    sessions: [],
    ...overrides,
  };
}

describe("renderStatsSummary", () => {
  test("renders session count", () => {
    const html = renderStatsSummary(createMockOutput({ analyzedCount: 42, totalSessions: 50 }));
    expect(html).toContain("42");
    expect(html).toContain("50");
  });

  test("renders token counts", () => {
    const html = renderStatsSummary(createMockOutput({
      totalInputTokens: 500000,
      totalOutputTokens: 120000,
    }));
    expect(html).toContain("500,000");
    expect(html).toContain("120,000");
  });

  test("renders duration", () => {
    const html = renderStatsSummary(createMockOutput({ totalDurationHours: 35.5 }));
    expect(html).toContain("35.5");
  });
});

describe("buildReportData", () => {
  test("transforms output into report data structure", () => {
    const output = createMockOutput();
    const data = buildReportData(output);

    expect(data.header.totalSessions).toBe(50);
    expect(data.header.analyzedCount).toBe(42);
    expect(data.toolDistribution.length).toBe(5);
    expect(data.toolDistribution[0].name).toBe("read");
    expect(data.toolDistribution[0].percentage).toBeGreaterThan(0);
    expect(data.hourDistribution.length).toBe(24);
  });
});

describe("renderReportHtml", () => {
  test("generates valid HTML document", () => {
    const output = createMockOutput();
    const html = renderReportHtml(output);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(html).toContain("<title>OpenCode Insights</title>");
  });

  test("includes navigation sections", () => {
    const output = createMockOutput();
    const html = renderReportHtml(output);

    expect(html).toContain("At a Glance");
    expect(html).toContain("Project Areas");
    expect(html).toContain("What Works");
    expect(html).toContain("Friction");
    expect(html).toContain("Suggestions");
  });

  test("includes stats from output", () => {
    const output = createMockOutput({ analyzedCount: 42, activeDays: 28 });
    const html = renderReportHtml(output);

    expect(html).toContain("42");
    expect(html).toContain("28");
  });

  test("includes chart placeholders for tool distribution", () => {
    const output = createMockOutput();
    const html = renderReportHtml(output);

    expect(html).toContain("read");
    expect(html).toContain("bash");
    expect(html).toContain("edit");
  });

  test("is self-contained (no external CSS/JS dependencies)", () => {
    const output = createMockOutput();
    const html = renderReportHtml(output);

    // Should not have external CDN references
    expect(html).not.toContain("cdn.jsdelivr");
    expect(html).not.toContain("unpkg.com");
    expect(html).not.toContain("googleapis.com");
  });
});
