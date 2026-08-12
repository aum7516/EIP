"use client";
import React, { useState, useEffect } from "react";
import { TransactionRecord } from "@/lib/datamart/sampleData";
import { runExplorerQuery, SemanticMetricModel } from "@/lib/datamart/datamartEngine";
import { BarChart, Bar, LineChart as ReLineChart, Line, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Sliders, Play, BarChart2, LineChart, PieChart, Table as TableIcon } from "lucide-react";

interface AnalyticsExplorerProps {
  records: TransactionRecord[];
  semanticModel?: SemanticMetricModel;
}

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#ef4444", "#14b8a6"];

export default function AnalyticsExplorer({ records, semanticModel }: AnalyticsExplorerProps) {
  const [dimension, setDimension] = useState<string>("category");
  const [metric, setMetric] = useState<string>("revenue");
  const [aggregation, setAggregation] = useState<"SUM" | "AVG" | "COUNT" | "MIN" | "MAX">("SUM");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState<number>(10);
  const [chartType, setChartType] = useState<"Bar" | "Line" | "Pie" | "Table">("Bar");

  const [queryResult, setQueryResult] = useState<{ label: string; value: number }[]>([]);

  const availableMetrics = [
    { key: "revenue", label: "Revenue", isAvail: semanticModel ? semanticModel.revenue.status !== "UNAVAILABLE" : true },
    { key: "profit", label: "Profit", isAvail: semanticModel ? semanticModel.profit.status !== "UNAVAILABLE" : true },
    { key: "quantity", label: "Quantity", isAvail: semanticModel ? semanticModel.unitsSold.status !== "UNAVAILABLE" : true },
    { key: "unit_price", label: "Unit Price", isAvail: semanticModel ? semanticModel.unitPrice.status !== "UNAVAILABLE" : true },
    { key: "discount", label: "Discount %", isAvail: semanticModel ? semanticModel.discount.status !== "UNAVAILABLE" : true }
  ].filter(m => m.isAvail);

  useEffect(() => {
    if (availableMetrics.length > 0 && !availableMetrics.some(m => m.key === metric)) {
      setMetric(availableMetrics[0].key);
    }
  }, [availableMetrics, metric]);

  const handleRunAnalysis = () => {
    const res = runExplorerQuery(records, dimension, metric, aggregation, sortDir, limit);
    setQueryResult(res);
  };

  useEffect(() => {
    handleRunAnalysis();
  }, [records, dimension, metric, aggregation, sortDir, limit]);

  const fmtVal = (val: number) => {
    if (metric === "revenue" || metric === "profit" || metric === "unit_price") {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
      return `₹${val.toLocaleString()}`;
    }
    return val.toLocaleString();
  };

  return (
    <div className="glass-card" style={{ padding: 26, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sliders size={18} color="#60a5fa" />
          </div>
          <div>
            <h2 className="font-heading" style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary)" }}>
              Custom Analytics Builder
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
              Construct ad-hoc queries, aggregation functions, and custom multi-dimensional visualizations
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={handleRunAnalysis} style={{ fontSize: 13, padding: "9px 18px" }}>
          <Play size={14} fill="currentColor" />
          <span>Execute Query</span>
        </button>
      </div>

      {/* Query Configuration Toolbar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: 6 }}>
            Dimension Breakdown
          </label>
          <select className="input-field" value={dimension} onChange={e => setDimension(e.target.value)} style={{ fontSize: 12, padding: "8px 10px" }}>
            <option value="category">Category</option>
            <option value="region">Region</option>
            <option value="product">Product</option>
            <option value="customer_type">Customer Type</option>
            <option value="payment_method">Payment Method</option>
            <option value="salesperson">Salesperson</option>
            <option value="date">Date (Month)</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: 6 }}>
            Target Metric
          </label>
          <select className="input-field" value={metric} onChange={e => setMetric(e.target.value)} style={{ fontSize: 12, padding: "8px 10px" }}>
            {availableMetrics.map(m => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: 6 }}>
            Aggregation Math
          </label>
          <select className="input-field" value={aggregation} onChange={e => setAggregation(e.target.value as any)} style={{ fontSize: 12, padding: "8px 10px" }}>
            <option value="SUM">SUM (Total)</option>
            <option value="AVG">AVG (Average)</option>
            <option value="COUNT">COUNT (Volume)</option>
            <option value="MIN">MIN (Minimum)</option>
            <option value="MAX">MAX (Maximum)</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: 6 }}>
            Sort Order
          </label>
          <select className="input-field" value={sortDir} onChange={e => setSortDir(e.target.value as any)} style={{ fontSize: 12, padding: "8px 10px" }}>
            <option value="desc">Descending (High to Low)</option>
            <option value="asc">Ascending (Low to High)</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: 6 }}>
            Row Limit
          </label>
          <select className="input-field" value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ fontSize: 12, padding: "8px 10px" }}>
            <option value={5}>Top 5 Rows</option>
            <option value={10}>Top 10 Rows</option>
            <option value={20}>Top 20 Rows</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: 6 }}>
            Chart Type
          </label>
          <select className="input-field" value={chartType} onChange={e => setChartType(e.target.value as any)} style={{ fontSize: 12, padding: "8px 10px" }}>
            <option value="Bar">Bar Chart</option>
            <option value="Line">Line Chart</option>
            <option value="Pie">Pie Chart</option>
            <option value="Table">Tabular View</option>
          </select>
        </div>
      </div>

      {/* Rendered Visualization */}
      <div style={{ background: "rgba(13, 17, 26, 0.8)", padding: 20, borderRadius: 12, border: "1px solid var(--border)" }}>
        {queryResult.length > 0 ? (
          chartType === "Bar" ? (
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={queryResult} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={fmtVal} />
                <Tooltip contentStyle={{ background: "#0d111a", border: "1px solid rgba(255, 255, 255, 0.25)", borderRadius: 10, color: "#ffffff" }} formatter={(v: any) => [fmtVal(Number(v)), metric.toUpperCase()]} />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                  {queryResult.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : chartType === "Line" ? (
            <ResponsiveContainer width="100%" height={270}>
              <ReLineChart data={queryResult} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={fmtVal} />
                <Tooltip contentStyle={{ background: "#0d111a", border: "1px solid rgba(255, 255, 255, 0.25)", borderRadius: 10, color: "#ffffff" }} formatter={(v: any) => [fmtVal(Number(v)), metric.toUpperCase()]} />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: "#10b981" }} />
              </ReLineChart>
            </ResponsiveContainer>
          ) : chartType === "Pie" ? (
            <ResponsiveContainer width="100%" height={270}>
              <RePieChart>
                <Pie data={queryResult} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={95} stroke="rgba(18, 22, 34, 0.9)" strokeWidth={2}>
                  {queryResult.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0d111a", border: "1px solid rgba(255, 255, 255, 0.25)", borderRadius: 10, color: "#ffffff" }} formatter={(v: any) => [fmtVal(Number(v)), metric.toUpperCase()]} />
              </RePieChart>
            </ResponsiveContainer>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th style={{ textTransform: "capitalize" }}>{dimension}</th>
                  <th style={{ textAlign: "right" }}>{aggregation}({metric})</th>
                </tr>
              </thead>
              <tbody>
                {queryResult.map((r, i) => (
                  <tr key={i}>
                    <td className="font-mono" style={{ color: "var(--text-muted)" }}>#{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{r.label}</td>
                    <td className="font-mono" style={{ textAlign: "right", fontWeight: 700, color: "#60a5fa" }}>{fmtVal(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>No query results match current query parameters</div>
        )}
      </div>
    </div>
  );
}
