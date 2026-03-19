import React from "react";
import { Header } from "@/components/Header";
import { 
  Activity, 
  ShieldCheck, 
  Pill, 
  Thermometer, 
  Stethoscope, 
  Syringe, 
  Dna,
  Microscope,
  HeartPulse,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";

const getIconForCategory = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('antibiotic') || n.includes('anti-infective')) return ShieldCheck;
  if (n.includes('nsaid') || n.includes('anti-inflammatory')) return Thermometer;
  if (n.includes('opioid') || n.includes('analgesic')) return Activity;
  if (n.includes('vaccine')) return Syringe;
  if (n.includes('cardio') || n.includes('blood')) return HeartPulse;
  if (n.includes('neurological')) return Microscope;
  if (n.includes('hormone')) return Dna;
  if (n.includes('stomach') || n.includes('digestive')) return Pill;
  return Stethoscope;
};

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { medicines: true }
      }
    },
    orderBy: {
      medicines: {
        _count: 'desc'
      }
    }
  });

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900">
      <Header />

      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200 pt-16 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-black uppercase tracking-widest border border-blue-100/50">
              <Activity className="w-3.5 h-3.5" />
              <span>Medical Directory</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900">
              Browse by <span className="text-blue-600 italic">Categories.</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium max-w-xl">
              Explore our indexed clinical database grouped by pharmaceutical class and therapeutic indication.
            </p>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <main className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((category) => {
            const Icon = getIconForCategory(category.name);
            return (
              <Link 
                key={category.id}
                href={`/?category=${encodeURIComponent(category.name)}`}
                className="group relative bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden"
              >
                {/* Decorative Background Icon */}
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-125 transition-all duration-700 pointer-events-none">
                  <Icon className="w-32 h-32 rotate-12" />
                </div>

                <div className="space-y-6 relative z-10">
                  <div className="inline-flex p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500 shadow-sm border border-blue-100/20">
                    <Icon className="w-8 h-8" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900 leading-tight">
                      {category.name}
                    </h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ChevronRight className="w-3 h-3 text-blue-500" />
                      {category._count.medicines} Medicines
                    </p>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between text-xs font-black text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <span>Explore Catalog</span>
                  <Activity className="w-4 h-4 animate-pulse" />
                </div>
              </Link>
            );
          })}
        </div>

        {categories.length === 0 && (
          <div className="py-20 text-center space-y-4">
             <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto" />
             <p className="text-slate-500 font-bold">Mining data from FDA... Please wait.</p>
          </div>
        )}
      </main>
    </div>
  );
}
