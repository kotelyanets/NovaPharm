"use client";

import React, { useState, useEffect } from "react";
import { MeiliSearch } from "meilisearch";
import { useDebounce } from "use-debounce";
import { Search, Activity, Loader2 } from "lucide-react";
import { DrugCard } from "@/components/DrugCard";
import { useSavedDrugs } from "@/store/useSavedDrugs";
import { Header } from "@/components/Header";

import { useSearchParams } from "next/navigation";

// --- Meilisearch Client ---
const client = new MeiliSearch({
  host: "http://localhost:7700",
  apiKey: "dev-master-key",
});

// --- UI Components ---
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-6 ${className}`}>
    {children}
  </div>
);

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-100 rounded-md ${className}`} />
);

export default function Home() {
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get('category');

  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 300);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { isSaved, toggleSaveDrug } = useSavedDrugs();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      setIsLoading(true);
      try {
        const index = client.index("medicines");
        const searchOptions: any = {
          limit: 20,
        };

        if (categoryFilter) {
          searchOptions.filter = `category = "${categoryFilter}"`;
        }

        const searchResults = await index.search(debouncedQuery, searchOptions);
        setResults(searchResults.hits);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, categoryFilter]);

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900">
      <Header />

      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200 pt-16 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-black uppercase tracking-widest border border-blue-100 shadow-sm">
              <Activity className="w-3.5 h-3.5" />
              <span>Global Intelligence Index</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-[0.95]">
              Find Any Medicine <br/>
              <span className="text-blue-600 italic">Instantly.</span>
            </h1>
            <p className="text-lg text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
              Explore 15,000+ medical records, active ingredients, and manufacturers with sub-second precision and clinical-grade accuracy.
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto mt-12 group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search className="w-6 h-6 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search by name, brand, or clinical generic..."
                className="w-full pl-16 pr-6 py-6 bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-2xl shadow-blue-500/10 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-xl font-bold placeholder:text-slate-300"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {isLoading && (
                <div className="absolute inset-y-0 right-6 flex items-center">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <main className="container mx-auto px-4 mt-12 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <div className="space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              </Card>
            ))
          ) : results.length > 0 ? (
            results.map((medicine) => (
              <DrugCard 
                key={medicine.id} 
                medicine={medicine} 
                isSaved={mounted ? isSaved(medicine.id) : false}
                onToggleSave={(e) => {
                  e.stopPropagation();
                  toggleSaveDrug(medicine);
                }}
              />
            ))
          ) : query ? (
            <div className="col-span-full py-24 text-center space-y-6">
              <div className="inline-flex p-6 bg-slate-100 rounded-full">
                <Search className="w-10 h-10 text-slate-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">No results found for "{query}"</h2>
              <p className="text-slate-500 max-w-sm mx-auto">Try searching for generic names, manufacturers, or different formulations.</p>
            </div>
          ) : (
            <div className="col-span-full py-24 text-center space-y-4">
              <p className="text-slate-400 italic text-lg font-medium">Start typing to explore our medical database...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
