"use client";
import React, { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, DollarSign, Layers, ShoppingBag } from "lucide-react";

interface RevenueTrendProps {
  data: { month: string; revenue: number; profit: number; quantity: number; transactions: number }[];
}

export default function RevenueTrend({ data }: RevenueTrendProps) {
  const [metric, setMetric] = useState<"revenue" | "profit" | "quantity" | "transactions">("revenue");

  const fmtVal = (val: number) => {
    if (metric === "revenue" || metric === "profit") {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
      return `₹${(val / 1000).toFixed(0)}k`;
    }
    return val.toLocaleString();
  };

  const getMetricColor = () => {
    switch (metric) {
      case "profit": return "#10b981";
      case "quantity": return "#f59e0b";
      case "transactions": return "#8b5cf6";
      default: return "#3b82f6";
    }
  };

  const color = getMetricColor();

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={18} color="#60a5fa" />
          </div>
          <div>
            <h3 className="font-heading" style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
              Monthly Performance Trajectory
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              Temporal breakdown over the active dataset period
            </p>
          </div>
        </div>

        {/* Metric Segmented Switcher */}
        <div style={{ display: "flex", gap: 4, background: "rgba(13, 17, 26, 0.8)", padding: 4, borderRadius: 10, border: "1px solid var(--border)" }}>
          {(["revenue", "profit", "quantity", "transactions"] as const).map(m => {
            const active = metric === m;
            return (
              <button
                key={m}
                onClick={() => setMetric(m)}
                style={{
                  fontSize: 11,
                  padding: "5px 12px",
                  borderRadius: 7,
                  border: "none",
                  background: active ? "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" : "transparent",
                  color: active ? "#ffffff" : "var(--text-secondary)",
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  textTransform: "capitalize",
                  transition: "all 0.2s ease"
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={fmtVal} />
            <Tooltip
              contentStyle={{ background: "#0d111a", border: "1px solid rgba(255, 255, 255, 0.25)", borderRadius: 10, fontSize: 12, color: "#ffffff" }}
              formatter={(v: any) => [fmtVal(Number(v)), metric.toUpperCase()]}
            />
            <Area type="monotone" dataKey={metric} stroke={color} strokeWidth={2.5} fill="url(#trendGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
          No monthly data available for active filters
        </div>
      )}
    </div>
  );
}
