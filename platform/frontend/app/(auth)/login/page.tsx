"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { saveAuth } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const data = await api.login(email, password);
      saveAuth(data);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="fade-in" style={{ width: "100%", maxWidth: 420 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
            background: "linear-gradient(135deg, #4f8ef7, #7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 900, color: "white",
            boxShadow: "0 8px 24px rgba(79,142,247,0.35)"
          }}>O</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }}>Welcome to Orbit</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 6 }}>EIP: Enterprise Intelligence Platform</p>
        </div>

        <div className="glass-card" style={{ padding: 32 }}>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Email</label>
              <input id="login-email" type="email" className="input-field" placeholder="you@eip.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Password</label>
              <input id="login-password" type="password" className="input-field" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div style={{ color: "var(--accent-red)", fontSize: 13, background: "rgba(239,68,68,0.1)", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}
            <button id="login-submit" type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <><span className="spinner" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8 }} />Signing in...</> : "Sign In ?"}
            </button>
          </form>
          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text-muted)" }}>
            No account?{" "}
            <Link href="/signup" style={{ color: "var(--accent-blue)", textDecoration: "none", fontWeight: 600 }}>Create one</Link>
          </p>
        </div>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "var(--text-muted)" }}>HACKORBIT · PS-05 · GDG</p>
      </div>
    </div>
  );
}
