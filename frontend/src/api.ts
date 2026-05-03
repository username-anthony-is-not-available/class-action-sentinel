const API_BASE = "/api";

export async function fetchDashboardStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchCases(
  params: { search?: string; page?: number; limit?: number } = {},
) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));

  const res = await fetch(`${API_BASE}/cases?${query}`);
  if (!res.ok) throw new Error("Failed to fetch cases");
  return res.json();
}

export async function fetchCaseDetail(id: number) {
  const res = await fetch(`${API_BASE}/cases/${id}`);
  if (!res.ok) throw new Error("Failed to fetch case");
  return res.json();
}

export async function flagCase(
  id: number,
  flag: "yes" | "no" | "unsure",
  notes?: string,
) {
  const res = await fetch(`${API_BASE}/cases/${id}/flag`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flag, notes }),
  });
  if (!res.ok) throw new Error("Failed to flag case");
  return res.json();
}

export async function fetchScrapeRuns() {
  const res = await fetch(`${API_BASE}/dashboard/scrape-runs`);
  if (!res.ok) throw new Error("Failed to fetch scrape runs");
  return res.json();
}

export async function triggerScrape() {
  const res = await fetch(`${API_BASE}/scrape/trigger`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to trigger scrape");
  return res.json();
}
