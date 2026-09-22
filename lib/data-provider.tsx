"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

// =============================================================
// TYPES / INTERFACES
// =============================================================
export interface ServicePropertyDetails {
  id?: number;
  service_id?: number;
  total_rooms: number;
  available_rooms: number;
  headline?: string;
  description?: string;
  info_text?: string;
}

export interface ServicePropertyRoom {
  id?: number;
  service_id?: number;
  room_number: string;
  room_name?: string;
  status: "available" | "booked" | "maintenance";
  image_url?: string;
  note?: string;
  price?: string;
}

export interface Service {
  id: number;
  subject: string;
  name: string;
  category: string;
  description: string;
  detail_description: string;
  icon: string;
  hill_color: string;
  sky_grad: string;
  sheep_x: number;
  sheep_y: number;
  gallery: { id: number; image_url: string }[];
  property_details?: ServicePropertyDetails | null;
  property_rooms?: ServicePropertyRoom[];
}

export interface Project {
  id: number;
  name: string;
  category: string;
  it_sub_category: string;
  description: string;
  tags: string[];
  sky_grad: string;
  hill_colors: string[];
  gallery: { id: number; image_url: string }[];
}

export interface PubCer {
  id: number;
  type: string; // 'Publication' | 'Certification' | 'Patent' | 'Others' (dinamis dari categories table)
  date: string;
  name: string;
  id_journal_issuer: string;
  url: string;
  sort_order?: number;
}

export interface General {
  status_note: string;
  about_name: string;
  about_title: string;
  about_description: string;
  contact_email: string;
  contact_linkedin: string;
  contact_whatsapp?: string;
  about_image_url?: string;
}

export interface Category {
  id: number;
  name: string;
  type: "service" | "project" | "pub_cer";
  sort_order: number;
}

export interface Message {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  is_read: boolean | number;
  created_at: string;
}

// =============================================================
// CONTEXT TYPE
// =============================================================
interface DataContextType {
  // Data
  general: General | null;
  services: Service[];
  projects: Project[];
  pubCer: PubCer[];
  categories: Category[];
  messages: Message[];

  // State
  loading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  refresh: () => Promise<void>;
  refreshOne: (key: keyof DataContextType) => Promise<void>;
  clearCache: () => void;
}

// =============================================================
// DEFAULT CONTEXT VALUE (untuk safety)
// =============================================================
const defaultContext: DataContextType = {
  general: null,
  services: [],
  projects: [],
  pubCer: [],
  categories: [],
  messages: [],
  loading: true,
  error: null,
  lastFetched: null,
  refresh: async () => {},
  refreshOne: async () => {},
  clearCache: () => {},
};

// =============================================================
// CONTEXT CREATION
// =============================================================
const DataContext = createContext<DataContextType>(defaultContext);

// =============================================================
// SAFE FETCH HELPER
// =============================================================
async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, {
      // Selalu ambil data terbaru (no cache) — penting setelah admin edit
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      console.warn(`[DataProvider] ${url} returned ${res.status}`);
      return fallback;
    }

    const data = await res.json();
    return data ?? fallback;
  } catch (err) {
    console.error(`[DataProvider] Fetch failed for ${url}:`, err);
    return fallback;
  }
}

