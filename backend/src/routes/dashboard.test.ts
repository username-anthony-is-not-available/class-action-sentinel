import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { db } from "../db/index.js";
import dashboardRouter from "./dashboard.js";
import { triggerManualScrape } from "../scraper/scheduler.js";

// Mock the db and scheduler
vi.mock("../db/index.js", () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return {
    db: mockDb,
    schema: {
      cases: { id: "cases.id", title: "cases.title", status: "cases.status", scrapedAt: "cases.scrapedAt" },
      userFlags: { flag: "userFlags.flag", caseId: "userFlags.caseId" },
      scrapeRuns: { id: "scrapeRuns.id", startedAt: "scrapeRuns.startedAt" },
    },
  };
});

vi.mock("../scraper/scheduler.js", () => ({
  triggerManualScrape: vi.fn().mockResolvedValue({ runId: 123, newCases: 5 }),
}));

const app = express();
app.use(express.json());
app.use("/api/dashboard", dashboardRouter);

describe("dashboard router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/dashboard/stats", () => {
    it("should return correct stats", async () => {
      // Mock total count
      const mockTotalCount = {
        from: vi.fn().mockResolvedValue([{ total: 10 }]),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(db.select).mockReturnValueOnce(mockTotalCount as any);

      // Mock flag counts
      const mockFlagCounts = {
        from: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([
          { flag: "yes", count: 2 },
          { flag: "no", count: 1 },
          { flag: "unsure", count: 1 },
        ]),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(db.select).mockReturnValueOnce(mockFlagCounts as any);

      // Mock recent cases
      const mockRecentCases = {
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: 1, title: "Case 1", status: "Open", scrapedAt: new Date() },
        ]),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(db.select).mockReturnValueOnce(mockRecentCases as any);

      const response = await request(app).get("/api/dashboard/stats");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        totalCases: 10,
        flags: {
          yes: 2,
          no: 1,
          unsure: 1,
          unflagged: 6, // 10 - (2+1+1)
        },
        recentCases: expect.any(Array),
      });
    });

    it("should handle errors and return 500", async () => {
      vi.mocked(db.select).mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      const response = await request(app).get("/api/dashboard/stats");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Failed to fetch stats" });
    });
  });

  describe("GET /api/dashboard/scrape-runs", () => {
    it("should return list of scrape runs", async () => {
      const mockScrapeRuns = [
        { id: 10, status: "completed", startedAt: new Date().toISOString() },
      ];

      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockScrapeRuns),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(db.select).mockReturnValueOnce(mockQuery as any);

      const response = await request(app).get("/api/dashboard/scrape-runs");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockScrapeRuns);
    });

    it("should handle errors and return 500", async () => {
      vi.mocked(db.select).mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      const response = await request(app).get("/api/dashboard/scrape-runs");

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/dashboard/scrape/trigger", () => {
    it("should trigger a manual scrape and return 200", async () => {
      const response = await request(app).post("/api/dashboard/scrape/trigger");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Scrape triggered", status: "running" });
      expect(triggerManualScrape).toHaveBeenCalled();
    });

    it("should handle errors in the trigger function", async () => {
        // triggerManualScrape is fire and forget in the route, but we can mock it to fail
        vi.mocked(triggerManualScrape).mockRejectedValueOnce(new Error("Trigger fail"));

        const response = await request(app).post("/api/dashboard/scrape/trigger");
        expect(response.status).toBe(200); // Route responds before waiting
    });
  });
});
