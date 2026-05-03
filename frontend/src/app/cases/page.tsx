"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Inbox, Filter } from "lucide-react";
import { fetchCases } from "@/lib/api";

interface CaseItem {
  id: number;
  title: string;
  summary: string;
  status: string;
  settlementAmount: string | null;
  flag: string | null;
  scrapedAt: string;
}

function CasesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
        search: searchParams.get("search") || undefined,
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
  }, [searchParams, page]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search) params.set("search", search);
    else params.delete("search");
    params.set("page", "1");
    router.push(`/cases?${params.toString()}`);
  };

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`/cases?${params.toString()}`);
  };

  const totalPages = Math.ceil(total / limit);

  const flagBadge = (flag: string | null) => {
    switch (flag) {
      case "yes":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20">✓ Impacted</span>;
      case "no":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent-rose/10 text-accent-rose border border-accent-rose/20">✗ Not Me</span>;
      case "unsure":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent-amber/10 text-accent-amber border border-accent-amber/20">? Unsure</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-text-muted/10 text-text-muted border border-text-muted/20">— Unflagged</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-text-primary to-accent-indigo bg-clip-text text-transparent">
            All Cases
          </h1>
          <p className="text-text-secondary mt-1">
            {total} class action settlements tracked
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="group">
        <div className="flex items-center gap-3 px-4 py-3 bg-bg-card backdrop-blur-md border border-border-subtle rounded-md focus-within:border-border-glow focus-within:shadow-glow transition-all">
          <Search size={18} className="text-text-muted group-focus-within:text-accent-indigo transition-colors" />
          <input
            type="text"
            placeholder="Search cases by title, description, or keywords..."
            className="flex-1 bg-transparent border-none outline-none text-text-primary text-sm placeholder:text-text-muted"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-ghost !py-1 !px-3 !text-xs">
            Search
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-text-muted">
          <div className="w-8 h-8 border-3 border-border-subtle border-t-accent-indigo rounded-full animate-spin mb-4" />
          <span>Loading cases...</span>
        </div>
      ) : cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 text-text-muted border border-dashed border-border-subtle rounded-xl">
          <Inbox size={48} className="mb-4 opacity-20" />
          <p className="text-sm">
            {search
              ? "No cases found matching your search."
              : "No cases found in the database yet."}
          </p>
          {search && (
            <button 
              onClick={() => {setSearch(""); router.push("/cases");}}
              className="mt-4 text-accent-indigo text-xs hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted">
                  <th className="px-4 py-2">Case</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Your Flag</th>
                  <th className="px-4 py-2">Scraped</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr
                    key={c.id}
                    className="group bg-bg-card backdrop-blur-md transition-all cursor-pointer hover:bg-bg-card-hover hover:translate-x-1"
                    onClick={() => router.push(`/cases/${c.id}`)}
                  >
                    <td className="px-4 py-4 rounded-l-md max-w-md">
                      <div className="font-semibold text-sm text-text-primary group-hover:text-accent-indigo transition-colors truncate">
                        {c.title}
                      </div>
                      {c.summary && (
                        <div className="mt-1 text-xs text-text-muted line-clamp-1 leading-relaxed">
                          {c.summary}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-text-secondary whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
                      {c.status || "—"}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-accent-emerald whitespace-nowrap">
                      {c.settlementAmount || "—"}
                    </td>
                    <td className="px-4 py-4">
                      {flagBadge(c.flag)}
                    </td>
                    <td className="px-4 py-4 rounded-r-md text-xs text-text-muted whitespace-nowrap">
                      {new Date(c.scrapedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-4">
              <button
                className="btn btn-ghost !p-2"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs text-text-muted font-medium tracking-wide">
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-ghost !p-2"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Cases() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CasesContent />
    </Suspense>
  );
}
