"use client";

import React, { useEffect, useState } from "react";
import { Menu, X, ArrowDown } from "lucide-react";
import { useData } from "@/lib/data-provider";

const parseRoles = (value: string): string[] => {
  const raw = (value ?? "").trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item).trim())
        .filter(Boolean);
    }
  } catch {
    // fallback to plain text parsing below
  }

  return raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

function RoleText({ role, onDone }: { role: string; onDone: () => void }) {
  const [displayedRole, setDisplayedRole] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!role) return;

    if (!isDeleting && displayedRole.length < role.length) {
      const timeout = setTimeout(() => {
        setDisplayedRole(role.slice(0, displayedRole.length + 1));
      }, 90);

      return () => clearTimeout(timeout);
    }

    if (!isDeleting && displayedRole.length === role.length) {
      const timeout = setTimeout(() => {
        setIsDeleting(true);
      }, 1200);

      return () => clearTimeout(timeout);
    }

    if (isDeleting && displayedRole.length > 0) {
      const timeout = setTimeout(() => {
        setDisplayedRole(role.slice(0, displayedRole.length - 1));
      }, 45);

      return () => clearTimeout(timeout);
    }

    if (isDeleting && displayedRole.length === 0) {
      const timeout = setTimeout(() => {
        onDone();
      }, 50);

      return () => clearTimeout(timeout);
    }
  }, [displayedRole, isDeleting, onDone, role]);

  return <>{displayedRole}</>;
}

