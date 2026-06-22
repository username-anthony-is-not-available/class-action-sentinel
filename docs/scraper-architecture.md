# Scraper Architecture

The Class Action Sentinel uses a modular scraper system designed for
extensibility and resilience. This document details the internal architecture,
the `SourceAdapter` interface, and best practices for adding new settlement
sources.

## Overview

The scraping process is orchestrated by the **Scraper Engine**
(`backend/src/scraper/engine.ts`). The engine acts as a central controller that
manages the high-level flow of data, while delegating site-specific navigation
and parsing to **Source Adapters**.

### Scrape Lifecycle

A typical scrape run follows these steps:

1. **Source Verification**: The engine ensures the adapter's `key` exists in the
   `sources` table. If not, it registers the new source automatically.
2. **Run Creation**: A new record is created in the `scrape_runs` table with a
   `running` status to track the operation's progress.
3. **Case Listing**: The engine calls the adapter's `listCases()` method. This
   method should return a list of all current cases found on the source's
   listing page(s).
4. **Case Diffing**: The engine compares the fetched list against the database.
   It identifies:
   - **New Cases**: Cases with an `externalId` not yet in the database.
   - **Tracked Cases**: Existing cases that the user has flagged as "Yes" or
     "Unsure" for eligibility.
5. **Detail Extraction**: For each new or tracked case, the engine calls
   `getCaseDetail(url)`. This is where deep parsing and AI analysis occur.
6. **Persistence & Notification**:
   - **New Case Notification**: New cases are saved to the `cases` table, and a
     notification is sent.
   - **Tracked Case Update**: Tracked cases are checked for updates (e.g., status
     or deadline changes). If changes are detected, the database is updated and
     a notification is sent.
7. **Finalization**: The `scrape_runs` record is updated with the final status
   (`completed` or `failed`), case counts, and any error messages. Resources
   are released via the adapter's `cleanup()` method.

---

## The SourceAdapter Interface

Every new source must implement the `SourceAdapter` interface defined in
`backend/src/scraper/types.ts`.

### Interface Definition

```typescript
export interface SourceAdapter {
  /** Unique key matching the `adapter_key` in the sources table */
  key: string;

  /** Fetch all case links from the listing page(s) */
  listCases(): Promise<CaseListItem[]>;

  /** Fetch and parse a single case detail page */
  getCaseDetail(
    url: string,
  ): Promise<{ detail: CaseDetail; statusCode: number; duration: number }>;

  /** Clean up resources (e.g., close browser) */
  cleanup(): Promise<void>;

  /** Set proxy configuration for the adapter */
  setProxy?(proxy: {
    server: string;
    username?: string;
    password?: string;
  }): void;
}
```

### Method Specifications

#### `key` (Property)

- **Description**: A unique string identifier for the source (e.g., `"lpclex"`,
  `"ricepoint"`).
- **Usage**: Used to look up the source configuration in the database.

#### `listCases()`

- **Purpose**: Scrape the main listing page(s) of a settlement site.
- **Output**: `Promise<CaseListItem[]>`
  - `externalId`: A stable, unique identifier from the source (e.g., a slug
    extracted from the URL). **Crucial for duplicate detection.**
  - `title`: The case name as displayed on the listing.
  - `url`: The absolute URL to the case's detail page.
  - `snippet`: A brief description or excerpt from the listing.
- **Best Practices**:
  - Implement pagination if the source has multiple pages of results.
  - Use `page.goto(url, { waitUntil: 'networkidle' })` to ensure the list is
    fully loaded.

#### `getCaseDetail(url)`

- **Purpose**: Extract detailed information from a specific case page.
- **Input**: `url: string` (provided by the engine from the `listCases`
  results).
- **Output**:
  `Promise<{ detail: CaseDetail; statusCode: number; duration: number }>`
  - `detail`: A structured `CaseDetail` object (see below).
  - `statusCode`: The HTTP status code of the page load (used for adaptive
    throttling).
  - `duration`: The time in milliseconds taken to load the page.
- **CaseDetail Structure**:
  - `title`, `description`, `classDefinition`, `status`, `settlementAmount`,
    `courtFileNumber`, `deadline`.
  - `rawHtml`: The inner HTML of the primary content container.

#### `cleanup()`

- **Purpose**: Release system resources.
- **Responsibility**: Close any active Playwright `Browser`, `BrowserContext`,
  or `Page` instances. The engine calls this at the end of every run, regardless
  of success or failure.

