import { chromium } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, BrowserContext } from "playwright";
import type { SourceAdapter, CaseListItem, CaseDetail } from "../types.js";
import { analyzeCasePage } from "../aiAnalyzer.js";

const BASE_URL = "https://lpclex.com";
const SETTLEMENTS_URL = `${BASE_URL}/settlements/`;

// Add stealth plugin to playwright-extra
chromium.use(stealthPlugin());

export class LPCLexAdapter implements SourceAdapter {
  key = "lpclex";
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private proxy: { server: string; username?: string; password?: string } | null =
    null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
      });
    }
    return this.browser;
  }

  private async getContext(): Promise<BrowserContext> {
    if (!this.context) {
      const browser = await this.getBrowser();
      this.context = await browser.newContext({
        proxy: this.proxy || undefined,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      });
    }
    return this.context;
  }

  setProxy(proxy: {
    server: string;
    username?: string;
    password?: string;
  }): void {
    this.proxy = proxy;
  }

  async listCases(): Promise<CaseListItem[]> {
    const context = await this.getContext();
    const page = await context.newPage();

    try {
      await page.goto(SETTLEMENTS_URL, {
        waitUntil: "networkidle",
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

  async getCaseDetail(
    url: string,
  ): Promise<{ detail: CaseDetail; statusCode: number; duration: number }> {
    const context = await this.getContext();
    const page = await context.newPage();

    const start = Date.now();
    try {
      const response = await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      const duration = Date.now() - start;
      const statusCode = response?.status() || 0;

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

      return { detail, statusCode, duration };
    } finally {
      await page.close();
    }
  }

  async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
