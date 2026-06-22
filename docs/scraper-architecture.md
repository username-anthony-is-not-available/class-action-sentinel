# Scraper Architecture

The Class Action Sentinel uses a modular scraper system designed for
extensibility and resilience. This document details the internal architecture,
the `SourceAdapter` interface, and best practices for adding new settlement
sources.

## Overview

The scraping process is orchestrated by the **Scraper Engine**
(`backend/src/scraper/engine.ts`). The engine is responsible for:

1. **Orchestration**: Managing the lifecycle of a "scrape run."
2. **Persistence**: Saving results to the database and tracking state.
3. **Resilience**: Handling retries and errors at the engine level.
4. **Resource Management**: Ensuring browsers and contexts are cleaned up via the
   adapter.
5. **Notifications**: Triggering alerts when new cases are found or tracked
   cases are updated.

The engine remains agnostic of the specific website structure by delegating
site-specific logic to **Source Adapters**.

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

### Key Components

#### `listCases()`

- **Purpose**: Scrape the main listing page(s) of a settlement site.
- **Output**: An array of `CaseListItem` objects.
- **Responsibility**: Handle navigation, pagination (if applicable), and
  extraction of basic metadata (title, URL, snippet).
- **External ID**: The `externalId` should be a stable, unique identifier from
  the source (e.g., a slug or internal ID). This is used to prevent duplicate
  processing.

#### `getCaseDetail(url)`

- **Purpose**: Extract detailed information from a specific case page.
- **Output**: A `CaseDetail` object along with metadata (`statusCode`,
  `duration`).
- **Data Extraction**: It is recommended to use the `analyzeCasePage` utility
  which leverages AI to extract structured data from raw text.
- **Raw HTML**: Always include the `rawHtml` of the main content area for
  auditing and future re-parsing.

#### `cleanup()`

- **Purpose**: Release system resources.
- **Responsibility**: Close Playwright browsers, contexts, and pages. The engine
  calls this after a run completes or after a fatal error during a retry cycle.

---

## Best Practices & Implementation Guidelines

### 1. Web Scraping & Stealth

Use `playwright-extra` with the `stealthPlugin` to minimize detection by
anti-bot services.

```typescript
import { chromium } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
chromium.use(stealthPlugin());
```

### 2. Browser Management

Maintain a single browser instance per adapter and reuse it for multiple pages
to improve performance. Initialize it lazily within the adapter.

### 3. Data Extraction (AI-Powered)

Instead of writing complex CSS selectors for every detail field, extract the
main text content and pass it to `analyzeCasePage`.

```typescript
const { textContent, htmlContent } = await page.evaluate(() => {
  const main = document.querySelector(".entry-content, article, main");
  return {
    textContent: main?.textContent?.trim() || "",
    htmlContent: main?.innerHTML || "",
  };
});

const detail = await analyzeCasePage(textContent);
detail.rawHtml = htmlContent;
```

### 4. Error Handling

- **Engine-Level Retries**: The Scraper Engine automatically retries `listCases`
  and `getCaseDetail` up to 3 times.
- **Adapter-Level Errors**: If a page fails to load or an element is missing,
  throw an informative error. The engine will catch it and decide whether to
  retry.
- **Timeouts**: Use reasonable timeouts (e.g., 30s) for page navigations to
  prevent the scraper from hanging indefinitely.

### 5. Throttling & Proxies

The engine uses a `Throttler` to adjust request frequency based on response
times and status codes (e.g., slowing down on 429s). If `setProxy` is
implemented, the engine will rotate proxies between retries.

---

## Example Implementation

Refer to `backend/src/scraper/adapters/lpclex.ts` for a production-ready
example. Below is a simplified skeleton:

```typescript
export class MyNewAdapter implements SourceAdapter {
  key = "my-source";
  private browser: any;

  async listCases() {
    const page = await this.getPage();
    await page.goto("https://example.com/cases");
    // ... extraction logic ...
    return items;
  }

  async getCaseDetail(url: string) {
    const page = await this.getPage();
    const start = Date.now();
    const response = await page.goto(url);
    const { textContent, htmlContent } = await this.extractText(page);
    const detail = await analyzeCasePage(textContent);
    detail.rawHtml = htmlContent;

    return {
      detail,
      statusCode: response.status(),
      duration: Date.now() - start
    };
  }

  async cleanup() {
    if (this.browser) await this.browser.close();
  }
}
```
