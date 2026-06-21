import { describe, it, expect, vi, beforeEach } from "vitest";
import { runScrape } from "./engine.js";
import { db } from "../db/index.js";
import {
  sendNewCaseNotification,
  sendTrackedCaseUpdateNotification,
} from "../notifications/emailService.js";
import type { SourceAdapter } from "./types.js";

vi.mock("../db/index.js", () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return {
    db: mockDb,
    schema: {
      sources: { id: "sources.id", adapterKey: "sources.adapterKey" },
      cases: { id: "cases.id", externalId: "cases.externalId", sourceId: "cases.sourceId" },
      scrapeRuns: { id: "scrapeRuns.id" },
      userFlags: { caseId: "userFlags.caseId", flag: "userFlags.flag" },
    },
  };
});

vi.mock("../notifications/emailService.js", () => ({
  sendNewCaseNotification: vi.fn().mockResolvedValue(undefined),
  sendTrackedCaseUpdateNotification: vi.fn().mockResolvedValue(undefined),
}));

describe("engine - runScrape", () => {
  let mockAdapter: SourceAdapter;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAdapter = {
      key: "test-adapter",
      listCases: vi.fn().mockResolvedValue([
        {
          externalId: "case-1",
          title: "Test Case 1",
          url: "http://example.com/case-1",
          snippet: "Snippet 1",
        },
        {
          externalId: "case-2",
          title: "Test Case 2",
          url: "http://example.com/case-2",
          snippet: "Snippet 2",
        },
      ]),
      getCaseDetail: vi.fn().mockResolvedValue({
        title: "Detailed Test Case",
        description: "Detailed Description",
        classDefinition: "Detailed Class Definition",
        status: "Open",
        settlementAmount: "$1,000,000",
        courtFileNumber: "123-ABC",
        deadline: "2025-12-31",
        rawHtml: "<html></html>",
      }),
      cleanup: vi.fn().mockResolvedValue(undefined),
    };
  });

  it("should successfully run scrape for new cases", async () => {
    const mockSourceSelect = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ id: 1, adapterKey: "test-adapter", name: "test-adapter" }]),
    };
    vi.mocked(db.select).mockReturnValueOnce(mockSourceSelect as any);

    const mockScrapeRunInsert = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 10 }]),
    };
    vi.mocked(db.insert).mockReturnValueOnce(mockScrapeRunInsert as any);

    const mockCasesSelect = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.select).mockReturnValueOnce(mockCasesSelect as any);

    const mockCaseInsert = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: 101,
          title: "Detailed Test Case",
          status: "Open",
          settlementAmount: "$1,000,000",
          deadline: "2025-12-31",
          detailUrl: "http://example.com/case-1",
        },
      ]),
    };
    vi.mocked(db.insert).mockReturnValue(mockCaseInsert as any);

    const mockUpdate = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.update).mockReturnValue(mockUpdate as any);

    const result = await runScrape(mockAdapter);

    expect(result).toEqual({ runId: 10, newCases: 2 });
    expect(mockAdapter.listCases).toHaveBeenCalled();
    expect(mockAdapter.getCaseDetail).toHaveBeenCalledTimes(2);
    expect(sendNewCaseNotification).toHaveBeenCalledTimes(2);
    expect(mockAdapter.cleanup).toHaveBeenCalled();
  });

  it("should handle tracked cases and send update notifications if changes are detected", async () => {
    const mockSourceSelect = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ id: 1, adapterKey: "test-adapter", name: "test-adapter" }]),
    };
    vi.mocked(db.select).mockReturnValueOnce(mockSourceSelect as any);

    const mockScrapeRunInsert = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 10 }]),
    };
    vi.mocked(db.insert).mockReturnValueOnce(mockScrapeRunInsert as any);

    const mockCasesSelect = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        {
          id: 100,
          externalId: "case-1",
          title: "Test Case 1",
          status: "Pending",
          deadline: "2025-12-31",
          settlementAmount: "$1,000,000",
          flag: "yes",
        },
      ]),
    };
    vi.mocked(db.select).mockReturnValueOnce(mockCasesSelect as any);

    const mockUpdate = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.update).mockReturnValue(mockUpdate as any);

    mockAdapter.listCases = vi.fn().mockResolvedValue([
      {
        externalId: "case-1",
        title: "Test Case 1",
        url: "http://example.com/case-1",
        snippet: "Snippet 1",
      },
    ]);

    const result = await runScrape(mockAdapter);

    expect(result).toEqual({ runId: 10, newCases: 0 });
    expect(sendTrackedCaseUpdateNotification).toHaveBeenCalledWith(
      {
        title: "Test Case 1",
        status: "Open",
        settlementAmount: "$1,000,000",
        deadline: "2025-12-31",
        detailUrl: "http://example.com/case-1",
      },
      ['Status changed from "Pending" to "Open"']
    );
    expect(mockAdapter.cleanup).toHaveBeenCalled();
  });

  it("should handle errors and mark scrape run as failed", async () => {
    const mockSourceSelect = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ id: 1, adapterKey: "test-adapter", name: "test-adapter" }]),
    };
    vi.mocked(db.select).mockReturnValueOnce(mockSourceSelect as any);

    const mockScrapeRunInsert = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 10 }]),
    };
    vi.mocked(db.insert).mockReturnValueOnce(mockScrapeRunInsert as any);

    const testError = new Error("Network error");
    mockAdapter.listCases = vi.fn().mockRejectedValue(testError);

    const mockUpdate = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.update).mockReturnValue(mockUpdate as any);

    await expect(runScrape(mockAdapter)).rejects.toThrow("Network error");

    expect(db.update).toHaveBeenCalled();
    expect(mockAdapter.cleanup).toHaveBeenCalled();
  });
});