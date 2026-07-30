"use client";

import React, { useState, useEffect, useCallback } from "react";

export default function FloatingFishingRod() {
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  const [viewportWidth, setViewportWidth] = useState<number>(0);

  const updateAnchor = useCallback(() => {
    const el = document.getElementById("fishing-line-endpoint");
    if (el) {
      const rect = el.getBoundingClientRect();
      
      // Prevent double-bobbing on scroll
      let yOffset = 0;
      const heroWrapper = el.closest('.animate-bob');
      if (heroWrapper) {
        const style = window.getComputedStyle(heroWrapper);
        const transform = style.transform;
        if (transform && transform !== 'none') {
          const matrix = transform.match(/^matrix\((.+)\)$/);
          if (matrix) {
            const values = matrix[1].split(', ');
            if (values.length === 6) {
              yOffset = parseFloat(values[5]);
            }
          }
        }
      }

      setAnchor({
        left: rect.left + rect.width / 2,
        top: rect.top + rect.height / 2 - yOffset,
      });
    }
  }, []);

  // Track viewport width untuk detect mobile
  useEffect(() => {
    const updateViewport = () => {
      setViewportWidth(window.innerWidth);
    };
    
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const timer = setTimeout(updateAnchor, 300);

    window.addEventListener("resize", updateAnchor);
    window.addEventListener("scroll", updateAnchor, { passive: true });
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor);
    };
  }, [updateAnchor]);

  if (!anchor) return null;

  // ============================================================
  // OFFSET LOGIC: geser ke kiri di mobile
  // ============================================================
  const isMobile = viewportWidth < 768; // md breakpoint
  
  // Offset tambahan:
  // Mobile: geser ke kiri ~30-40px (biar gak mepet banget)
  // Desktop: offset 0 (pakai anchor)
  const mobileOffsetX = isMobile ? 0 : 0;

  const finalLeft = anchor.left + mobileOffsetX;

  return (
    <div
      className="fixed bottom-0 z-50 pointer-events-none select-none flex flex-col items-center"
      style={{
        left: `${finalLeft}px`,
        top: `${anchor.top}px`,
        transform: "translateX(-50%)",
      }}
    >
      {/* Wrapper dengan animate-bob sync dengan Hero */}
      <div className="flex flex-col items-center w-full h-full animate-bob">
        {/* Fishing line */}
        <div className="w-[1.5px] flex-grow bg-white/20" />

        {/* Bait image */}
        <img
          src="/images/cacing.png"
          alt="Cacing"
          className="w-12 h-auto mb-15 rounded-md shadow-md animate-wiggle origin-top shrink-0"
          style={{ animationDuration: "2s" }}
          draggable={false}
        />
      </div>
    </div>
  );
}
