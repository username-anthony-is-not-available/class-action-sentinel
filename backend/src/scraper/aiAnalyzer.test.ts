import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzeCasePage } from "./aiAnalyzer.js";
import OpenAI from "openai";

vi.mock("openai", () => {
  const createMock = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: createMock,
        },
      },
    })),
  };
});

describe("aiAnalyzer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully parse OpenAI response and return CaseDetail", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: "Mock Case Title",
              description: "Mock Description",
              classDefinition: "Mock Class Definition",
              status: "Mock Status",
              settlementAmount: "$5,000,000",
              courtFileNumber: "CV-12345",
              deadline: "2025-06-30",
            }),
          },
        },
      ],
    };

    const openaiInstance = new OpenAI({ apiKey: "test" });
    vi.mocked(openaiInstance.chat.completions.create).mockResolvedValue(mockResponse as any);

    const result = await analyzeCasePage("Some raw text content");

    expect(result).toEqual({
      title: "Mock Case Title",
      description: "Mock Description",
      classDefinition: "Mock Class Definition",
      status: "Mock Status",
      settlementAmount: "$5,000,000",
      courtFileNumber: "CV-12345",
      deadline: "2025-06-30",
      rawHtml: "Some raw text content",
    });
  });

  it("should throw an error if OpenAI response is empty", async () => {
    const mockResponse = {
      choices: [],
    };

    const openaiInstance = new OpenAI({ apiKey: "test" });
    vi.mocked(openaiInstance.chat.completions.create).mockResolvedValue(mockResponse as any);

    await expect(analyzeCasePage("Some raw text content")).rejects.toThrow("Empty AI response");
  });

  it("should handle missing optional fields in JSON response", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: "Mock Case Title",
              description: "Mock Description",
              classDefinition: "Mock Class Definition",
              status: "Mock Status",
            }),
          },
        },
      ],
    };

    const openaiInstance = new OpenAI({ apiKey: "test" });
    vi.mocked(openaiInstance.chat.completions.create).mockResolvedValue(mockResponse as any);

    const result = await analyzeCasePage("Some raw text content");

    expect(result).toEqual({
      title: "Mock Case Title",
      description: "Mock Description",
      classDefinition: "Mock Class Definition",
      status: "Mock Status",
      settlementAmount: null,
      courtFileNumber: null,
      deadline: null,
      rawHtml: "Some raw text content",
    });
  });
});