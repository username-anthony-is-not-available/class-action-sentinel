import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchCaseDetail, flagCase } from "../api";

interface Case {
  id: number;
  title: string;
  summary: string;
  description: string;
  classDefinition: string;
  status: string;
  settlementAmount: string | null;
  courtFileNumber: string | null;
  detailUrl: string;
  deadline: string | null;
  scrapedAt: string;
  createdAt: string;
  flag: string | null;
  flagNotes: string | null;
}

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [flagging, setFlagging] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchCaseDetail(Number(id))
      .then(setCaseData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleFlag = async (flag: "yes" | "no" | "unsure") => {
    if (!caseData) return;
    setFlagging(true);
    try {
      await flagCase(caseData.id, flag);
      setCaseData({ ...caseData, flag });
    } catch (err) {
      console.error(err);
    } finally {
      setFlagging(false);
    }
  };

  if (loading)
    return (
      <div className="loading">
        <div className="spinner" />
        <span>Loading case...</span>
      </div>
    );
  if (!caseData)
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❌</div>
        <p>Case not found.</p>
      </div>
    );

  return (
    <div>
      <Link to="/cases" className="back-link">
        ← Back to Cases
      </Link>

      {/* Hero Card */}
      <div className="detail-hero">
        <h1 className="detail-title">{caseData.title}</h1>
        <div className="detail-meta">
          {caseData.courtFileNumber && (
            <span className="detail-meta-item">
              📄 {caseData.courtFileNumber}
            </span>
          )}
          {caseData.settlementAmount && (
            <span
              className="detail-meta-item"
              style={{ color: "var(--accent-emerald)" }}
            >
              💰 {caseData.settlementAmount}
            </span>
          )}
          {caseData.deadline && (
            <span
              className="detail-meta-item"
              style={{ color: "var(--accent-amber)" }}
            >
              ⏰ {caseData.deadline}
            </span>
          )}
          <span className="detail-meta-item">
            🕐 Scraped {new Date(caseData.scrapedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Flag Section */}
      <div className="flag-section" style={{ marginBottom: "2rem" }}>
        <h3>Are you impacted by this case?</h3>
        <p>
          Review the class definition below, then flag whether this settlement
          applies to you.
        </p>
        <div className="btn-group" style={{ justifyContent: "center" }}>
          <button
            className={`btn btn-yes ${caseData.flag === "yes" ? "btn-active" : ""}`}
            onClick={() => handleFlag("yes")}
            disabled={flagging}
          >
            ✅ I'm Impacted
          </button>
          <button
            className={`btn btn-no ${caseData.flag === "no" ? "btn-active" : ""}`}
            onClick={() => handleFlag("no")}
            disabled={flagging}
          >
            ❌ Not For Me
          </button>
          <button
            className={`btn btn-unsure ${caseData.flag === "unsure" ? "btn-active" : ""}`}
            onClick={() => handleFlag("unsure")}
            disabled={flagging}
          >
            ❓ Unsure
          </button>
        </div>
      </div>

      {/* Description */}
      {caseData.description && (
        <div className="detail-section card" style={{ marginBottom: "1.5rem" }}>
          <h2>📝 What This Case Is About</h2>
          <p>{caseData.description}</p>
        </div>
      )}

      {/* Class Definition */}
      {caseData.classDefinition && (
        <div className="detail-section card" style={{ marginBottom: "1.5rem" }}>
          <h2>👥 Who Is Eligible</h2>
          <p>{caseData.classDefinition}</p>
        </div>
      )}

      {/* Status */}
      {caseData.status && (
        <div className="detail-section card" style={{ marginBottom: "1.5rem" }}>
          <h2>📊 Current Status</h2>
          <p>{caseData.status}</p>
        </div>
      )}

      {/* Source Link */}
      <div className="detail-section card">
        <h2>🔗 Source</h2>
        <p>
          <a
            href={caseData.detailUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent-sky)", textDecoration: "underline" }}
          >
            View original case page on LPC Avocats →
          </a>
        </p>
      </div>
    </div>
  );
}
