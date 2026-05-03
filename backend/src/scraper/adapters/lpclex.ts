import puppeteer, { type Browser } from "puppeteer";
import type { SourceAdapter, CaseListItem, CaseDetail } from "../types.js";
import { analyzeCasePage } from "../aiAnalyzer.js";

const BASE_URL = "https://lpclex.com";
const SETTLEMENTS_URL = `${BASE_URL}/settlements/`;

export class LPCLexAdapter implements SourceAdapter {
  key = "lpclex";
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });
    }
    return this.browser;
  }

  async listCases(): Promise<CaseListItem[]> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(SETTLEMENTS_URL, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Each case is an <article> with an <h2> containing a link
      const items = await page.evaluate(() => {
        const articles = document.querySelectorAll("article");
        const results: {
          externalId: string;
          title: string;
          url: string;
          snippet: string;
        }[] = [];

        articles.forEach((article) => {
          const link = article.querySelector(
            "h2 a",
          ) as HTMLAnchorElement | null;
          const excerptEl = article.querySelector(
            ".entry-summary p, .entry-content p",
          );

          if (link?.href) {
            // Extract slug from URL as external ID
            const url = new URL(link.href);
            const slug = url.pathname.replace(/\//g, "").trim();

            results.push({
              externalId: slug,
              title: link.textContent?.trim() || "",
              url: link.href,
              snippet: excerptEl?.textContent?.trim() || "",
            });
          }
        });

        return results;
      });

      return items;
    } finally {
      await page.close();
    }
  }

  async getCaseDetail(url: string): Promise<CaseDetail> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

      // Extract the main content text and HTML
      const { textContent, htmlContent } = await page.evaluate(() => {
        const main = document.querySelector(".entry-content, article, main");
        return {
          textContent:
            main?.textContent?.trim() ||
            document.body.textContent?.trim() ||
            "",
          htmlContent: main?.innerHTML || "",
        };
      });

      // Use AI to analyze and extract structured data
      const detail = await analyzeCasePage(textContent);
      detail.rawHtml = htmlContent;

      return detail;
    } finally {
      await page.close();
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
