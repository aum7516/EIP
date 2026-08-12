"use client";
import React from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { SemanticMetricModel } from "@/lib/datamart/datamartEngine";
import { BarChart3, AlertCircle } from "lucide-react";

interface ProfitabilityChartProps {
  data: { month: string; revenue: number; profit: number; quantity: number; transactions: number }[];
  semanticModel?: SemanticMetricModel;
}

export default function ProfitabilityChart({ data, semanticModel }: ProfitabilityChartProps) {
  const isProfitAvailable = semanticModel ? semanticModel.profit.status !== "UNAVAILABLE" : true;
  const fmtVal = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    return `₹${(val / 1000).toFixed(0)}k`;
  };

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(6, 182, 212, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BarChart3 size={18} color="#22d3ee" />
        </div>
        <div>
          <h3 className="font-heading" style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
            Profitability Analysis
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            Revenue bar vs Profit line margin trajectory
          </p>
        </div>
      </div>

      {!isProfitAvailable ? (
        <div style={{ height: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(13, 17, 26, 0.8)", borderRadius: 12, border: "1px dashed rgba(239, 68, 68, 0.3)", padding: 20, textAlign: "center" }}>
          <AlertCircle size={32} color="#f87171" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f87171", marginBottom: 4 }}>
            Profitability Metrics Unavailable
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 320 }}>
            The loaded dataset does not contain Cost or Profit columns. Upload a dataset containing cost/profit data to plot profitability.
          </div>
        </div>
      ) : data.length > 0 ? (
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={fmtVal} />
            <Tooltip
              contentStyle={{ background: "#0d111a", border: "1px solid rgba(255, 255, 255, 0.25)", borderRadius: 10, fontSize: 12, color: "#ffffff" }}
              formatter={(v: any, name: any) => [fmtVal(Number(v)), name === "revenue" ? "Revenue" : "Net Profit"]}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }} />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Revenue" />
            <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: "#10b981" }} name="Profit" />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
          No trend data available
        </div>
      )}
    </div>
  );
}
