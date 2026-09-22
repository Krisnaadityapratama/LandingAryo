"use client";

import React, { useEffect, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import type { Service } from "@/lib/data-provider";

interface Props {
  service: Service;
  onClose: () => void;
}

const normalizeDriveImageUrl = (url?: string) => {
  if (!url) return "";

  const trimmed = url.trim();
  const rawIdMatch = trimmed.match(/^([a-zA-Z0-9_-]{10,})$/);
  if (rawIdMatch) {
    return `https://drive.google.com/thumbnail?id=${rawIdMatch[1]}&sz=w1000`;
  }

  try {
    const parsed = new URL(trimmed);
    const id = parsed.searchParams.get("id") || parsed.pathname.match(/\/d\/([a-zA-Z0-9_-]{10,})/)?.[1];
    if (id) {
      return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    }
  } catch {
    // ignore invalid URL and fall back to regex extraction below
  }

  const match = trimmed.match(/(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{10,})/);
  if (!match) return trimmed;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
};

const getRoomImages = (room: {
  image_url?: string;
  image_urls?: string[];
}) => {
  const legacyUrls = Array.isArray((room as { image_urls?: string[] }).image_urls)
    ? ((room as { image_urls?: string[] }).image_urls ?? []).filter(Boolean)
    : [];
  const merged = [...legacyUrls, ...(room.image_url ? [room.image_url] : [])].filter(Boolean);
  return [...new Set(merged.map((url) => normalizeDriveImageUrl(url)))].filter(Boolean);
};

export default function ServiceDetailModal({ service, onClose }: Props) {
  const [currentImage, setCurrentImage] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<
    | { room_number?: string; room_name?: string; status?: "available" | "booked" | "maintenance"; image_url?: string; image_urls?: string[]; note?: string; price?: string }
    | null
  >(null);
  const [roomImageIndex, setRoomImageIndex] = useState(0);

  const images = service.gallery || [];
  const hasImages = images.length > 0;
  const propertyDetails = Array.isArray(service.property_details)
    ? (service.property_details[0] ?? null)
    : (service.property_details ?? null);
  const propertyRooms = Array.isArray(service.property_rooms)
    ? service.property_rooms
    : (service.property_rooms ?? []);

  const nextImage = useCallback(() => {
    if (images.length > 1) setCurrentImage((p) => (p + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    if (images.length > 1) setCurrentImage((p) => (p - 1 + images.length) % images.length);
  }, [images.length]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, nextImage, prevImage]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextImage();
      else prevImage();
    }
    setTouchStart(null);
  };

  const openRoom = (room: NonNullable<typeof selectedRoom>) => {
    console.log("Opening room:", room);
    setSelectedRoom(room);
    setRoomImageIndex(0);
  };

  const closeRoom = () => {
    setSelectedRoom(null);
    setRoomImageIndex(0);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#0a1729] border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-800 shrink-0">
          <div className="flex-1 pr-4">
            <span className="text-[10px] font-semibold tracking-widest text-brand-yellow uppercase">
              {service.category}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1.5 leading-tight">
              {service.name}
            </h2>
            <p className="text-slate-400 text-sm mt-1">{service.subject}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {/* Image Carousel */}
          <div
            className="relative bg-black aspect-video w-full"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {hasImages ? (
              <>
                <img
                  src={images[currentImage].image_url}
                  alt={`${service.name} ${currentImage + 1}`}
                  className="w-full h-full object-contain"
                />

                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all backdrop-blur-sm"
                      aria-label="Previous"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all backdrop-blur-sm"
                      aria-label="Next"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* Dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImage(i)}
                          className={`h-2 rounded-full transition-all ${
                            i === currentImage ? "bg-brand-yellow w-6" : "bg-white/50 w-2 hover:bg-white/80"
                          }`}
                          aria-label={`Image ${i + 1}`}
                        />
                      ))}
                    </div>

                    {/* Counter */}
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs backdrop-blur-sm">
                      {currentImage + 1} / {images.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                <ImageOff className="w-12 h-12" />
                <p className="text-sm">No images available</p>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Description
              </h3>
              <p className="text-slate-200 leading-relaxed text-sm sm:text-base">
                {service.description}
              </p>
            </div>

            {service.detail_description && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Detail Information
                </h3>
                <p className="text-slate-300 leading-relaxed text-sm sm:text-base whitespace-pre-line">
                  {service.detail_description}
                </p>
              </div>
            )}

            {(propertyDetails || propertyRooms.length > 0) && (
              <div className="rounded-2xl border border-brand-yellow/20 bg-brand-yellow/5 p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-yellow">
                      Property Overview
                    </p>
                    <h3 className="text-xl font-bold text-white mt-1">
                      {propertyDetails?.headline || service.name}
                    </h3>
                  </div>
                </div>

                {propertyDetails && (
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="rounded-xl bg-slate-900/70 p-3 border border-slate-700">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Total Kamar</div>
                      <div className="text-2xl font-bold text-white mt-1">{propertyDetails.total_rooms ?? 0}</div>
                    </div>
                    <div className="rounded-xl bg-slate-900/70 p-3 border border-slate-700">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Tersedia</div>
                      <div className="text-2xl font-bold text-brand-yellow mt-1">{propertyDetails.available_rooms ?? 0}</div>
                    </div>
                  </div>
                )}

                {propertyDetails?.description && (
                  <p className="text-slate-300 text-sm leading-relaxed mb-4 whitespace-pre-line">
                    {propertyDetails.description}
                  </p>
                )}

                {propertyRooms.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Room List</h4>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {propertyRooms.map((room, index) => (
                        <button
                          key={`${room.room_number || "room"}-${index}`}
                          type="button"
                          onClick={() => openRoom(room)}
                          className="text-left rounded-xl border border-slate-700 bg-slate-900/70 p-3 hover:border-brand-yellow/50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-brand-yellow">
                              {room.room_number || `Room ${index + 1}`}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              room.status === "available"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : room.status === "booked"
                                  ? "bg-amber-500/15 text-amber-300"
                                  : "bg-red-500/15 text-red-300"
                            }`}>
                              {room.status}
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-white">{room.room_name || "Room"}</div>
                          {room.price && (
                            <div className="text-[11px] text-slate-400 mt-2">{room.price}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {propertyDetails?.info_text && (
                  <p className="mt-4 text-xs text-slate-400 whitespace-pre-line">{propertyDetails.info_text}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedRoom && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setSelectedRoom(null)} />
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#0a1729] p-4 shadow-2xl">
            <button
              onClick={closeRoom}
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-slate-800 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="space-y-3 pr-8">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-lg font-bold text-white">{selectedRoom.room_name || `Room ${selectedRoom.room_number}`}</h4>
                <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                  selectedRoom.status === "available"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : selectedRoom.status === "booked"
                      ? "bg-amber-500/15 text-amber-300"
                      : "bg-red-500/15 text-red-300"
                }`}>
                  {selectedRoom.status}
                </span>
              </div>

              {(() => {
                const roomImages = getRoomImages(selectedRoom).filter(Boolean);
                const nextRoomImage = () => {
                  if (roomImages.length > 1) setRoomImageIndex((prev) => (prev + 1) % roomImages.length);
                };

                const prevRoomImage = () => {
                  if (roomImages.length > 1) setRoomImageIndex((prev) => (prev - 1 + roomImages.length) % roomImages.length);
                };

                const validImage = roomImages[roomImageIndex] || roomImages[0];

                console.log("Room modal image list:", roomImages, "selectedRoom:", selectedRoom);

                return roomImages.length > 0 && validImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                    <img
                      key={validImage}
                      src={validImage}
                      alt={selectedRoom.room_name || selectedRoom.room_number}
                      referrerPolicy="no-referrer"
                      loading="eager"
                      className="w-full h-[22rem] object-cover"
                      onLoad={() => console.log("Room image loaded:", validImage)}
                      onError={(e) => {
                        console.warn("Failed to load room image:", validImage);
                        e.currentTarget.style.display = "none";
                      }}
                    />

                    {roomImages.length > 1 && (
                      <>
                        <button
                          onClick={prevRoomImage}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white"
                          aria-label="Previous room image"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={nextRoomImage}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white"
                          aria-label="Next room image"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                          {roomImages.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setRoomImageIndex(idx)}
                              className={`h-2 rounded-full ${idx === roomImageIndex ? "w-6 bg-brand-yellow" : "w-2 bg-white/60"}`}
                              aria-label={`Room image ${idx + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : null;
              })()}

              <div className="text-sm text-slate-300 space-y-2">
                <p><span className="text-slate-400">Room:</span> {selectedRoom.room_number}</p>
                {selectedRoom.price && <p><span className="text-slate-400">Price:</span> {selectedRoom.price}</p>}
                {selectedRoom.note && <p className="whitespace-pre-line"><span className="text-slate-400">Note:</span> {selectedRoom.note}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.25s ease-out; }
      `}</style>
    </div>
  );
}
