import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LPCLexAdapter } from "./lpclex.js";

const mockPage = {
  goto: vi.fn(),
  evaluate: vi.fn(),
  close: vi.fn(),
};

const mockContext = {
  newPage: vi.fn().mockResolvedValue(mockPage),
  close: vi.fn(),
};

const mockBrowser = {
  newContext: vi.fn().mockResolvedValue(mockContext),
  close: vi.fn(),
};

// Mock playwright-extra
vi.mock("playwright-extra", () => {
  return {
    chromium: {
      use: vi.fn(),
      launch: vi.fn(),
    },
  };
});

// Mock aiAnalyzer
vi.mock("../aiAnalyzer.js", () => ({
  analyzeCasePage: vi.fn().mockResolvedValue({
    title: "AI Title",
    description: "AI Description",
    classDefinition: "AI Class",
    status: "Open",
    settlementAmount: "$1M",
    courtFileNumber: "CF-123",
    deadline: "2025-01-01",
  }),
}));

describe("LPCLexAdapter", () => {
  let adapter: LPCLexAdapter;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { chromium } = await import("playwright-extra");
    vi.mocked(chromium.launch).mockResolvedValue(mockBrowser as any);
    vi.mocked(mockBrowser.newContext).mockResolvedValue(mockContext as any);
    vi.mocked(mockContext.newPage).mockResolvedValue(mockPage as any);

    adapter = new LPCLexAdapter();
  });

  afterEach(async () => {
    await adapter.cleanup();
  });

  describe("listCases", () => {
    it("should parse list items from settlements page", async () => {
      mockPage.evaluate.mockResolvedValueOnce([
        {
          externalId: "test-slug",
          title: "Test Case",
          url: "https://lpclex.com/settlements/test-slug/",
          snippet: "Snippet content",
        },
      ]);

      const items = await adapter.listCases();

      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({
        externalId: "test-slug",
        title: "Test Case",
        url: "https://lpclex.com/settlements/test-slug/",
        snippet: "Snippet content",
      });
      expect(mockPage.goto).toHaveBeenCalledWith(
        "https://lpclex.com/settlements/",
        expect.any(Object),
      );
    });
  });

  describe("getCaseDetail", () => {
    it("should fetch case detail and analyze with AI", async () => {
      mockPage.goto.mockResolvedValueOnce({
        status: () => 200,
      });
      mockPage.evaluate.mockResolvedValueOnce({
        textContent: "Full case text content",
        htmlContent: "<div>Raw HTML</div>",
      });

      const result = await adapter.getCaseDetail("https://lpclex.com/settlements/test-slug/");

      expect(result.statusCode).toBe(200);
      expect(result.detail.title).toBe("AI Title");
      expect(result.detail.rawHtml).toBe("<div>Raw HTML</div>");
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
