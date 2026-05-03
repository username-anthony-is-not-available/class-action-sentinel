"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gavel } from "lucide-react";

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-[100] px-8 bg-bg-primary/80 backdrop-blur-xl border-b border-border-subtle">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-3 no-underline text-text-primary font-bold text-lg tracking-tight">
          <div className="w-8 h-8 bg-gradient-hero rounded-sm flex items-center justify-center text-white">
            <Gavel size={18} />
          </div>
          <span>Sentinel</span>
        </Link>
        
        <div className="flex gap-2">
          <Link 
            href="/" 
            className={`nav-link ${pathname === "/" ? "active" : ""}`}
          >
            Dashboard
          </Link>
          <Link 
            href="/cases" 
            className={`nav-link ${pathname.startsWith("/cases") ? "active" : ""}`}
          >
            Cases
          </Link>
        </div>
      </div>
    </nav>
  );
}
