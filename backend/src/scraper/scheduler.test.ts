import { describe, it, expect, vi, beforeEach } from "vitest";
import { startScheduler, triggerManualScrape } from "./scheduler.js";
import { LPCLexAdapter } from "./adapters/lpclex.js";
import { runScrape } from "./engine.js";
import cron from "node-cron";

vi.mock("./adapters/lpclex.js", () => {
  return {
    LPCLexAdapter: vi.fn().mockImplementation(() => ({
      key: "lpclex",
    })),
  };
});

vi.mock("./engine.js", () => ({
  runScrape: vi.fn().mockResolvedValue({ runId: 1, newCases: 0 }),
}));

vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn(),
  },
}));

describe("scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("startScheduler", () => {
    it("should schedule a cron job", () => {
      startScheduler();
      expect(cron.schedule).toHaveBeenCalledWith(expect.any(String), expect.any(Function));
    });

    it("should execute scrape when cron job triggers", async () => {
      startScheduler();
      const cronCallback = vi.mocked(cron.schedule).mock.calls[0][1] as () => void;

      await cronCallback();

      expect(LPCLexAdapter).toHaveBeenCalled();
      expect(runScrape).toHaveBeenCalled();
    });

    it("should handle errors in cron job", async () => {
      vi.mocked(runScrape).mockRejectedValueOnce(new Error("Scrape failed"));
      startScheduler();
      const cronCallback = vi.mocked(cron.schedule).mock.calls[0][1] as () => Promise<void>;

      await expect(cronCallback()).resolves.not.toThrow();
    });
  });

  describe("triggerManualScrape", () => {
    it("should immediately run scrape", async () => {
      const result = await triggerManualScrape();
      expect(result).toEqual({ runId: 1, newCases: 0 });
      expect(LPCLexAdapter).toHaveBeenCalled();
      expect(runScrape).toHaveBeenCalled();
    });
  });
});