// =============================================================
// PROVIDER COMPONENT
// =============================================================
export function DataProvider({ children }: { children: React.ReactNode }) {
  // Main state
  const [general, setGeneral] = useState<General | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pubCer, setPubCer] = useState<PubCer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const normalizeService = useCallback((item: (Partial<Service> & {
    property_details?: ServicePropertyDetails | ServicePropertyDetails[] | null;
    property_rooms?: ServicePropertyRoom[] | null;
  }) | null | undefined): Service | null => {
    if (!item) return null;

    const propertyDetails = item.property_details;
    const propertyRooms = item.property_rooms;

    return {
      ...item,
      gallery: Array.isArray(item.gallery) ? item.gallery : [],
      property_details: Array.isArray(propertyDetails)
        ? (propertyDetails[0] ?? null)
        : (propertyDetails ?? null),
      property_rooms: Array.isArray(propertyRooms) ? propertyRooms : [],
    } as Service;
  }, []);

  // Meta state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  // ============================================================
  // FETCH ALL — public endpoints only
  // ============================================================
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [g, s, p, pc, cat] = await Promise.all([
        safeFetch<General | null>("/api/general", null),
        safeFetch<Array<Partial<Service>>>('/api/services', []),
        safeFetch<Project[]>("/api/projects", []),
        safeFetch<PubCer[]>("/api/pub-cer", []),
        safeFetch<Category[]>("/api/categories", []),
      ]);

      setGeneral(g);
      setServices((s ?? []).map((item) => normalizeService(item) ?? item as Service));
      setProjects(p);
      setPubCer(pc);
      setCategories(cat);
      setLastFetched(Date.now());
    } catch (err) {
      console.error("[DataProvider] fetchAll failed:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [normalizeService]);

  // ============================================================
  // REFRESH ONE — untuk setelah admin melakukan CRUD
  // ============================================================
  const refreshOne = useCallback(async (key: keyof DataContextType) => {
    try {
      switch (key) {
        case "general": {
          const data = await safeFetch<General | null>("/api/general", null);
          setGeneral(data);
          break;
        }
        case "services": {
          const data = await safeFetch<Service[]>("/api/services", []);
          setServices(data);
          break;
        }
        case "projects": {
          const data = await safeFetch<Project[]>("/api/projects", []);
          setProjects(data);
          break;
        }
        case "pubCer": {
          const data = await safeFetch<PubCer[]>("/api/pub-cer", []);
          setPubCer(data);
          break;
        }
        case "categories": {
          const data = await safeFetch<Category[]>("/api/categories", []);
          setCategories(data);
          break;
        }
        case "messages": {
          // messages adalah admin-only; skip kalau tidak di admin
          const data = await safeFetch<Message[]>("/api/messages", []);
          setMessages(data);
          break;
        }
        default:
          console.warn(`[DataProvider] refreshOne: unknown key "${String(key)}"`);
      }
      setLastFetched(Date.now());
    } catch (err) {
      console.error(`[DataProvider] refreshOne(${String(key)}) failed:`, err);
    }
  }, []);

  // ============================================================
  // CLEAR CACHE
  // ============================================================
  const clearCache = useCallback(() => {
    setGeneral(null);
    setServices([]);
    setProjects([]);
    setPubCer([]);
    setCategories([]);
    setMessages([]);
    setLastFetched(null);
  }, []);

  // ============================================================
  // AUTO-FETCH ON MOUNT
  // ============================================================
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchAll();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchAll]);

  // ============================================================
  // RE-FETCH ON WINDOW FOCUS (opsional - biar data selalu fresh)
  // ============================================================
  useEffect(() => {
    const onFocus = () => {
      // Hanya refetch jika sudah pernah load sebelumnya (>= 30 detik lalu)
      if (lastFetched && Date.now() - lastFetched > 30000) {
        fetchAll();
      }
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchAll, lastFetched]);

  // ============================================================
  // CONTEXT VALUE
  // ============================================================
  const value: DataContextType = {
    // Data
    general,
    services,
    projects,
    pubCer,
    categories,
    messages,

    // Meta
    loading,
    error,
    lastFetched,

    // Actions
    refresh: fetchAll,
    refreshOne,
    clearCache,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// =============================================================
// HOOK - useData
// =============================================================
export function useData(): DataContextType {
  const ctx = useContext(DataContext);

  if (ctx === defaultContext) {
    throw new Error(
      "useData() must be called inside <DataProvider>. " +
        "Make sure your component is wrapped by DataProvider in app/layout.tsx."
    );
  }

  return ctx;
}

// =============================================================
// OPTIONAL: SELECTOR HOOKS (lebih clean dari useData)
// =============================================================

/** Ambil hanya services */
export function useServices() {
  const { services, loading, refreshOne } = useData();
  return {
    services,
    loading,
    refresh: () => refreshOne("services"),
  };
}

/** Ambil hanya projects */
export function useProjects() {
  const { projects, loading, refreshOne } = useData();
  return {
    projects,
    loading,
    refresh: () => refreshOne("projects"),
  };
}

/** Ambil hanya pub_cer */
export function usePubCer() {
  const { pubCer, loading, refreshOne } = useData();
  return {
    pubCer,
    loading,
    refresh: () => refreshOne("pubCer"),
  };
}

/** Ambil categories dengan filter type */
export function useCategories(type?: "service" | "project" | "pub_cer") {
  const { categories, loading, refreshOne } = useData();
  return {
    categories: type ? categories.filter((c) => c.type === type) : categories,
    loading,
    refresh: () => refreshOne("categories"),
  };
}

/** Ambil hanya general settings */
export function useGeneral() {
  const { general, loading, refreshOne } = useData();
  return {
    general,
    loading,
    refresh: () => refreshOne("general"),
  };
}

/** Ambil messages (admin only) */
export function useMessages() {
  const { messages, loading, refresh } = useData();
  return {
    messages,
    loading,
    refresh,
  };
}
