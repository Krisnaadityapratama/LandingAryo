"use client";

import React, { useState, useTransition, useMemo } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { useData, type Project } from "@/lib/data-provider";
import ProjectDetailModal from "./ProjectDetailModal";

const VISIBLE_PROJECTS = 4;

export default function Projects() {
  const { projects, categories, loading } = useData();
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [projectStart, setProjectStart] = useState(0);
  const [isPending, startTransition] = useTransition();
  
  // ============================================================
  // MODAL STATE
  // ============================================================
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  // ============================================================
  // FILTER (dinamis dari DB categories)
  // ============================================================
  const filters = useMemo(() => {
    const cats = (categories || []).filter((c) => c.type === "project");
    return ["All", ...cats.map((c) => c.name)];
  }, [categories]);

  const filteredProjects = useMemo(() => {
    if (activeFilter === "All") return projects || [];
    return (projects || []).filter((p) => p.category === activeFilter);
  }, [projects, activeFilter]);

  const visibleProjects = useMemo(
    () => filteredProjects.slice(projectStart, projectStart + VISIBLE_PROJECTS),
    [filteredProjects, projectStart]
  );

  const handleFilterChange = (filter: string) => {
    startTransition(() => {
      setActiveFilter(filter);
      setProjectStart(0);
    });
  };

  // ============================================================
  // IMAGE ERROR HANDLER
  // ============================================================
  const handleImageError = (projectId: number) => {
    setImageErrors((prev) => ({ ...prev, [projectId]: true }));
  };

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (loading && projects.length === 0) {
    return (
      <section id="projects" className="py-24 flex items-center justify-center">
        <div className="text-slate-500">Loading projects...</div>
      </section>
    );
  }

  return (
    <>
      <section
        id="projects"
        className="relative w-full bg-[#030c17] py-24 px-6 md:px-16 lg:px-24 flex flex-col justify-center overflow-hidden"
      >
        <div className="max-w-6xl mx-auto w-full z-20">
          
          {/* Header */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left mb-12">
            <span className="text-sm font-semibold tracking-widest text-brand-yellow uppercase">
              Portfolio
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mt-2 leading-tight">
              Projects
            </h2>
          </div>

          {/* Filter Tabs */}
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

          {/* Projects Grid */}
          <div className="w-full">
            <div className="flex items-center gap-3 sm:gap-5">
              {filteredProjects.length > VISIBLE_PROJECTS && (
                <button
                  type="button"
                  onClick={() => setProjectStart((current) => Math.max(0, current - 1))}
                  disabled={projectStart === 0}
                  className="shrink-0 p-2 rounded-full border border-slate-700 bg-[#0c1c31] text-slate-300 hover:border-brand-yellow hover:text-brand-yellow disabled:opacity-30 disabled:hover:border-slate-700 disabled:hover:text-slate-300 transition-colors"
                  aria-label="Previous projects"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              <div
                className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full transition-opacity duration-300 ${
                  isPending ? "opacity-55" : "opacity-100"
                }`}
              >
              {visibleProjects.map((project: Project) => {
                // ============================================================
                // IMAGE & SVG RESOLUTION
                // ============================================================
                const hasGallery = project.gallery && project.gallery.length > 0;
                const hasImageError = imageErrors[project.id];
                const firstImage = hasGallery ? project.gallery[0].image_url : null;
                const showImage = hasGallery && firstImage && !hasImageError;
                const hillColors = project.hill_colors || ["#a3e635", "#65a30d"];

                return (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className="group flex flex-col rounded-2xl overflow-hidden bg-[#0c1c31] border border-slate-800/80 hover:border-slate-600 transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-xl hover:shadow-brand-yellow/2 cursor-pointer"
                  >
                    
                    {/* ============================================== */}
                    {/* THUMBNAIL: Image gallery or SVG fallback */}
                    {/* ============================================== */}
                    <div
                      className={`relative h-32 border-b border-slate-800/80 overflow-hidden ${
                        showImage ? 'bg-slate-900' : `bg-gradient-to-b ${project.sky_grad || 'from-sky-200 to-sky-400'}`
                      }`}
                    >
                      {showImage ? (
                        <>
                          <img
                            key={firstImage}
                            src={firstImage}
                            alt={project.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                            onError={() => handleImageError(project.id)}
                            onLoad={() => {
                              setImageErrors((prev) => {
                                const next = { ...prev };
                                delete next[project.id];
                                return next;
                              });
                            }}
                          />
                          
                          {/* Gallery counter badge */}
                          {project.gallery.length > 1 && (
                            <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium flex items-center gap-1">
                              <span>📷</span>
                              <span>{project.gallery.length}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        /* SVG fallback */
                        <svg viewBox="0 0 100 50" className="w-full h-full object-cover" preserveAspectRatio="none">
                          <circle cx="50" cy="50" r="32" fill={hillColors[0] || "#a3e635"} opacity="0.75" />
                          <circle cx="15" cy="52" r="28" fill={hillColors[1] || "#65a30d"} />
                          <circle cx="85" cy="52" r="26" fill={hillColors[1] || "#65a30d"} />
                          <ellipse cx="30" cy="12" rx="7" ry="2" fill="white" opacity="0.8" />
                          <ellipse cx="70" cy="10" rx="9" ry="2.5" fill="white" opacity="0.8" />
                        </svg>
                      )}

                      {/* Error indicator */}
                      {hasImageError && hasGallery && (
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full bg-red-500/80 backdrop-blur-sm text-white text-[9px] flex items-center gap-1">
                          <ImageOff className="w-2.5 h-2.5" />
                          <span>SVG</span>
                        </div>
                      )}
                    </div>

                    {/* Card Info */}
                    <div className="p-5 flex-grow flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {(project.tags || []).map((tag: string) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase bg-slate-800 text-slate-300 border border-slate-700/60"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <span className="text-[10px] font-semibold tracking-wider text-brand-yellow uppercase block mb-1">
                          {project.category}
                        </span>

                        <h3 className="text-base sm:text-lg font-bold text-white leading-snug group-hover:text-brand-yellow transition-colors duration-200">
                          {project.name}
                        </h3>
                        
                        <p className="mt-2 text-slate-400 text-xs sm:text-sm leading-relaxed line-clamp-3">
                          {project.description}
                        </p>
                      </div>

                      {/* View Details hint */}
                      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500">
                        <span>Click to view</span>
                        <ChevronRight className="w-3 h-3 group-hover:text-brand-yellow group-hover:translate-x-0.5 transition-all duration-200" />
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredProjects.length === 0 && (
                <div className="col-span-full w-full text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-[#0c1c31]/30">
                  <p className="text-slate-400 font-light">No projects found in this category.</p>
                </div>
              )}
              </div>

              {filteredProjects.length > VISIBLE_PROJECTS && (
                <button
                  type="button"
                  onClick={() => setProjectStart((current) => Math.min(filteredProjects.length - VISIBLE_PROJECTS, current + 1))}
                  disabled={projectStart >= filteredProjects.length - VISIBLE_PROJECTS}
                  className="shrink-0 p-2 rounded-full border border-slate-700 bg-[#0c1c31] text-slate-300 hover:border-brand-yellow hover:text-brand-yellow disabled:opacity-30 disabled:hover:border-slate-700 disabled:hover:text-slate-300 transition-colors"
                  aria-label="Next projects"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* MODAL: Project Detail */}
      {/* ============================================================ */}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </>
  );
}
