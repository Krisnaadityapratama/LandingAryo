"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Edit2, Trash2, X, Upload, Save, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { useData } from "@/lib/data-provider";

interface ServicePropertyDetails {
  id?: number;
  service_id?: number;
  total_rooms: number;
  available_rooms: number;
  headline: string;
  description: string;
  info_text: string;
}

interface ServicePropertyRoom {
  id?: number;
  service_id?: number;
  room_number: string;
  room_name: string;
  status: "available" | "booked" | "maintenance";
  image_url: string;
  note: string;
  price: string;
}

interface Service {
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

const ICONS = ["BarChart3", "Building2", "Code2"];
const PROPERTY_CATEGORY_NAMES = ["Property Management", "Property & Maintenance"];

const normalizeDriveImageUrl = (value?: string) => {
  if (!value) return "";

  const trimmed = value.trim();
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

const isPropertyCategory = (category?: string) =>
  !!category && PROPERTY_CATEGORY_NAMES.some((name) => name.toLowerCase() === category.trim().toLowerCase());

const createDefaultPropertyDetails = (): ServicePropertyDetails => ({
  total_rooms: 0,
  available_rooms: 0,
  headline: "",
  description: "",
  info_text: "",
});

const createDefaultPropertyRoom = (): ServicePropertyRoom => ({
  room_number: "",
  room_name: "",
  status: "available",
  image_url: "",
  note: "",
  price: "",
});

export default function ServicesAdmin() {
  const { categories, refresh } = useData();
  const serviceCategories = categories.filter((c) => c.type === 'service');

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Service> | null>(null);
  const [galleryService, setGalleryService] = useState<Service | null>(null);

  const load = async () => {
    const data = await fetch("/api/services").then((r) => r.json());
    const normalized = Array.isArray(data)
      ? data.map((item) => ({
          ...item,
          property_details: Array.isArray(item.property_details) ? (item.property_details[0] ?? null) : (item.property_details ?? null),
          property_rooms: Array.isArray(item.property_rooms) ? item.property_rooms : [],
        }))
      : [];
    setServices(normalized);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name || !editing.subject || !editing.category || !editing.description) {
      alert("Please fill all required fields");
      return;
    }

    const normalizedPropertyDetails = Array.isArray(editing.property_details)
      ? (editing.property_details[0] ?? createDefaultPropertyDetails())
      : (editing.property_details ?? createDefaultPropertyDetails());

    const normalizedPropertyRooms = (editing.property_rooms ?? []).filter((room) =>
      room.room_number || room.room_name || room.image_url || room.note || room.price
    ).map((room) => ({
      ...room,
      image_url: normalizeDriveImageUrl(room.image_url || ""),
    }));

    const method = editing.id ? "PUT" : "POST";
    const url = editing.id ? `/api/services/${editing.id}` : "/api/services";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editing,
        property_details: undefined,
        property_rooms: undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed to save");
      return;
    }

    const savedService = await res.json();
    const serviceId = savedService?.id ?? editing.id;

    if (serviceId && isPropertyCategory(editing.category)) {
      const propertyDetails = normalizedPropertyDetails;
      const propertyRooms = normalizedPropertyRooms;

      const detailRes = await fetch(`/api/services/${serviceId}/property`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(propertyDetails),
      });

      if (!detailRes.ok) {
        const err = await detailRes.json();
        alert(err.error || "Failed to save property details");
        return;
      }

      const roomRes = await fetch(`/api/services/${serviceId}/property/rooms`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rooms: propertyRooms }),
      });

      if (!roomRes.ok) {
        const err = await roomRes.json();
        alert(err.error || "Failed to save property rooms");
        return;
      }
    }

    setEditing(null);
    load();
    await refresh();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this service?")) return;
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  const getDefaultEditing = (): Partial<Service> => ({
    subject: "",
    name: "",
    category: serviceCategories[0]?.name || "",
    description: "",
    detail_description: "",
    icon: "Code2",
    hill_color: "#65a30d",
    sky_grad: "from-sky-100 to-sky-300",
    sheep_x: 50,
    sheep_y: 130,
    property_details: createDefaultPropertyDetails(),
    property_rooms: [],
  });

  return (
    <div className="p-8 lg:p-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Services</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your service offerings</p>
        </div>
        <button
          onClick={() => setEditing(getDefaultEditing())}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-yellow text-[#030c17] font-bold hover:bg-brand-yellow-dark active:scale-95"
        >
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </div>

      {/* Warning kalau belum ada category */}
      {serviceCategories.length === 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-semibold text-sm">No service categories yet</p>
            <p className="text-amber-300/80 text-xs mt-1">
              Please add categories first at{" "}
              <a href="/secret-admin/categories" className="underline">Categories menu</a>
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500">Loading...</div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-[#0a1729]/30">
          <p className="text-slate-400">No services yet. Click &quot;Add Service&quot; to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <div key={s.id} className="p-5 rounded-2xl bg-[#0a1729] border border-slate-800 flex flex-col sm:flex-row gap-4 justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-1">
                  <span className="text-[10px] font-semibold tracking-wider text-brand-yellow uppercase">{s.category}</span>
                  <span className="text-[10px] text-slate-500">·</span>
                  <span className="text-[10px] text-slate-500">{s.subject}</span>
                </div>
                <h3 className="text-white font-bold">{s.name}</h3>
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">{s.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> {s.gallery?.length || 0}/3 images</span>
                </div>
              </div>
              <div className="flex sm:flex-col gap-2">
                <button onClick={() => setGalleryService(s)} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium">Gallery</button>
                <button onClick={() => setEditing(s)} className="px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-medium flex items-center gap-1 justify-center"><Edit2 className="w-3 h-3" /> Edit</button>
                <button onClick={() => handleDelete(s.id)} className="px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-medium flex items-center gap-1 justify-center"><Trash2 className="w-3 h-3" /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <h2 className="text-xl font-bold text-white mb-6">{editing.id ? "Edit Service" : "Add Service"}</h2>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <Field label="Subject *" value={editing.subject || ""} onChange={(v) => setEditing({ ...editing, subject: v })} placeholder="e.g. Web Development" />
            <Field label="Name *" value={editing.name || ""} onChange={(v) => setEditing({ ...editing, name: v })} />
            
            {/* Category - DINAMIS dari DB */}
            <div>
              <label className="block text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">Category *</label>
              <select
                value={editing.category || ""}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 focus:border-brand-yellow text-slate-100 outline-none"
              >
                <option value="">-- Select category --</option>
                {serviceCategories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              {serviceCategories.length === 0 && (
                <p className="text-xs text-amber-400 mt-1">⚠ Add categories in Categories menu first.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">Description *</label>
              <textarea rows={3} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 focus:border-brand-yellow text-slate-100 outline-none resize-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">Detail Description (longer text)</label>
              <textarea rows={5} value={editing.detail_description || ""} onChange={(e) => setEditing({ ...editing, detail_description: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 focus:border-brand-yellow text-slate-100 outline-none resize-none" />
            </div>

            {isPropertyCategory(editing.category) && (
              <div className="rounded-2xl border border-brand-yellow/30 bg-brand-yellow/5 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase text-brand-yellow">Property & Maintenance</p>
                    <p className="text-xs text-slate-400">Custom room inventory</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Total Rooms"
                    value={String(editing.property_details?.total_rooms ?? 0)}
                    onChange={(v) => setEditing({
                      ...editing,
                      property_details: {
                        ...createDefaultPropertyDetails(),
                        ...(editing.property_details ?? {}),
                        total_rooms: Number(v || 0),
                      },
                    })}
                  />
                  <NumberField
                    label="Available"
                    value={String(editing.property_details?.available_rooms ?? 0)}
                    onChange={(v) => setEditing({
                      ...editing,
                      property_details: {
                        ...createDefaultPropertyDetails(),
                        ...(editing.property_details ?? {}),
                        available_rooms: Number(v || 0),
                      },
                    })}
                  />
                </div>

                <Field
                  label="Headline"
                  value={editing.property_details?.headline ?? ""}
                  onChange={(v) => setEditing({
                    ...editing,
                    property_details: {
                      ...createDefaultPropertyDetails(),
                      ...(editing.property_details ?? {}),
                      headline: v,
                    },
                  })}
                  placeholder="Property overview"
                />

                <div>
                  <label className="block text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">Overview</label>
                  <textarea
                    rows={3}
                    value={editing.property_details?.description ?? ""}
                    onChange={(e) => setEditing({
                      ...editing,
                      property_details: {
                        ...createDefaultPropertyDetails(),
                        ...(editing.property_details ?? {}),
                        description: e.target.value,
                      },
                    })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 focus:border-brand-yellow text-slate-100 outline-none resize-none"
                    placeholder="Short description about the property"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">Info text</label>
                  <textarea
                    rows={2}
                    value={editing.property_details?.info_text ?? ""}
                    onChange={(e) => setEditing({
                      ...editing,
                      property_details: {
                        ...createDefaultPropertyDetails(),
                        ...(editing.property_details ?? {}),
                        info_text: e.target.value,
                      },
                    })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 focus:border-brand-yellow text-slate-100 outline-none resize-none"
                    placeholder="Extra notes or service message"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold tracking-widest uppercase text-slate-400">Rooms</p>
                    <button
                      type="button"
                      onClick={() => setEditing({
                        ...editing,
                        property_rooms: [...(editing.property_rooms ?? []), createDefaultPropertyRoom()],
                      })}
                      className="px-2.5 py-1.5 rounded-lg bg-brand-yellow text-[#030c17] text-[10px] font-bold"
                    >
                      + Add room
                    </button>
                  </div>

                  {(editing.property_rooms ?? []).map((room, index) => (
                    <div key={`${room.room_number || "room"}-${index}`} className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Field
                          label="Room #"
                          value={room.room_number || ""}
                          onChange={(v) => setEditing({
                            ...editing,
                            property_rooms: (editing.property_rooms ?? []).map((item, i) => i === index ? { ...item, room_number: v } : item),
                          })}
                        />
                        <Field
                          label="Room name"
                          value={room.room_name || ""}
                          onChange={(v) => setEditing({
                            ...editing,
                            property_rooms: (editing.property_rooms ?? []).map((item, i) => i === index ? { ...item, room_name: v } : item),
                          })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">Status</label>
                          <select
                            value={room.status || "available"}
                            onChange={(e) => setEditing({
                              ...editing,
                              property_rooms: (editing.property_rooms ?? []).map((item, i) => i === index ? { ...item, status: e.target.value as "available" | "booked" | "maintenance" } : item),
                            })}
                            className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 focus:border-brand-yellow text-slate-100 outline-none"
                          >
                            <option value="available">Available</option>
                            <option value="booked">Booked</option>
                            <option value="maintenance">Maintenance</option>
                          </select>
                        </div>
                        <Field
                          label="Price"
                          value={room.price || ""}
                          onChange={(v) => setEditing({
                            ...editing,
                            property_rooms: (editing.property_rooms ?? []).map((item, i) => i === index ? { ...item, price: v } : item),
                          })}
                          placeholder="Rp 1.500.000"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">Image ID / URL</label>
                        <input
                          type="text"
                          value={room.image_url || ""}
                          onChange={(e) => setEditing({
                            ...editing,
                            property_rooms: (editing.property_rooms ?? []).map((item, i) => i === index ? {
                              ...item,
                              image_url: e.target.value,
                            } : item),
                          })}
                          className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 focus:border-brand-yellow text-slate-100 outline-none"
                          placeholder="1hVTn9QPmGaHxuONSukBioVEdgsSLXJcw atau https://drive.google.com/..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">Note</label>
                        <textarea
                          rows={2}
                          value={room.note || ""}
                          onChange={(e) => setEditing({
                            ...editing,
                            property_rooms: (editing.property_rooms ?? []).map((item, i) => i === index ? { ...item, note: e.target.value } : item),
                          })}
                          className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 focus:border-brand-yellow text-slate-100 outline-none resize-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditing({
                          ...editing,
                          property_rooms: (editing.property_rooms ?? []).filter((_, i) => i !== index),
                        })}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove room
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">Icon</label>
                <select value={editing.icon || "Code2"} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-slate-100 outline-none">
                  {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <Field label="Hill Color" value={editing.hill_color || ""} onChange={(v) => setEditing({ ...editing, hill_color: v })} placeholder="#65a30d" />
            </div>
            <Field label="Sky Gradient (Tailwind)" value={editing.sky_grad || ""} onChange={(v) => setEditing({ ...editing, sky_grad: v })} placeholder="from-sky-100 to-sky-300" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sheep X" value={String(editing.sheep_x ?? 50)} onChange={(v) => setEditing({ ...editing, sheep_x: Number(v) })} />
              <Field label="Sheep Y" value={String(editing.sheep_y ?? 130)} onChange={(v) => setEditing({ ...editing, sheep_y: Number(v) })} />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={() => setEditing(null)} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-medium">Cancel</button>
            <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-brand-yellow text-[#030c17] font-bold flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Save</button>
          </div>
        </Modal>
      )}

      {/* Gallery Manager Modal */}
      {galleryService && <GalleryModal service={galleryService} onClose={() => setGalleryService(null)} onUpdate={load} />}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#0a1729] border border-slate-800 rounded-2xl p-6 overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 focus:border-brand-yellow text-slate-100 outline-none" />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">{label}</label>
      <input type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 focus:border-brand-yellow text-slate-100 outline-none" />
    </div>
  );
}

function GalleryModal({ service, onClose, onUpdate }: { service: Service; onClose: () => void; onUpdate: () => void }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [localGallery, setLocalGallery] = useState(service.gallery || []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localGallery.length >= 3) {
      alert("Maximum 3 images per service");
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const upRes = await fetch("/api/upload", { method: "POST", body: fd });
    const upData = await upRes.json();
    if (upRes.ok && upData.url) {
      const res = await fetch(`/api/services/${service.id}/gallery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: upData.url }),
      });
      if (res.ok) {
        const refresh = await fetch(`/api/services/${service.id}`).then((r) => r.json());
        setLocalGallery(refresh.gallery);
        onUpdate();
      }
    } else {
      alert(upData.error || "Upload failed");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (imageId: number) => {
    if (!confirm("Delete this image?")) return;
    const res = await fetch(`/api/services/${service.id}/gallery?imageId=${imageId}`, { method: "DELETE" });
    if (res.ok) {
      setLocalGallery((prev) => prev.filter((g) => g.id !== imageId));
      onUpdate();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#0a1729] border border-slate-800 rounded-2xl p-6">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
        <h2 className="text-xl font-bold text-white mb-2">Gallery — {service.name}</h2>
        <p className="text-sm text-slate-500 mb-4">Max 3 images · {localGallery.length}/3</p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {localGallery.map((img) => (
            <div key={img.id} className="relative group rounded-xl overflow-hidden border border-slate-700 aspect-video">
              <img src={img.image_url} className="w-full h-full object-cover" />
              <button onClick={() => handleDelete(img.id)} className="absolute top-1 right-1 p-1.5 rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {localGallery.length < 3 && (
            <label className="aspect-video rounded-xl border-2 border-dashed border-slate-700 hover:border-brand-yellow flex flex-col items-center justify-center text-slate-500 hover:text-brand-yellow cursor-pointer transition-colors">
              <Upload className="w-6 h-6 mb-1" />
              <span className="text-xs">{uploading ? "Uploading..." : "Upload"}</span>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          )}
        </div>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 font-medium">Done</button>
      </div>
    </div>
  );
}