#### `setProxy(proxy)` (Optional)

- **Purpose**: Receive proxy credentials from the engine's `ProxyManager`.
- **Implementation**: Store these credentials and apply them when creating a new
  `BrowserContext`.

---

## Best Practices & Implementation Guidelines

### 1. Web Scraping & Stealth

Always use `playwright-extra` with the `stealthPlugin` to minimize detection.
Websites hosting legal notices often employ anti-bot measures.

```typescript
import { chromium } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
chromium.use(stealthPlugin());
```

### 2. Resilience and Error Handling

- **Automatic Retries**: The engine automatically retries both `listCases` and
  `getCaseDetail` up to 3 times on failure.
- **Adapter Responsibility**: Adapters should throw clear, descriptive errors
  when a critical element is missing or a navigation fails.
- **Adaptive Throttling**: The engine uses a `Throttler` that adjusts the delay
  between requests based on the `statusCode` and `duration` returned by
  `getCaseDetail`.
  - Returning `429` (Too Many Requests) will cause the engine to double the
    wait time.
- **Proxy Rotation**: If the engine is configured with a `PROXY_LIST`, it will
  automatically rotate proxies between retry attempts if `setProxy` is
  implemented.

### 3. Data Extraction (AI-Powered)

To ensure consistency and handle varied page layouts, we use AI for data
normalization.
**Do not write complex regex or brittle DOM selectors for every field.**

Instead:

1. Identify the container holding the main case information.
2. Extract the `textContent` and `innerHTML` of that container.
3. Pass the text to `analyzeCasePage(textContent)` from `../aiAnalyzer.js`.

```typescript
// Inside getCaseDetail
const { textContent, htmlContent } = await page.evaluate(() => {
  const container = document.querySelector(".entry-content, .case-details");
  return {
    textContent: container?.textContent?.trim() || "",
    htmlContent: container?.innerHTML || ""
  };
});

const detail = await analyzeCasePage(textContent);
detail.rawHtml = htmlContent;
```

### 4. Resource Management

- Initialize the `Browser` and `BrowserContext` lazily within the adapter.
- Always close individual `Page` instances in a `finally` block within your
  methods.
- The `cleanup()` method must be robust and handle cases where the browser was
  never even opened.

---

## Example Implementation

Below is a template for a robust `SourceAdapter` implementation.

```typescript
import { chromium } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, BrowserContext } from "playwright";
import type { SourceAdapter, CaseListItem, CaseDetail } from "../types.js";
import { analyzeCasePage } from "../aiAnalyzer.js";

chromium.use(stealthPlugin());

export class TemplateAdapter implements SourceAdapter {
  key = "template-source";
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private proxy: any = null;

  private async getContext(): Promise<BrowserContext> {
    if (!this.context) {
      if (!this.browser) {
        this.browser = await chromium.launch({ headless: true });
      }
      this.context = await this.browser.newContext({
        proxy: this.proxy || undefined,
        userAgent: "Mozilla/5.0 ...", // Use a modern UA
      });
    }
    return this.context;
  }

  setProxy(proxy: any) {
    this.proxy = proxy;
  }

  async listCases(): Promise<CaseListItem[]> {
    const context = await this.getContext();
    const page = await context.newPage();
    try {
      await page.goto("https://example.com/cases", { waitUntil: "networkidle" });
      return await page.evaluate(() => {
        // ... map DOM elements to CaseListItem[] ...
        return Array.from(document.querySelectorAll(".item")).map(el => ({
          externalId: el.getAttribute("data-id"),
          title: el.querySelector("h2").innerText,
          url: el.querySelector("a").href,
          snippet: el.querySelector(".desc").innerText
        }));
      });
    } finally {
      await page.close();
    }
  }

  async getCaseDetail(url: string) {
    const context = await this.getContext();
    const page = await context.newPage();
    const start = Date.now();
    try {
      const response = await page.goto(url, { waitUntil: "networkidle" });
      const { textContent, htmlContent } = await page.evaluate(() => {
        const main = document.querySelector("main");
        return { textContent: main.innerText, htmlContent: main.innerHTML };
      });

      const detail = await analyzeCasePage(textContent);
      detail.rawHtml = htmlContent;

      return {
        detail,
        statusCode: response?.status() || 0,
        duration: Date.now() - start
      };
    } finally {
      await page.close();
    }
  }

  async cleanup() {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    this.context = null;
    this.browser = null;
  }
}
```
