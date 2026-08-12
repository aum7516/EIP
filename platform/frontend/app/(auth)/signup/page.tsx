"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { saveAuth } from "@/lib/auth";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("analyst");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const data = await api.signup(email, password, role);
      saveAuth(data);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="fade-in" style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px", background: "linear-gradient(135deg, #4f8ef7, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color: "white", boxShadow: "0 8px 24px rgba(79,142,247,0.35)" }}>O</div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>Create your account</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 6 }}>Join EIP: Enterprise Intelligence Platform</p>
        </div>
        <div className="glass-card" style={{ padding: 32 }}>
          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Email</label>
              <input id="signup-email" type="email" className="input-field" placeholder="you@eip.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Password</label>
              <input id="signup-password" type="password" className="input-field" placeholder="��������" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Role</label>
              <select id="signup-role" className="input-field" value={role} onChange={e => setRole(e.target.value)} style={{ appearance: "none" }}>
                <option value="analyst">Analyst</option>
                <option value="admin">Admin</option>
                <option value="customer">Customer</option>
              </select>
            </div>
            {error && <div style={{ color: "var(--accent-red)", fontSize: 13, background: "rgba(239,68,68,0.1)", padding: "10px 14px", borderRadius: 8 }}>{error}</div>}
            <button id="signup-submit" type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? "Creating account..." : "Create Account ?"}
            </button>
          </form>
          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--accent-blue)", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
