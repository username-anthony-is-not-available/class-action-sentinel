"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  FileText, 
  DollarSign, 
  Calendar, 
  ExternalLink, 
  Check, 
  X, 
  HelpCircle,
  FileSearch,
  Users,
  BarChart3
} from "lucide-react";
import { fetchCaseDetail, flagCase } from "@/lib/api";

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

export default function CaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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
      <div className="flex flex-col items-center justify-center p-16 text-text-muted">
        <div className="w-8 h-8 border-3 border-border-subtle border-t-accent-indigo rounded-full animate-spin mb-4" />
        <span>Loading case details...</span>
      </div>
    );
    
  if (!caseData)
    return (
      <div className="flex flex-col items-center justify-center p-20 text-text-muted border border-dashed border-border-subtle rounded-xl">
        <X size={48} className="mb-4 opacity-20" />
        <p>Case not found.</p>
        <Link href="/cases" className="mt-4 text-accent-indigo text-xs hover:underline">
          Back to list
        </Link>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link href="/cases" className="inline-flex items-center gap-2 text-text-secondary text-sm font-medium hover:text-accent-indigo transition-colors mb-2">
        <ArrowLeft size={16} /> Back to Cases
      </Link>

      {/* Hero Card */}
      <div className="relative overflow-hidden bg-gradient-card border border-border-subtle rounded-xl p-8 lg:p-10 shadow-lg">
        <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-accent-indigo/5 rounded-full blur-[80px]" />
        
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-text-primary mb-6 relative z-10 leading-tight">
          {caseData.title}
        </h1>
        
        <div className="flex flex-wrap gap-6 text-sm text-text-secondary relative z-10">
          {caseData.courtFileNumber && (
            <div className="flex items-center gap-2">
              <FileSearch size={16} className="text-accent-violet" />
              <span>{caseData.courtFileNumber}</span>
            </div>
          )}
          {caseData.settlementAmount && (
            <div className="flex items-center gap-2 text-accent-emerald font-semibold">
              <DollarSign size={16} />
              <span>{caseData.settlementAmount}</span>
            </div>
          )}
          {caseData.deadline && (
            <div className="flex items-center gap-2 text-accent-amber font-semibold">
              <Calendar size={16} />
              <span>Deadline: {caseData.deadline}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-text-muted">
            <BarChart3 size={16} />
            <span>Scraped {new Date(caseData.scrapedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Flag Section */}
      <div className="glass-card text-center space-y-6 !p-8 border-accent-indigo/20 shadow-glow">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-text-primary">Are you impacted by this case?</h3>
          <p className="text-text-secondary text-sm max-w-lg mx-auto">
            Review the class definition below, then flag whether this settlement
            applies to you for tracking.
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4">
          <button
            className={`btn min-w-[160px] ${caseData.flag === "yes" ? "bg-gradient-yes text-white border-2 border-white/20" : "btn-ghost hover:text-accent-emerald hover:border-accent-emerald/40"}`}
            onClick={() => handleFlag("yes")}
            disabled={flagging}
          >
            <Check size={18} /> I'm Impacted
          </button>
          <button
            className={`btn min-w-[160px] ${caseData.flag === "no" ? "bg-gradient-no text-white border-2 border-white/20" : "btn-ghost hover:text-accent-rose hover:border-accent-rose/40"}`}
            onClick={() => handleFlag("no")}
            disabled={flagging}
          >
            <X size={18} /> Not For Me
          </button>
          <button
            className={`btn min-w-[160px] ${caseData.flag === "unsure" ? "bg-gradient-unsure text-white border-2 border-white/20" : "btn-ghost hover:text-accent-amber hover:border-accent-amber/40"}`}
            onClick={() => handleFlag("unsure")}
            disabled={flagging}
          >
            <HelpCircle size={18} /> Unsure
          </button>
        </div>
      </div>

      {/* Details Sections */}
      <div className="space-y-6">
        {caseData.description && (
          <div className="glass-card">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-accent-indigo mb-4 flex items-center gap-2">
              <FileText size={16} /> What This Case Is About
            </h2>
            <div className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
              {caseData.description}
            </div>
          </div>
        )}

        {caseData.classDefinition && (
          <div className="glass-card border-accent-violet/20">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-accent-violet mb-4 flex items-center gap-2">
              <Users size={16} /> Who Is Eligible
            </h2>
            <div className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
              {caseData.classDefinition}
            </div>
          </div>
        )}

        {caseData.status && (
          <div className="glass-card">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-accent-sky mb-4 flex items-center gap-2">
              <BarChart3 size={16} /> Current Status
            </h2>
            <div className="text-text-secondary text-sm leading-relaxed">
              {caseData.status}
            </div>
          </div>
        )}

        <div className="glass-card bg-bg-primary/20">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-4 flex items-center gap-2">
            <ExternalLink size={16} /> Source
          </h2>
          <a
            href={caseData.detailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-accent-sky hover:text-accent-indigo transition-colors text-sm font-medium underline underline-offset-4"
          >
            View original case page on LPC Avocats <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
