// ── Generic Scraper Interfaces ─────────────────────────
// Implement SourceAdapter for each new website to scrape.

export interface CaseListItem {
  /** Unique slug or identifier from the source */
  externalId: string;
  /** Case title as shown on listing page */
  title: string;
  /** Full URL to the detail page */
  url: string;
  /** Short snippet/description from listing page */
  snippet: string;
}

export interface CaseDetail {
  title: string;
  description: string;
  classDefinition: string;
  status: string;
  settlementAmount: string | null;
  courtFileNumber: string | null;
  deadline: string | null;
  rawHtml: string;
}

export interface SourceAdapter {
  /** Unique key matching the `adapter_key` in the sources table */
  key: string;

  /** Fetch all case links from the listing page(s) */
  listCases(): Promise<CaseListItem[]>;

  /** Fetch and parse a single case detail page */
  getCaseDetail(url: string): Promise<CaseDetail>;

  /** Clean up resources (e.g., close browser) */
  cleanup(): Promise<void>;
}
