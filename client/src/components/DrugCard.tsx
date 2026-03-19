"use client";

import React from "react";
import { 
  Pill, 
  Activity, 
  FlaskConical, 
  Building2, 
  Package, 
  Heart, 
  Stethoscope, 
  Info,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MeiliSearch } from "meilisearch";

const client = new MeiliSearch({
  host: "http://localhost:7700",
  apiKey: "dev-master-key",
});

interface Medicine {
  id: string;
  name: string;
  strength?: string;
  dosageForm?: string;
  manufacturer?: string;
  ingredients?: string[];
  genericName?: string;
  description?: string;
  category?: string;
}

interface DrugCardProps {
  medicine: Medicine;
  isSaved: boolean;
  onToggleSave: (e: React.MouseEvent) => void;
}

export const DrugCard = ({ medicine, isSaved, onToggleSave }: DrugCardProps) => {
  const [variations, setVariations] = React.useState<Medicine[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && medicine.genericName) {
      const fetchVariations = async () => {
        try {
          const index = client.index("medicines");
          const searchResults = await index.search("", {
            filter: `genericName = "${medicine.genericName}"`,
            limit: 10,
          });
          // Filter out the current medicine
          setVariations(searchResults.hits.filter((h: any) => h.id !== medicine.id) as Medicine[]);
        } catch (error) {
          console.error("Failed to fetch variations:", error);
        }
      };
      fetchVariations();
    }
  }, [isOpen, medicine.genericName, medicine.id]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger 
        render={
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-6 group cursor-pointer relative overflow-hidden focus:outline-none" />
        }
      >
          {/* Subtle background element */}
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity font-bold">
            <Pill className="w-32 h-32 rotate-12" />
          </div>

          <button
            onClick={onToggleSave}
            className={`absolute top-4 right-4 p-2.5 rounded-full transition-all duration-300 z-10 ${
              isSaved 
                ? "bg-red-50 text-red-500 shadow-sm shadow-red-100" 
                : "bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-400"
            }`}
          >
            <Heart className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
          </button>

          <div className="flex flex-col h-full space-y-5 relative z-10">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5 pr-10">
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 text-left">
                  {medicine.name}
                </h3>
                <p className="text-sm font-semibold text-blue-600 flex items-center gap-1.5 opacity-80 text-left">
                  <Stethoscope className="w-3.5 h-3.5" />
                  {medicine.genericName || "Generic Not Listed"}
                </p>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-xl flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                <Pill className="w-5 h-5 text-blue-600 group-hover:text-white" />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-bold">
              <Badge variant="secondary" className="bg-slate-50 text-slate-600 border-slate-100 font-bold">
                {medicine.dosageForm || "N/A"}
              </Badge>
              <Badge variant="outline" className="border-blue-100 text-blue-600 font-bold">
                {medicine.strength || "N/A"}
              </Badge>
            </div>
            
            <div className="pt-4 mt-auto border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                {medicine.manufacturer?.slice(0, 20) || "Pharma Verified"}
              </div>
              <div className="flex items-center gap-1 text-emerald-500 font-bold">
                <Activity className="w-3.5 h-3.5" />
                Active
              </div>
            </div>
          </div>
      </DialogTrigger>

      <DialogContent className="max-w-[95vw] sm:max-w-3xl overflow-hidden p-0 border-none rounded-3xl shadow-2xl bg-white focus:outline-none max-h-[95vh] flex flex-col">
        <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 p-8 sm:p-12 text-white relative flex-shrink-0">
          <div className="absolute top-0 right-0 p-8 sm:p-12 opacity-10">
            <Pill className="w-48 h-48 sm:w-64 sm:h-64 rotate-12" />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 backdrop-blur-md text-blue-300 text-[10px] font-black uppercase tracking-[0.2em]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Clinical Profile</span>
              </div>
              {medicine.category && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md text-emerald-300 text-[10px] font-black uppercase tracking-[0.2em]">
                  <Activity className="w-3.5 h-3.5" />
                  <span>{medicine.category}</span>
                </div>
              )}
            </div>
            
            <DialogTitle className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight sm:leading-[1.05]">
              {medicine.name}
            </DialogTitle>
            
            <div className="flex flex-wrap gap-4 pt-2 sm:pt-4">
              <div className="bg-white/5 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl backdrop-blur-md border border-white/10 flex flex-col gap-1 flex-1 min-w-[200px]">
                <span className="text-[10px] uppercase font-black text-blue-300 tracking-[0.1em]">Pharmacological Generic</span>
                <span className="text-base sm:text-lg font-bold text-white leading-tight">{medicine.genericName || "N/A"}</span>
              </div>
              <div className="bg-white/5 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl backdrop-blur-md border border-white/10 flex flex-col gap-1 flex-1 min-w-[200px]">
                <span className="text-[10px] uppercase font-black text-blue-300 tracking-[0.1em]">Admin Route / Form</span>
                <span className="text-base sm:text-lg font-bold text-white leading-tight">
                  {medicine.dosageForm} {medicine.strength !== 'N/A' ? `• ${medicine.strength}` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white min-h-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          <div className="p-6 sm:p-10 space-y-10 sm:space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 sm:gap-12">
              <div className="lg:col-span-3 space-y-10">
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    Indications & Usage
                  </h4>
                  <div className="bg-slate-50/80 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-inner">
                    <div className="text-slate-700 text-base sm:text-lg leading-relaxed font-semibold italic opacity-90 prose prose-slate max-w-none max-h-[400px] overflow-y-auto pr-4 pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                      {medicine.description || "No detailed clinical indications available for this specific formulation."}
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    Available Dosages & Variations
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {variations.length > 0 ? (
                      variations.map((v) => (
                        <div key={v.id} className="p-4 rounded-xl sm:rounded-2xl border border-blue-50 bg-blue-50/10 shadow-sm flex flex-col gap-1.5 hover:border-blue-300 hover:bg-white transition-all duration-300 cursor-default">
                          <p className="text-sm font-black text-slate-900 leading-tight">{v.name}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{v.dosageForm}</span>
                            <span className="text-[9px] font-black text-blue-600 px-1.5 py-0.5 bg-blue-50 rounded tracking-wider border border-blue-100">{v.strength}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl sm:rounded-3xl">
                        <p className="text-slate-400 text-sm font-bold">No other recorded variations found.</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="lg:col-span-2 space-y-10">
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Manufacturer
                  </h4>
                  <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-10 transition-opacity" />
                    <Building2 className="absolute -right-2 -bottom-2 w-16 h-16 sm:w-24 sm:h-24 opacity-10 group-hover:scale-110 transition-transform" />
                    <p className="text-xl sm:text-2xl font-black leading-tight relative z-10">
                      {medicine.manufacturer || "Manufacturer Unknown"}
                    </p>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-4 relative z-10">Pharma Authenticated</p>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-blue-600" />
                    Active Ingredients
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {medicine.ingredients?.map((ing, i) => (
                      <Badge key={i} variant="outline" className="px-3 sm:px-4 py-1.5 sm:py-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors rounded-lg sm:rounded-xl text-xs">
                        {ing}
                      </Badge>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 sm:p-10 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8 flex-shrink-0 relative z-20">
          <div className="flex items-center gap-4 sm:gap-5">
             <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <Activity className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
             </div>
             <div>
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Pharma Index Key</p>
                <p className="text-sm font-black text-slate-900">{medicine.id.toUpperCase()}</p>
             </div>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Button 
                variant={isSaved ? "destructive" : "default"} 
                className="flex-1 sm:flex-initial rounded-xl sm:rounded-[1.25rem] font-black px-6 sm:px-8 h-12 sm:h-14 text-sm shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                onClick={onToggleSave}
            >
              {isSaved ? (
                <span className="flex items-center gap-2"><Heart className="w-4 h-4 fill-current" /> Medicine Saved</span>
              ) : (
                <span className="flex items-center gap-2"><Heart className="w-4 h-4" /> Save Medicine</span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
