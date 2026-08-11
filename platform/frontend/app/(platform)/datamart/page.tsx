"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";

const COLORS = ["#4f8ef7","#3ecf8e","#a855f7","#f59e0b","#ef4444"];

export default function DataMartPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<"trend"|"region">("trend");
  const [filterState, setFilterState] = useState({ dateFrom: "", dateTo: "", region: "", metric: "sum_revenue", groupBy: "transaction_date" });
  const [filterData, setFilterData] = useState<any[]>([]);
  const [filtering, setFiltering] = useState(false);
  const [nlQuestion, setNlQuestion] = useState("");
  const [nlResult, setNlResult] = useState<any>(null);
  const [nlLoading, setNlLoading] = useState(false);

  useEffect(() => {
    api.getKPIs().then(k => { setKpis(k); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const fmt = (v: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

  async function applyFilter() {
    setFiltering(true);
    try {
      const res = await api.filterData({
        date_from: filterState.dateFrom || undefined,
        date_to: filterState.dateTo || undefined,
        region: filterState.region || undefined,
        metric: filterState.metric,
        group_by: filterState.groupBy
      });
      setFilterData(res.data || []);
    } catch (e: any) { console.error(e); }
    setFiltering(false);
  }

  async function askQuestion() {
    if (!nlQuestion.trim()) return;
    setNlLoading(true); setNlResult(null);
    try {
      const res = await api.askNL(nlQuestion);
      setNlResult(res);
    } catch (e: any) { setNlResult({ answer_text: e.message }); }
    setNlLoading(false);
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>DataMart Analytics</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: 14 }}>
          EIP transactional intelligence — filter, explore, and ask questions in natural language
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
        {loading ? Array(4).fill(0).map((_, i) => (
          <div key={i} className="kpi-card" style={{ height: 100, background: "var(--bg-card-hover)" }} />
        )) : [
          { label: "Total Revenue", value: fmt(kpis?.total_revenue || 0), icon: "??", color: "var(--accent-green)" },
          { label: "Total Orders", value: (kpis?.order_count || 0).toLocaleString(), icon: "??", color: "var(--accent-blue)" },
          { label: "Top Category", value: kpis?.top_category?.name || "—", icon: "??", color: "var(--accent-amber)" },
          { label: "Top Region Rev.", value: kpis?.region_breakdown?.[0] ? fmt(kpis.region_breakdown[0].revenue) : "—", icon: "???", color: "var(--accent-purple)" },
        ].map((k, i) => (
          <div key={i} className="kpi-card fade-in" style={{ animationDelay: `${i * 0.07}s` }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
            <div className="kpi-value" style={{ fontSize: 22, color: k.color }}>{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20, marginBottom: 28 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>Revenue Analysis</h2>
            {["trend","region"].map(t => (
              <button key={t} onClick={() => setActiveChart(t as any)}
                className={activeChart === t ? "btn-primary" : "btn-secondary"}
                style={{ fontSize: 12, padding: "6px 14px" }}>
                {t === "trend" ? "Monthly Trend" : "By Region"}
              </button>
            ))}
          </div>
          {activeChart === "trend" && kpis?.monthly_trend?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={kpis.monthly_trend}>
                <defs><linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.25}/><stop offset="95%" stopColor="#4f8ef7" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: any) => [fmt(v), "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="#4f8ef7" strokeWidth={2} fill="url(#gr)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : activeChart === "region" && kpis?.region_breakdown?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={kpis.region_breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="region" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: any) => [fmt(v), "Revenue"]} />
                <Bar dataKey="revenue" fill="#4f8ef7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              {loading ? <div className="spinner" /> : "No data loaded"}
            </div>
          )}
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Category Mix</h2>
          {kpis?.region_breakdown?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={kpis.region_breakdown} dataKey="revenue" nameKey="region" cx="50%" cy="50%" outerRadius={80} strokeWidth={2} stroke="var(--bg-card)">
                  {kpis.region_breakdown.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: any) => [fmt(v), "Revenue"]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              {loading ? <div className="spinner" /> : "No data"}
            </div>
          )}
        </div>
      </div>

      {/* Filter builder */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Custom Filter Builder</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 16 }}>
          <div><label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>From Date</label>
            <input type="date" className="input-field" value={filterState.dateFrom} onChange={e => setFilterState(s => ({ ...s, dateFrom: e.target.value }))} /></div>
          <div><label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>To Date</label>
            <input type="date" className="input-field" value={filterState.dateTo} onChange={e => setFilterState(s => ({ ...s, dateTo: e.target.value }))} /></div>
          <div><label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Region</label>
            <select className="input-field" value={filterState.region} onChange={e => setFilterState(s => ({ ...s, region: e.target.value }))}>
              <option value="">All Regions</option>
              {["North","South","East","West","Central"].map(r => <option key={r}>{r}</option>)}
            </select></div>
          <div><label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Metric</label>
            <select className="input-field" value={filterState.metric} onChange={e => setFilterState(s => ({ ...s, metric: e.target.value }))}>
              <option value="sum_revenue">Total Revenue</option>
              <option value="count_orders">Order Count</option>
              <option value="avg_order">Avg Order Value</option>
            </select></div>
          <div><label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Group By</label>
            <select className="input-field" value={filterState.groupBy} onChange={e => setFilterState(s => ({ ...s, groupBy: e.target.value }))}>
              <option value="transaction_date">Date</option>
              <option value="region">Region</option>
            </select></div>
        </div>
        <button className="btn-primary" onClick={applyFilter} disabled={filtering}>
          {filtering ? "Querying…" : "Apply Filter ?"}
        </button>
        {filterData.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={filterData.slice(0, 20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="value" fill="#3ecf8e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* NL Query */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Ask a Business Question</h2>
          <span className="badge badge-purple" style={{ background: "var(--accent-purple-glow)", color: "var(--accent-purple)", border: "1px solid rgba(168,85,247,0.2)" }}>
            Shared AI Engine ?
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          Uses the same query engine as the Retail AI Assistant — cross-module integration proof point
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <input className="input-field" placeholder='e.g. "What was total revenue in Q1?" or "Which region performed best?"'
            value={nlQuestion} onChange={e => setNlQuestion(e.target.value)}
            onKeyDown={e => e.key === "Enter" && askQuestion()} />
          <button className="btn-primary" style={{ whiteSpace: "nowrap" }} onClick={askQuestion} disabled={nlLoading}>
            {nlLoading ? <div className="spinner" style={{ display: "inline-block" }} /> : "Ask ?"}
          </button>
        </div>
        {nlResult && (
          <div className="fade-in" style={{ marginTop: 20 }}>
            <div style={{ padding: 16, background: "var(--bg-card-hover)", borderRadius: 10, border: "1px solid var(--border)", marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>
              {nlResult.answer_text}
            </div>
            {nlResult.chart_data?.length > 0 && (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={nlResult.chart_data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="value" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
