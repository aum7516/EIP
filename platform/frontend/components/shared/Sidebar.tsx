"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, getAuth } from "@/lib/auth";
import { useState, useEffect } from "react";

const NAV = [
  { href: "/dashboard",    icon: "?", label: "Dashboard" },
  { href: "/backtesting",  icon: "??", label: "Backtesting" },
  { href: "/datamart",     icon: "???",  label: "DataMart" },
  { href: "/assistant",    icon: "??", label: "AI Assistant" },
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
      {/* Logo */}
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #4f8ef7, #7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 800, color: "white"
          }}>O</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Orbit</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase" }}>EIP Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 12px" }}>
        {NAV.map(({ href, icon, label }) => {
          const active = path.startsWith(href);
          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", borderRadius: 8, marginBottom: 2,
                background: active ? "var(--accent-blue-glow)" : "transparent",
                border: active ? "1px solid rgba(79,142,247,0.2)" : "1px solid transparent",
                color: active ? "var(--accent-blue)" : "var(--text-secondary)",
                fontWeight: active ? 600 : 400,
                fontSize: 14, cursor: "pointer",
                transition: "all 0.15s"
              }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}}
              >
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span>{label}</span>
                {active && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "var(--accent-blue)" }} />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: "16px", borderTop: "1px solid var(--border-subtle)" }}>
        {user && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            <span className="badge badge-blue" style={{ marginTop: 4 }}>{user.role}</span>
          </div>
        )}
        <button onClick={handleLogout} className="btn-secondary" style={{ width: "100%", fontSize: 13 }}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
