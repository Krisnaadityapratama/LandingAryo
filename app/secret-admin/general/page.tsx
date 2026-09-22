"use client";

import { useEffect, useState, useRef } from "react";
import { Save, CheckCircle, AlertCircle, Upload, Trash2, User } from "lucide-react";

interface GeneralData {
  status_note: string;
  about_name: string;
  about_title: string;
  about_description: string;
  contact_email: string;
  contact_linkedin: string;
  contact_whatsapp: string;
  about_image_url: string;
}

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
    // fallback below
  }

  return raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const formatRoles = (roles: string[]) => JSON.stringify(roles.map((item) => item.trim()).filter(Boolean));

export default function GeneralPage() {
  const [data, setData] = useState<GeneralData>({
    status_note: "",
    about_name: "",
    about_title: "",
    about_description: "",
    contact_email: "",
    contact_linkedin: "",
    contact_whatsapp: "",
    about_image_url: "",
  });
  const [roles, setRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ============================================================
  // LOAD DATA
  // ============================================================
  useEffect(() => {
    fetch("/api/general")
      .then((r) => r.json())
      .then((d) => {
        const nextTitle = d?.about_title ?? "";
        setData({
          status_note: d?.status_note ?? "",
          about_name: d?.about_name ?? "",
          about_title: nextTitle,
          about_description: d?.about_description ?? "",
          contact_email: d?.contact_email ?? "",
          contact_linkedin: d?.contact_linkedin ?? "",
          contact_whatsapp: d?.contact_whatsapp ?? "",
          about_image_url: d?.about_image_url ?? "",
        });
        setRoles(parseRoles(nextTitle));
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load:", error);
        setLoading(false);
      });
  }, []);

  // ============================================================
  // HANDLE SAVE
  // ============================================================
  const handleRoleAdd = () => {
    const value = newRole.trim();
    if (!value) return;

    setRoles((prev) => {
      const normalized = prev.map((item) => item.trim());
      if (normalized.includes(value)) {
        return normalized;
      }
      return [...normalized, value];
    });
    setNewRole("");
  };

  const handleRoleRemove = (index: number) => {
    setRoles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    const payload = {
      ...data,
      about_title: formatRoles(roles),
    };
    
    try {
      const res = await fetch("/api/general", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        const updated = await res.json();
        setData({
          ...data,
          ...updated,
          about_title: updated.about_title ?? formatRoles(roles),
        });
        setStatus({ type: "success", message: "Saved successfully!" });
      } else {
        const err = await res.json();
        setStatus({ type: "error", message: err.error || "Failed to save" });
      }
    } catch {
      setStatus({ type: "error", message: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // HANDLE IMAGE UPLOAD
  // ============================================================
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setStatus({ type: "error", message: "Invalid format. Use JPEG, PNG, WEBP, or GIF." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus({ type: "error", message: "File too large. Max 5MB." });
      return;
    }

    setUploading(true);
    setStatus(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const result = await res.json();

      if (res.ok && result.url) {
        setData({ ...data, about_image_url: result.url });
        setStatus({ type: "success", message: "Image uploaded! Click Save to apply." });
      } else {
        setStatus({ type: "error", message: result.error || "Upload failed" });
      }
    } catch {
      setStatus({ type: "error", message: "Upload error" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ============================================================
  // HANDLE IMAGE REMOVE
  // ============================================================
  const handleRemoveImage = () => {
    if (!confirm("Remove About Me image? Will fallback to default SVG.")) return;
    setData({ ...data, about_image_url: "" });
    setStatus({ type: "success", message: "Image removed. Click Save to apply." });
  };

  if (loading) return <div className="p-8 text-slate-500">Loading...</div>;

  return (
    <div className="p-8 lg:p-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-white mb-1">General Settings</h1>
      <p className="text-slate-500 text-sm mb-8">Manage About Me, image, and contact links.</p>

      <form onSubmit={handleSave} className="space-y-6 bg-[#0a1729] border border-slate-800 rounded-2xl p-6">
        
        {status && (
          <div className={`flex items-center space-x-2 p-3 rounded-xl text-sm border ${
            status.type === "success" 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
              : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}>
            {status.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{status.message}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION: Status Note */}
        {/* ============================================================ */}
        <div>
          <label className="block text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">
            Status Note (max 60 chars){" "}
            <span className="text-slate-600">— {data.status_note.length}/60</span>
          </label>
          <input
            type="text"
            value={data.status_note}
            maxLength={60}
            onChange={(e) => setData({ ...data, status_note: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 focus:border-brand-yellow text-slate-100 outline-none"
            placeholder="Available for freelance work"
          />
        </div>

        {/* ============================================================ */}
        {/* SECTION: About Me - IMAGE */}
        {/* ============================================================ */}
        <div className="border-t border-slate-800 pt-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">About Me Image</h2>
          
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Preview */}
            <div className="shrink-0">
              <div className="relative w-40 h-40 rounded-2xl overflow-hidden border-2 border-slate-700 bg-gradient-to-b from-[#e0f0ff] to-[#60a5fa]">
                {data.about_image_url ? (
                  <>
                    <img 
                      src={data.about_image_url} 
                      alt="About me preview" 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-1 right-1 p-1.5 rounded-full bg-red-500/90 text-white hover:bg-red-500 transition-colors"
                      title="Remove image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                    <User className="w-12 h-12 mb-1" />
                    <p className="text-[10px] uppercase tracking-wider">SVG Fallback</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload controls */}
            <div className="flex-1 space-y-2">
              <p className="text-xs text-slate-400">
                Upload image untuk section Who I Am. Disarankan format kotak (1:1), minimal 400x400px.
              </p>
              <p className="text-[10px] text-slate-500">
                Format: JPEG, PNG, WEBP, GIF · Max 5MB
              </p>
              <div className="flex gap-2 pt-2">
                <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-yellow hover:bg-brand-yellow-dark text-[#030c17] font-bold cursor-pointer text-sm transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? "Uploading..." : data.about_image_url ? "Replace Image" : "Upload Image"}</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION: About Me - TEXT */}
        {/* ============================================================ */}
        <div className="border-t border-slate-800 pt-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">About Me</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">Name</label>
              <input
                type="text"
                value={data.about_name}
                onChange={(e) => setData({ ...data, about_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 focus:border-brand-yellow text-slate-100 outline-none"
                placeholder="Aryo"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">Title / Role</label>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 min-h-[44px]">
                  {roles.length > 0 ? (
                    roles.map((role, index) => (
                      <button
                        key={`${role}-${index}`}
                        type="button"
                        onClick={() => handleRoleRemove(index)}
                        className="inline-flex items-center gap-2 rounded-full border border-brand-yellow/40 bg-brand-yellow/10 px-3 py-1.5 text-sm text-brand-yellow hover:bg-brand-yellow/20 transition-colors"
                        title="Klik untuk hapus role"
                      >
                        <span>{role}</span>
                        <span className="text-xs">×</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Belum ada role. Tambahkan role pertama.</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleRoleAdd();
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 focus:border-brand-yellow text-slate-100 outline-none"
                    placeholder="Web Developer"
                  />
                  <button
                    type="button"
                    onClick={handleRoleAdd}
                    className="px-4 py-3 rounded-xl bg-brand-yellow hover:bg-brand-yellow-dark text-[#030c17] font-bold transition-colors"
                  >
                    Add
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  Bisa menambah lebih dari satu role. Role akan berganti otomatis di halaman utama seperti efek ketikan.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">
                Description (pisahkan paragraf dengan baris kosong)
              </label>
              <textarea
                rows={8}
                value={data.about_description}
                onChange={(e) => setData({ ...data, about_description: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 focus:border-brand-yellow text-slate-100 outline-none resize-none"
                placeholder="I am a multi-talented..."
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION: Contact Links */}
        {/* ============================================================ */}
        <div className="border-t border-slate-800 pt-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Contact Links</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">Email URL</label>
              <input
                type="text"
                value={data.contact_email}
                onChange={(e) => setData({ ...data, contact_email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 focus:border-brand-yellow text-slate-100 outline-none"
                placeholder="mailto:you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">LinkedIn URL</label>
              <input
                type="text"
                value={data.contact_linkedin}
                onChange={(e) => setData({ ...data, contact_linkedin: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 focus:border-brand-yellow text-slate-100 outline-none"
                placeholder="https://linkedin.com/in/yourname"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">WhatsApp Number</label>
              <input
                type="text"
                value={data.contact_whatsapp}
                onChange={(e) => setData({ ...data, contact_whatsapp: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 focus:border-brand-yellow text-slate-100 outline-none"
                placeholder="+6281234567890"
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SUBMIT */}
        {/* ============================================================ */}
        <div className="border-t border-slate-800 pt-6 flex gap-2">
          <button
            type="submit"
            disabled={saving || uploading}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-brand-yellow hover:bg-brand-yellow-dark disabled:bg-slate-700 text-[#030c17] font-bold active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
          
          {data.about_image_url && !saving && (
            <span className="text-xs text-amber-400 self-center ml-2">
              ⚠ Klik Save untuk apply perubahan image
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
