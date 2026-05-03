import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchCases } from "../api";

interface CaseItem {
  id: number;
  title: string;
  summary: string;
  status: string;
  settlementAmount: string | null;
  flag: string | null;
  scrapedAt: string;
}

export default function Cases() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const page = Number(searchParams.get("page") || "1");
  const limit = 15;

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCases({
        search: search || undefined,
        page,
        limit,
      });
      setCases(data.cases);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(search ? { search, page: "1" } : { page: "1" });
  };

  const totalPages = Math.ceil(total / limit);

  const flagBadge = (flag: string | null) => {
    switch (flag) {
      case "yes":
        return <span className="badge badge-yes">✓ Impacted</span>;
      case "no":
        return <span className="badge badge-no">✗ Not Me</span>;
      case "unsure":
        return <span className="badge badge-unsure">? Unsure</span>;
      default:
        return <span className="badge badge-none">— Unflagged</span>;
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">All Cases</h1>
        <p className="page-subtitle">
          {total} class action settlements tracked
        </p>
      </div>

      <form onSubmit={handleSearch}>
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search cases by title, description, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-ghost"
            style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
          >
            Search
          </button>
        </div>
      </form>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <span>Loading cases...</span>
        </div>
      ) : cases.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p>
            No cases found.{" "}
            {search
              ? "Try a different search."
              : "Run a scrape to populate the database."}
          </p>
        </div>
      ) : (
        <>
          <table className="cases-table">
            <thead>
              <tr>
                <th>Case</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Your Flag</th>
                <th>Scraped</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => (window.location.href = `/cases/${c.id}`)}
                >
                  <td>
                    <div className="case-title-cell">
                      <Link
                        to={`/cases/${c.id}`}
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {c.title}
                      </Link>
                    </div>
                    {c.summary && (
                      <div className="case-snippet">{c.summary}</div>
                    )}
                  </td>
                  <td
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.8rem",
                      maxWidth: "140px",
                    }}
                  >
                    {c.status || "—"}
                  </td>
                  <td
                    style={{
                      color: "var(--accent-emerald)",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.settlementAmount || "—"}
                  </td>
                  <td>{flagBadge(c.flag)}</td>
                  <td
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.8rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {new Date(c.scrapedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-ghost"
                disabled={page <= 1}
                onClick={() =>
                  setSearchParams({
                    ...(search && { search }),
                    page: String(page - 1),
                  })
                }
              >
                ← Prev
              </button>
              <span className="pagination-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-ghost"
                disabled={page >= totalPages}
                onClick={() =>
                  setSearchParams({
                    ...(search && { search }),
                    page: String(page + 1),
                  })
                }
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
