"use client";

import React from "react";
import { Heart, Search } from "lucide-react";
import { DrugCard } from "@/components/DrugCard";
import { useSavedDrugs } from "@/store/useSavedDrugs";
import { Header } from "@/components/Header";
import Link from "next/link";

export default function SavedPage() {
  const [mounted, setMounted] = React.useState(false);
  const { savedDrugs, isSaved, toggleSaveDrug } = useSavedDrugs();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900">
      <Header />

      {/* Hero Section for Saved */}
      <section className="bg-white border-b border-slate-200 pt-12 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 via-white to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest border border-red-100">
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>My Collection</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
                Saved <span className="text-blue-600 italic">Medicines.</span>
              </h1>
              <p className="text-slate-500 font-medium max-w-xl">
                Quickly access your bookmarked clinical profiles and formulation details.
              </p>
            </div>
            
            <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4">
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Saved</p>
                    <p className="text-2xl font-black">{savedDrugs.length}</p>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <Heart className="w-8 h-8 text-red-500 fill-current animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Results Grid */}
      <main className="container mx-auto px-4 mt-12 pb-20">
        {savedDrugs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {savedDrugs.map((medicine) => (
              <DrugCard 
                key={medicine.id} 
                medicine={medicine} 
                isSaved={isSaved(medicine.id)}
                onToggleSave={(e) => {
                  e.stopPropagation();
                  toggleSaveDrug(medicine);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="max-w-md mx-auto py-24 text-center space-y-8">
            <div className="relative inline-flex">
              <div className="absolute inset-0 bg-blue-100 rounded-full blur-2xl opacity-50 animate-pulse" />
              <div className="relative p-8 bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl text-slate-200">
                <Heart className="w-20 h-20" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-slate-900">Your collection is empty</h2>
              <p className="text-slate-500 font-medium px-4">
                Start exploring the database and use the heart icon to save important medicines for later reference.
              </p>
            </div>
            <Link 
              href="/" 
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 hover:-translate-y-1 transition-all shadow-xl shadow-blue-500/25 active:scale-95"
            >
              <Search className="w-5 h-5" />
              Search the Database
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
