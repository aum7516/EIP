"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function DashboardPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = typeof window !== "undefined" ? getAuth() : null;

  useEffect(() => {
    Promise.all([api.getKPIs(), api.getBacktestHistory()]).then(([k, h]) => {
      setKpis(k); setHistory(h);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="fade-in">
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)" }}>
              Welcome back{auth?.email ? `, ${auth.email.split("@")[0]}` : ""} 👋
            </h1>
            <p style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: 14 }}>
              EIP Unified Dashboard &mdash; All modules in one view
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="badge badge-green">🟢 Platform Live</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Total Revenue", value: loading ? "..." : kpis?.total_revenue ? formatCurrency(kpis.total_revenue) : "—", change: "+12.4%", up: true, icon: "💰" },
          { label: "Total Orders", value: loading ? "..." : kpis?.order_count?.toLocaleString() ?? "—", change: "+8.1%", up: true, icon: "📦" },
          { label: "Top Category", value: loading ? "..." : kpis?.top_category?.name ?? "—", change: kpis?.top_category?.revenue ? formatCurrency(kpis.top_category.revenue) : "", up: true, icon: "🏆" },
          { label: "Backtest Runs", value: loading ? "..." : history.length.toString(), change: `${history.filter(r => r.bias_check_passed).length} bias-clean`, up: true, icon: "📈" },
        ].map((kpi, i) => (
          <div key={i} className="kpi-card fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{kpi.icon}</div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
            {kpi.change && <div className={`kpi-change ${kpi.up ? "up" : "down"}`}>↑ {kpi.change}</div>}
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 20 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Revenue Trend</h2>
          {kpis?.monthly_trend?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={kpis.monthly_trend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)" }} />
                <Area type="monotone" dataKey="revenue" stroke="#4f8ef7" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>
              {loading ? <div className="spinner" /> : "No data yet — run a DataMart ingest"}
            </div>
          )}
        </div>

        {/* Region breakdown */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Revenue by Region</h2>
          {kpis?.region_breakdown?.length ? kpis.region_breakdown.map((r: any, i: number) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                <span style={{ color: "var(--text-secondary)" }}>{r.region}</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatCurrency(r.revenue)}</span>
              </div>
              <div style={{ height: 4, background: "var(--border-subtle)", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${Math.min(100, (r.revenue / kpis.region_breakdown[0].revenue) * 100)}%`, background: "linear-gradient(90deg, #4f8ef7, #7c3aed)", borderRadius: 2, transition: "width 0.8s ease" }} />
              </div>
            </div>
          )) : (
            <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", marginTop: 40 }}>No regional data</div>
          )}
        </div>
      </div>

      {/* Recent Backtests */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Backtest Runs</h2>
        {history.length ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "var(--text-muted)", textAlign: "left" }}>
                {["Ticker", "Status", "Bias Check", "CAGR", "Sharpe", "Date"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)", fontWeight: 600, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 5).map((r: any) => (
                <tr key={r.run_id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "12px 12px", fontWeight: 600 }}>{r.ticker}</td>
                  <td style={{ padding: "12px 12px" }}><span className={`badge ${r.status === "completed" ? "badge-green" : r.status === "running" ? "badge-blue" : "badge-red"}`}>{r.status}</span></td>
                  <td style={{ padding: "12px 12px" }}>{r.bias_check_passed ? <span className="badge badge-green">✅ Clean</span> : <span className="badge badge-red">❌ Failed</span>}</td>
                  <td style={{ padding: "12px 12px", color: r.cagr > 0 ? "var(--accent-green)" : "var(--accent-red)" }}>{r.cagr != null ? `${r.cagr.toFixed(2)}%` : "—"}</td>
                  <td style={{ padding: "12px 12px" }}>{r.sharpe_ratio != null ? r.sharpe_ratio.toFixed(2) : "—"}</td>
                  <td style={{ padding: "12px 12px", color: "var(--text-muted)" }}>{r.created_at?.slice(0, 10) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px 0", fontSize: 14 }}>
            No backtest runs yet — <a href="/backtesting" style={{ color: "var(--accent-blue)" }}>Run your first strategy →</a>
          </div>
        )}
      </div>
    </div>
  );
}
