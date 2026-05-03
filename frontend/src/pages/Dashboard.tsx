import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDashboardStats, fetchScrapeRuns, triggerScrape } from "../api";

interface Stats {
  totalCases: number;
  flags: { yes: number; no: number; unsure: number; unflagged: number };
  recentCases: {
    id: number;
    title: string;
    status: string;
    scrapedAt: string;
  }[];
}

interface ScrapeRun {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  casesFound: number;
  casesNew: number;
  error: string | null;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [runs, setRuns] = useState<ScrapeRun[]>([]);
  const [scraping, setScraping] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchScrapeRuns()])
      .then(([s, r]) => {
        setStats(s);
        setRuns(r);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleScrape = async () => {
    setScraping(true);
    try {
      await triggerScrape();
    } catch (err) {
      console.error(err);
    }
    // Don't unset since it runs async on server
  };

  if (loading)
    return (
      <div className="loading">
        <div className="spinner" />
        <span>Loading dashboard...</span>
      </div>
    );

  return (
    <div>
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Overview of tracked class action settlements
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleScrape}
          disabled={scraping}
        >
          {scraping ? "⏳ Scraping…" : "🔄 Run Scrape"}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="card-grid" style={{ marginBottom: "2rem" }}>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-label">Total Cases</div>
          <div className="stat-value">{stats?.totalCases ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-label">I'm Impacted</div>
          <div
            className="stat-value"
            style={{
              background: "var(--gradient-yes)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {stats?.flags.yes ?? 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-label">Not For Me</div>
          <div
            className="stat-value"
            style={{
              background: "var(--gradient-no)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {stats?.flags.no ?? 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❓</div>
          <div className="stat-label">Unsure / Unflagged</div>
          <div
            className="stat-value"
            style={{
              background: "var(--gradient-unsure)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {(stats?.flags.unsure ?? 0) + (stats?.flags.unflagged ?? 0)}
          </div>
        </div>
      </div>

      {/* Recent Cases */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            marginBottom: "1rem",
            color: "var(--accent-indigo)",
          }}
        >
          📌 Recent Cases
        </h2>
        {stats?.recentCases.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            No cases yet. Run a scrape to get started!
          </p>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {stats?.recentCases.map((c) => (
              <Link
                key={c.id}
                to={`/cases/${c.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="run-item">
                  <span
                    style={{
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {c.title}
                  </span>
                  <span
                    style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}
                  >
                    {new Date(c.scrapedAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Scrape History */}
      <div className="card">
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            marginBottom: "1rem",
            color: "var(--accent-indigo)",
          }}
        >
          🔄 Scrape History
        </h2>
        {runs.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            No scrape runs yet.
          </p>
        ) : (
          <div className="run-list">
            {runs.map((r) => (
              <div key={r.id} className="run-item">
                <div className="run-status">
                  <span className={`status-dot ${r.status}`} />
                  <span style={{ fontWeight: 500 }}>{r.status}</span>
                </div>
                <span
                  style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}
                >
                  {r.casesNew} new / {r.casesFound} found
                </span>
                <span
                  style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}
                >
                  {new Date(r.startedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