export default function Hero() {
  const { general } = useData();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [roleIndex, setRoleIndex] = useState(0);

  const scrollToSection = (id: string) => {
    setIsMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const statusNote = general?.status_note?.trim() || "";
  const aboutName = general?.about_name?.trim() || "";
  const aboutTitle = general?.about_title?.trim() || "";
  const roles = parseRoles(aboutTitle);
  const currentRole = roles[roleIndex % roles.length] || "";

  const handleRoleDone = () => {
    if (!roles.length) return;
    setRoleIndex((prev) => (prev + 1) % roles.length);
  };

  return (
    <section className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#e0f0ff] via-[#3b82f6] to-[#030c17]">

      {/* Header / Nav */}
      <header className="relative w-full flex justify-end p-6 z-50">
        <button
          onClick={() => setIsMenuOpen(true)}
          className="relative group p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-yellow/50 transition-transform active:scale-95"
          aria-label="Toggle navigation menu"
        >
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg
              className="absolute inset-0 w-full h-full text-brand-yellow animate-spin"
              style={{ animationDuration: "25s" }}
              viewBox="0 0 100 100"
            >
              <defs>
                <path id="ray" d="M 50 15 L 50 5 M 50 15" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </defs>
              <use href="#ray" transform="rotate(0 50 50)" />
              <use href="#ray" transform="rotate(30 50 50)" />
              <use href="#ray" transform="rotate(60 50 50)" />
              <use href="#ray" transform="rotate(90 50 50)" />
              <use href="#ray" transform="rotate(120 50 50)" />
              <use href="#ray" transform="rotate(150 50 50)" />
              <use href="#ray" transform="rotate(180 50 50)" />
              <use href="#ray" transform="rotate(210 50 50)" />
              <use href="#ray" transform="rotate(240 50 50)" />
              <use href="#ray" transform="rotate(270 50 50)" />
              <use href="#ray" transform="rotate(300 50 50)" />
              <use href="#ray" transform="rotate(330 50 50)" />
            </svg>
            <div className="absolute w-9 h-9 rounded-full bg-brand-yellow flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
              <Menu className="w-5 h-5 text-[#030c17] stroke-[2.5]" />
            </div>
          </div>
        </button>
      </header>

      {/* Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-[#030c17]/95 backdrop-blur-md z-50 flex flex-col justify-center items-center transition-all duration-300 animate-fade-in">
          <button
            onClick={() => setIsMenuOpen(false)}
            className="absolute top-8 right-8 p-3 rounded-full bg-brand-yellow text-[#030c17] hover:scale-110 active:scale-95 transition-transform duration-200"
            aria-label="Close menu"
          >
            <X className="w-6 h-6 stroke-[2.5]" />
          </button>

          <nav className="flex flex-col space-y-6 text-center">
            {["about-me", "services", "projects", "achievements", "contact"].map((section) => (
              <button
                key={section}
                onClick={() => scrollToSection(section)}
                className="text-3xl font-serif tracking-wide text-slate-100 hover:text-brand-yellow capitalize transition-colors duration-200"
              >
                {section.replace("-", " ")}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col md:flex-row items-center justify-center px-6 md:px-16 lg:px-24 pb-12 z-20">

        {/* LEFT COLUMN: Image */}
        <div className="
          w-full
          md:w-[55%]
          lg:w-[60%]
          flex
          justify-start
          items-center
          mb-10
          md:mb-0
          relative
          select-none
          -ml-38
          md:-ml-16
          lg:-ml-24
        ">

          {/* Speech bubble */}
          <div
            className="absolute top-[-20px] left-[40%] md:left-[35%] bg-white text-slate-900 px-4 py-2 rounded-2xl shadow-xl border border-slate-300 font-serif italic text-sm md:text-base animate-bounce z-10"
            style={{ animationDuration: "2s" }}
          >
            {statusNote}
            <div className="absolute bottom-[-8px] left-12 w-4 h-4 bg-white border-r border-b border-slate-300 rotate-45"></div>
          </div>

          {/* Image wrapper */}
          <div className="
            relative
            inline-block
            w-[28.75rem]
            ml-8
            md:ml-8
            lg:ml-12
            animate-bob
          ">
            <img
              src="/images/fishing.png"
              alt="..."
              className="
                w-full
                ms-9
                sm:ms-2
                md:ms-[3.25rem]
                z-[299] h-auto drop-shadow-2xl
              "
              draggable={false}
            />

            {/* SVG overlay */}
            <svg
              viewBox="0 0 800 494"
              className="absolute inset-0 w-full h-full pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line
                x1="62" y1="4"
                x2="62" y2="448"
                stroke="white"
                strokeWidth="1.8"
                opacity="0.85"
                strokeLinecap="round"
              />

              <ellipse cx="62" cy="452" fill="none" stroke="#60a5d8" strokeWidth="2.5">
                <animate attributeName="rx" values="0; 95" dur="4.5s" repeatCount="indefinite" begin="0s" />
                <animate attributeName="ry" values="0; 25" dur="4.5s" repeatCount="indefinite" begin="0s" />
                <animate attributeName="opacity" values="0.9; 0" dur="4.5s" repeatCount="indefinite" begin="0s" />
              </ellipse>
              <ellipse cx="62" cy="452" fill="none" stroke="#60a5d8" strokeWidth="2.5">
                <animate attributeName="rx" values="0; 95" dur="4.5s" repeatCount="indefinite" begin="-1.5s" />
                <animate attributeName="ry" values="0; 25" dur="4.5s" repeatCount="indefinite" begin="-1.5s" />
                <animate attributeName="opacity" values="0.9; 0" dur="4.5s" repeatCount="indefinite" begin="-1.5s" />
              </ellipse>
              <ellipse cx="62" cy="452" fill="none" stroke="#60a5d8" strokeWidth="2.5">
                <animate attributeName="rx" values="0; 95" dur="4.5s" repeatCount="indefinite" begin="-3s" />
                <animate attributeName="ry" values="0; 25" dur="4.5s" repeatCount="indefinite" begin="-3s" />
                <animate attributeName="opacity" values="0.9; 0" dur="4.5s" repeatCount="indefinite" begin="-3s" />
              </ellipse>

              <circle id="fishing-line-endpoint" cx="62" cy="447" r="4" fill="#5aaad0" opacity="0.9" />
            </svg>
          </div>

        </div>

        {/* RIGHT COLUMN: Text & CTA */}
        <div className="
          w-full
          md:w-1/2
          flex
          flex-col
          items-center
          md:items-start
          text-center
          md:text-left
          md:pl-8
          -mt-8
        ">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold text-white leading-tight tracking-tight">
            Hi, I&apos;m <span className="text-brand-yellow">{aboutName}</span>.
          </h1>

          <div className="mt-4 flex items-center text-xl sm:text-2xl text-slate-200/90 font-light">
            <span>I&apos;m a&nbsp;</span>
            <span className="min-w-[10ch] font-medium text-brand-yellow border-r-2 border-brand-yellow pr-1 animate-pulse">
              {roles.length ? (
                <RoleText key={`${roleIndex}-${currentRole}`} role={currentRole} onDone={handleRoleDone} />
              ) : (
                aboutTitle
              )}
            </span>
          </div>

          <button
            onClick={() => scrollToSection("about-me")}
            className="mt-8 flex items-center space-x-2 px-6 py-3 rounded-full bg-white hover:bg-slate-100 text-[#1e60a3] font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 group"
          >
            <span>Scroll to explore</span>
            <ArrowDown className="w-4 h-4 group-hover:translate-y-1 transition-transform duration-200" />
          </button>
        </div>

      </div>

      <div id="about-me" className="h-4 w-full" />
    </section>
  );
}
