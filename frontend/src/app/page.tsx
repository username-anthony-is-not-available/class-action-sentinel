"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ClipboardList, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  RefreshCw, 
  History, 
  Pin,
  Clock
} from "lucide-react";
import { fetchDashboardStats, fetchScrapeRuns, triggerScrape } from "@/lib/api";

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
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center p-16 text-text-muted">
        <div className="w-8 h-8 border-3 border-border-subtle border-t-accent-indigo rounded-full animate-spin mb-4" />
        <span>Loading dashboard...</span>
      </div>
    );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-text-primary to-accent-indigo bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-text-secondary mt-1">
            Overview of tracked class action settlements
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleScrape}
          disabled={scraping}
        >
          {scraping ? (
            <><Clock className="animate-pulse" size={18} /> Scraping…</>
          ) : (
            <><RefreshCw size={18} /> Run Scrape</>
          )}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="stat-card">
          <div className="text-accent-indigo mb-2"><ClipboardList size={24} /></div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Total Cases</div>
          <div className="text-3xl font-extrabold bg-gradient-hero bg-clip-text text-transparent">
            {stats?.totalCases ?? 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-accent-emerald mb-2"><CheckCircle2 size={24} /></div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">I'm Impacted</div>
          <div className="text-3xl font-extrabold bg-gradient-yes bg-clip-text text-transparent">
            {stats?.flags.yes ?? 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-accent-rose mb-2"><XCircle size={24} /></div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Not For Me</div>
          <div className="text-3xl font-extrabold bg-gradient-no bg-clip-text text-transparent">
            {stats?.flags.no ?? 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-accent-amber mb-2"><HelpCircle size={24} /></div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Unsure</div>
          <div className="text-3xl font-extrabold bg-gradient-unsure bg-clip-text text-transparent">
            {(stats?.flags.unsure ?? 0) + (stats?.flags.unflagged ?? 0)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Cases */}
        <div className="glass-card">
          <h2 className="text-sm font-bold uppercase tracking-wider text-accent-indigo mb-4 flex items-center gap-2">
            <Pin size={16} /> Recent Cases
          </h2>
          {stats?.recentCases.length === 0 ? (
            <p className="text-text-muted text-sm italic">
              No cases yet. Run a scrape to get started!
            </p>
          ) : (
            <div className="space-y-2">
              {stats?.recentCases.map((c) => (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="group block p-4 bg-bg-primary/40 border border-border-subtle rounded-md transition-all hover:border-border-glow hover:bg-bg-card-hover"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-text-primary text-sm group-hover:text-accent-indigo transition-colors truncate pr-4">
                      {c.title}
                    </span>
                    <span className="text-text-muted text-xs whitespace-nowrap">
                      {new Date(c.scrapedAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Scrape History */}
        <div className="glass-card">
          <h2 className="text-sm font-bold uppercase tracking-wider text-accent-indigo mb-4 flex items-center gap-2">
            <History size={16} /> Scrape History
          </h2>
          {runs.length === 0 ? (
            <p className="text-text-muted text-sm italic">
              No scrape runs yet.
            </p>
          ) : (
            <div className="space-y-3">
              {runs.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-4 bg-bg-primary/40 border border-border-subtle rounded-md">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      r.status === 'completed' ? 'bg-accent-emerald shadow-[0_0_8px_rgba(52,211,153,0.5)]' :
                      r.status === 'failed' ? 'bg-accent-rose shadow-[0_0_8px_rgba(251,113,131,0.5)]' :
                      'bg-accent-sky animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.5)]'
                    }`} />
                    <span className="font-semibold text-xs uppercase tracking-tight capitalize">{r.status}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-text-primary text-xs font-medium">
                      {r.casesNew} new / {r.casesFound} found
                    </div>
                    <div className="text-text-muted text-[10px]">
                      {new Date(r.startedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
