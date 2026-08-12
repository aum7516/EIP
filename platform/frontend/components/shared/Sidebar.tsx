"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, getAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  TrendingUp,
  Database,
  Bot,
  Sparkles,
  LogOut,
  ShieldCheck,
  ChevronRight
} from "lucide-react";

const NAV = [
  { href: "/dashboard",   icon: LayoutDashboard, label: "Dashboard", badge: "Live" },
  { href: "/backtesting", icon: TrendingUp,      label: "Backtesting", badge: null },
  { href: "/datamart",    icon: Database,        label: "DataMart Engine", badge: "v2.4" },
  { href: "/assistant",   icon: Bot,             label: "AI Assistant", badge: "GPT-4o" },
];

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    const auth = getAuth();
    if (auth) setUser({ email: auth.email, role: auth.role });
  }, []);

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 20px rgba(59, 130, 246, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            position: "relative"
          }}>
            <Sparkles size={22} color="#ffffff" />
            <div style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 8px #10b981"
            }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="font-heading" style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
                Orbit
              </span>
              <span className="badge badge-purple" style={{ fontSize: 10, padding: "1px 6px" }}>
                HACKATHON
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.5px", marginTop: 1 }}>
              Enterprise Intelligence
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", padding: "0 10px 10px" }}>
          Platform Workspace
        </div>
        {NAV.map(({ href, icon: Icon, label, badge }) => {
          const active = path.startsWith(href);
          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 14px",
                  borderRadius: 10,
                  marginBottom: 4,
                  background: active ? "linear-gradient(90deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)" : "transparent",
                  border: active ? "1px solid rgba(59, 130, 246, 0.3)" : "1px solid transparent",
                  color: active ? "#60a5fa" : "var(--text-secondary)",
                  fontWeight: active ? 600 : 500,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  position: "relative"
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.04)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                  }
                }}
              >
                <Icon size={18} color={active ? "#60a5fa" : "var(--text-secondary)"} />
                <span className="font-heading">{label}</span>
                {badge && (
                  <span className={`badge ${active ? "badge-blue" : "badge-cyan"}`} style={{ marginLeft: "auto", fontSize: 10, padding: "1px 6px" }}>
                    {badge}
                  </span>
                )}
                {active && !badge && (
                  <ChevronRight size={14} color="#60a5fa" style={{ marginLeft: "auto" }} />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Footer */}
      <div style={{ padding: "16px", borderTop: "1px solid var(--border)", background: "rgba(7, 9, 14, 0.5)" }}>
        {user && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
            padding: "10px",
            borderRadius: 10,
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border-subtle)"
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "#ffffff"
            }}>
              {user.email.substring(0, 2).toUpperCase()}
            </div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.email}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <ShieldCheck size={12} color="#34d399" />
                <span style={{ fontSize: 10, color: "#34d399", fontWeight: 600, textTransform: "uppercase" }}>
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        )}
        <button onClick={handleLogout} className="btn-secondary" style={{ width: "100%", fontSize: 13, padding: "8px 12px" }}>
          <LogOut size={15} />
          <span>Sign Out Session</span>
        </button>
      </div>
    </aside>
  );
}
