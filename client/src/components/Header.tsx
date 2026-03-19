"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Pill, Heart, Activity, Search } from "lucide-react";
import { useSavedDrugs } from "@/store/useSavedDrugs";
import { usePathname } from "next/navigation";

export const Header = () => {
  const [mounted, setMounted] = useState(false);
  const { savedDrugs } = useSavedDrugs();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 pt-6 pb-6 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-blue-600 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-blue-500/20">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter text-slate-900 leading-none">
                Nova<span className="text-blue-600">Pharm</span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Advanced Digital Pharma Index
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-4">
            <Link 
              href="/" 
              className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm border ${
                pathname === '/' 
                  ? "bg-blue-50 text-blue-600 border-blue-100" 
                  : "bg-white text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Search className="w-4 h-4" />
              Database
            </Link>
            <Link 
              href="/categories" 
              className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm border ${
                pathname === '/categories' 
                  ? "bg-blue-50 text-blue-600 border-blue-100" 
                  : "bg-white text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Activity className="w-4 h-4" />
              Categories
            </Link>
            <Link 
              href="/saved" 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm border ${
                pathname === '/saved' 
                  ? "bg-red-50 text-red-600 border-red-100 shadow-sm"
                  : "bg-white text-slate-500 border-transparent hover:bg-red-50 hover:text-red-500"
              }`}
            >
              <Heart className={`w-4 h-4 ${mounted && savedDrugs.length > 0 ? "fill-current" : ""}`} />
              <span className="hidden xs:inline">Saved</span>
              <span className="px-1.5 py-0.5 rounded-md bg-white/50 border border-current/10 ml-0.5">
                {mounted ? savedDrugs.length : 0}
              </span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};
