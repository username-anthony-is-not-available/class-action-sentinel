import OpenAI from "openai";
import type { CaseDetail } from "./types.js";

// Supports OpenAI, OpenRouter, or any OpenAI-compatible provider
const AI_BASE_URL = process.env.AI_BASE_URL; // undefined = default OpenAI
const AI_API_KEY = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";

const openai = new OpenAI({
  apiKey: AI_API_KEY,
  ...(AI_BASE_URL && { baseURL: AI_BASE_URL }),
});

const SYSTEM_PROMPT = `You are a legal data extraction assistant. Given the raw text content of a class action settlement page, extract structured information.

Return a JSON object with exactly these fields:
- title: string — the case title
- description: string — what the case is about (2-3 paragraphs max)
- classDefinition: string — who is eligible / class definition
- status: string — current status of the case/settlement
- settlementAmount: string | null — dollar amount if mentioned
- courtFileNumber: string | null — court file number if present
- deadline: string | null — any filing or claim deadline

Only return valid JSON. No markdown, no explanation.`;

export async function analyzeCasePage(rawText: string): Promise<CaseDetail> {
  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawText.slice(0, 12000) }, // cap tokens
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");

  const parsed = JSON.parse(content);

  return {
    title: parsed.title ?? "",
    description: parsed.description ?? "",
    classDefinition: parsed.classDefinition ?? "",
    status: parsed.status ?? "",
    settlementAmount: parsed.settlementAmount ?? null,
    courtFileNumber: parsed.courtFileNumber ?? null,
    deadline: parsed.deadline ?? null,
    rawHtml: rawText,
  };
}
