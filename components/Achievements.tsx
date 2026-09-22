"use client";

import React, { useState, useTransition, useMemo } from "react";
import { BookOpen, Award, FileText, Calendar, ExternalLink } from "lucide-react";
import { useData, type PubCer } from "@/lib/data-provider";

const INITIAL_VISIBLE_ACHIEVEMENTS = 5;

export default function Achievements() {
  const { pubCer, categories, loading } = useData();
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [showAll, setShowAll] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filter dari DB categories (sama seperti versi lama)
  const filters = useMemo(() => {
    const cats = (categories || []).filter((c) => c.type === "pub_cer");
    return ["All", ...cats.map((c) => c.name)];
  }, [categories]);

  const filteredAchievements = useMemo(() => {
    if (activeFilter === "All") return pubCer || [];
    return (pubCer || []).filter((a) => a.type === activeFilter);
  }, [pubCer, activeFilter]);

  const visibleAchievements = useMemo(() => {
    if (showAll || filteredAchievements.length <= INITIAL_VISIBLE_ACHIEVEMENTS) return filteredAchievements;
    return filteredAchievements.slice(0, INITIAL_VISIBLE_ACHIEVEMENTS);
  }, [filteredAchievements, showAll]);

  const handleFilterChange = (filter: string) => {
    startTransition(() => {
      setActiveFilter(filter);
      setShowAll(false);
    });
  };

  const getBadgeStyles = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes("publication") || lower.includes("journal") || lower.includes("paper")) {
      return {
        bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        icon: <BookOpen className="w-5 h-5" />
      };
    }
    if (lower.includes("certif") || lower.includes("course")) {
      return {
        bg: "bg-amber-500/10 text-brand-yellow border-amber-500/20",
        icon: <Award className="w-5 h-5" />
      };
    }
    if (lower.includes("patent") || lower.includes("haki") || lower.includes("ip")) {
      return {
        bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        icon: <FileText className="w-5 h-5" />
      };
    }
    return {
      bg: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      icon: <FileText className="w-5 h-5" />
    };
  };

  if (loading && pubCer.length === 0) {
    return (
      <section id="achievements" className="py-24 flex items-center justify-center">
        <div className="text-slate-500">Loading achievements...</div>
      </section>
    );
  }

  return (
    <section id="achievements" className="relative w-full bg-[#020912] py-24 px-6 md:px-16 lg:px-24 flex flex-col justify-center overflow-hidden">
      <div className="max-w-6xl mx-auto w-full z-20">
        
        {/* Header Title */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left mb-12">
          <span className="text-sm font-semibold tracking-widest text-brand-yellow uppercase">
            Achievement
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mt-2 leading-tight">
            Publications & Certifications
          </h2>
        </div>

        {/* Filter Navigation Tabs */}
        {filters.length > 1 && (
          <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-10">
            {filters.map((filter) => {
              const isActive = filter === activeFilter;
              return (
                <button
                  key={filter}
                  onClick={() => handleFilterChange(filter)}
                  className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 active:scale-95 border ${
                    isActive
                      ? "bg-brand-yellow border-brand-yellow text-[#030c17] shadow-lg shadow-brand-yellow/10"
                      : "bg-[#091728] border-slate-700/60 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        )}

        {/* Rows List Container */}
        <div className="w-full">
          <div 
            className={`flex-grow flex flex-col space-y-4 transition-opacity duration-300 ${
              isPending ? "opacity-55" : "opacity-100"
            }`}
          >
            {visibleAchievements.map((ach: PubCer) => {
              const badge = getBadgeStyles(ach.type);
              const Wrapper = (ach.url ? "a" : "div") as keyof JSX.IntrinsicElements;
              const wrapperProps = ach.url
                ? { href: ach.url, target: "_blank", rel: "noopener noreferrer" }
                : {};

              return (
                <Wrapper
                  key={ach.id}
                  {...wrapperProps}
                  className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl bg-[#0c1c31] border border-slate-800/80 hover:border-slate-600 transition-all duration-300 shadow-md"
                >
                  <div className="flex items-start sm:items-center space-x-4 flex-1">
                    <div className={`p-3.5 rounded-xl border ${badge.bg} flex items-center justify-center shrink-0`}>
                      {badge.icon}
                    </div>

                    <div className="flex flex-col">
                      <span className="inline-block sm:hidden text-[10px] font-semibold text-brand-yellow tracking-wider uppercase mb-1">
                        {ach.type}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-white leading-snug group-hover:text-brand-yellow transition-colors duration-200">
                        {ach.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1 font-light">
                        {ach.id_journal_issuer}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-slate-400 mt-3 sm:mt-0 pl-14 sm:pl-0 font-light select-none">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{ach.date}</span>
                    </div>
                    {ach.url && <ExternalLink className="w-3.5 h-3.5 text-brand-yellow" />}
                  </div>
                </Wrapper>
              );
            })}

            {filteredAchievements.length === 0 && (
              <div className="w-full text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-[#0c1c31]/30">
                <p className="text-slate-400 font-light">No achievements found in this category.</p>
              </div>
            )}
          </div>

          {filteredAchievements.length > INITIAL_VISIBLE_ACHIEVEMENTS && (
            <div className="mt-10 flex justify-center w-full">
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="px-5 py-2.5 rounded-full border border-slate-700 bg-[#0c1c31] text-sm font-medium text-slate-200 hover:border-brand-yellow hover:text-brand-yellow transition-colors duration-200"
              >
                {showAll ? "Show less" : "Show all"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
