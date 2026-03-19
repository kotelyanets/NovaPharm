"use client";

import React, { useState, useEffect } from "react";
import { MeiliSearch } from "meilisearch";
import { useDebounce } from "use-debounce";
import { Search, Pill, Activity, FlaskConical, Building2, Package, Loader2 } from "lucide-react";

// --- Meilisearch Client ---
const client = new MeiliSearch({
  host: "http://localhost:7700",
  apiKey: "dev-master-key",
});

// --- UI Components (Embedded for reliability) ---

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-6 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, variant = "primary" }: { children: React.ReactNode; variant?: "primary" | "secondary" }) => {
  const styles = {
    primary: "bg-blue-50 text-blue-700 border-blue-100",
    secondary: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[variant]}`}>
      {children}
    </span>
  );
};

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-100 rounded-md ${className}`} />
);

// --- Main Page ---

export default function Home() {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 300);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      setIsLoading(true);
      try {
        const index = client.index("medicines");
        const searchResults = await index.search(debouncedQuery, {
          limit: 20,
        });
        setResults(searchResults.hits);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900">
      {/* Header / Hero Section */}
      <header className="bg-white border-b border-slate-200 pt-16 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium border border-blue-100">
              <Activity className="w-4 h-4" />
              <span>NovaPharm Instant Search</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
              Find Any Medicine <span className="text-blue-600">Instantly.</span>
            </h1>
            <p className="text-lg text-slate-600">
              Search through thousands of medical records, active ingredients, and manufacturers with sub-second precision.
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto mt-8 group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search by name, brand, or formula..."
                className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-blue-500/5 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-lg"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {isLoading && (
                <div className="absolute inset-y-0 right-4 flex items-center">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Results Section */}
      <main className="container mx-auto px-4 -mt-12 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <Card key={medicine.id}>
                <div className="flex flex-col h-full space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {medicine.name}
                      </h3>
                      <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        {medicine.strength}
                      </p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <Pill className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-2">
                    <Badge variant="primary">Ingredients: {medicine.ingredientIds?.length || 1}</Badge>
                    <Badge variant="secondary">Ref: {medicine.id.slice(0, 8)}</Badge>
                  </div>
                  
                  <div className="pt-4 mt-auto border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      Manufacturer Verified
                    </div>
                    <div className="flex items-center gap-1">
                      <FlaskConical className="w-3.5 h-3.5" />
                      Lab Approved
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : query ? (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="inline-flex p-4 bg-slate-100 rounded-full">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-xl font-medium text-slate-500">No results found for "{query}"</p>
              <p className="text-slate-400">Try searching for generic names or different strengths.</p>
            </div>
          ) : (
            <div className="col-span-full py-20 text-center space-y-4">
              <p className="text-slate-400 italic">Start typing to explore our medical database...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
