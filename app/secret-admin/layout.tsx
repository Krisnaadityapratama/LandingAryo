"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Home, Settings, Briefcase, FolderKanban, Award,
  MessageSquare, LogOut, Shield, Tags, Menu, X
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/secret-admin/login";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Tutup sidebar setiap pindah halaman
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Lock scroll body saat sidebar terbuka di mobile
  useEffect(() => {
    if (isSidebarOpen && !isLoginPage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen, isLoginPage]);

  // Tutup dengan tombol ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSidebarOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/secret-admin/login");
  };

  if (isLoginPage) {
    return <div className="min-h-screen bg-[#030c17]">{children}</div>;
  }

  const menuItems = [
    { href: "/secret-admin", label: "Dashboard", icon: Home },
    { href: "/secret-admin/general", label: "General", icon: Settings },
    { href: "/secret-admin/services", label: "Services", icon: Briefcase },
    { href: "/secret-admin/projects", label: "Projects", icon: FolderKanban },
    { href: "/secret-admin/pub-cer", label: "Pub & Cer", icon: Award },
    { href: "/secret-admin/categories", label: "Categories", icon: Tags },
    { href: "/secret-admin/messages", label: "Messages", icon: MessageSquare },
  ];

  return (
    <div className="flex min-h-screen bg-[#030c17]">
      {/* Overlay hitam (mobile only) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-[#050b14] border-r border-slate-800
          flex flex-col shrink-0
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-yellow/10 border border-brand-yellow/30">
            <Shield className="w-5 h-5 text-brand-yellow" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white">Admin Panel</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">
              Aryo Portfolio
            </p>
          </div>
          {/* Tombol close (mobile only) */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            // Highlight parent route juga saat di sub-route
            const isActive =
              pathname === item.href ||
              (item.href !== "/secret-admin" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-brand-yellow text-[#030c17] shadow-lg shadow-brand-yellow/10"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="m-4 flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </aside>

      {/* KONTEN UTAMA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar mobile */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-[#050b14]/90 backdrop-blur border-b border-slate-800">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-yellow" />
            <span className="text-sm font-semibold text-white">Admin Panel</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
