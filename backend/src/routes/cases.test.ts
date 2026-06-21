import { describe, it, expect, vi, beforeEach } from "vitest";
import router from "./cases.js";
import { db } from "../db/index.js";

vi.mock("../db/index.js", () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return {
    db: mockDb,
    schema: {
      cases: {
        id: "cases.id",
        title: "cases.title",
        summary: "cases.summary",
        status: "cases.status",
        settlementAmount: "cases.settlementAmount",
        detailUrl: "cases.detailUrl",
        courtFileNumber: "cases.courtFileNumber",
        scrapedAt: "cases.scrapedAt",
        description: "cases.description",
        classDefinition: "cases.classDefinition",
        deadline: "cases.deadline",
        aiAnalysis: "cases.aiAnalysis",
        createdAt: "cases.createdAt",
      },
      userFlags: {
        caseId: "userFlags.caseId",
        flag: "userFlags.flag",
        notes: "userFlags.notes",
        updatedAt: "userFlags.updatedAt",
      },
    },
  };
});

describe("cases router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /", () => {
    it("should return a list of cases with pagination", async () => {
      const mockCases = [
        { id: 1, title: "Case 1", summary: "Summary 1" },
        { id: 2, title: "Case 2", summary: "Summary 2" },
      ];

      const mockSelectCases = {
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        $dynamic: vi.fn().mockResolvedValue(mockCases),
      };

      const mockSelectCount = { 
        from: vi.fn().mockResolvedValue([{ total: 2 }]) 
      };

      vi.mocked(db.select)
        .mockReturnValueOnce(mockSelectCases as any)
        .mockReturnValueOnce(mockSelectCount as any);

      const req = { query: { page: "1", limit: "20" } } as any;
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      } as any;

      const route = router.stack.find((s) => s.route?.path === "/" && s.route?.methods?.get);
      expect(route).toBeDefined();

      await route.route.stack[0].handle(req, res);

      expect(res.json).toHaveBeenCalledWith({
        cases: mockCases,
        total: 2,
        page: 1,
        limit: 20,
      });
    });

    it("should handle errors and return 500", async () => {
      vi.mocked(db.select).mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      const req = { query: {} } as any;
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      } as any;

      const route = router.stack.find((s) => s.route?.path === "/" && s.route?.methods?.get);
      await route.route.stack[0].handle(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch cases" });
    });
  });

  describe("GET /:id", () => {
    it("should return case details if found", async () => {
      const mockCase = { id: 1, title: "Case 1", description: "Description 1" };

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockCase]),
      };

      vi.mocked(db.select).mockReturnValueOnce(mockSelect as any);

      const req = { params: { id: "1" } } as any;
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      } as any;

      const route = router.stack.find((s) => s.route?.path === "/:id" && s.route?.methods?.get);
      expect(route).toBeDefined();

      await route.route.stack[0].handle(req, res);

      expect(res.json).toHaveBeenCalledWith(mockCase);
    });

    it("should return 404 if case not found", async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValueOnce(mockSelect as any);

      const req = { params: { id: "999" } } as any;
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      } as any;

      const route = router.stack.find((s) => s.route?.path === "/:id" && s.route?.methods?.get);
      await route.route.stack[0].handle(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Case not found" });
    });
  });

  describe("PATCH /:id/flag", () => {
    it("should return 400 for invalid flag value", async () => {
      const req = { params: { id: "1" }, body: { flag: "invalid" } } as any;
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      } as any;

      const route = router.stack.find((s) => s.route?.path === "/:id/flag" && s.route?.methods?.patch);
      expect(route).toBeDefined();

      await route.route.stack[0].handle(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid flag value. Use: yes, no, unsure" });
    });

    it("should insert flag if it does not exist", async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(db.select).mockReturnValueOnce(mockSelect as any);

      const mockInsert = {
        values: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(db.insert).mockReturnValueOnce(mockInsert as any);

      const req = { params: { id: "1" }, body: { flag: "yes", notes: "Some notes" } } as any;
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      } as any;

      const route = router.stack.find((s) => s.route?.path === "/:id/flag" && s.route?.methods?.patch);
      await route.route.stack[0].handle(req, res);

      expect(db.insert).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, caseId: 1, flag: "yes" });
    });

    it("should update flag if it already exists", async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ id: 10, caseId: 1, flag: "unsure" }]),
      };
      vi.mocked(db.select).mockReturnValueOnce(mockSelect as any);

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(db.update).mockReturnValueOnce(mockUpdate as any);

      const req = { params: { id: "1" }, body: { flag: "yes", notes: "Updated notes" } } as any;
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      } as any;

      const route = router.stack.find((s) => s.route?.path === "/:id/flag" && s.route?.methods?.patch);
      await route.route.stack[0].handle(req, res);

      expect(db.update).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, caseId: 1, flag: "yes" });
    });
  });
});