"use client";
import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Tag, MousePointerClick } from "lucide-react";

interface CategoryPerformanceProps {
  data: { category: string; revenue: number; profit: number; quantity: number; margin: number }[];
  onSelectCategory?: (category: string) => void;
}

const CATEGORY_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#ef4444"];

export default function CategoryPerformance({ data, onSelectCategory }: CategoryPerformanceProps) {
  const [metric, setMetric] = useState<"revenue" | "profit" | "quantity">("revenue");

  const fmtVal = (val: number) => {
    if (metric === "revenue" || metric === "profit") {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
      return `₹${(val / 1000).toFixed(0)}k`;
    }
    return val.toLocaleString();
  };

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Tag size={18} color="#34d399" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <h3 className="font-heading" style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
                Category Breakdown
              </h3>
              <span className="badge badge-green" style={{ fontSize: 10 }}>
                <MousePointerClick size={11} /> Interactive Drilldown
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              Click any bar to instantly filter product analytics
            </p>
          </div>
        </div>

        {/* Metric Switcher */}
        <div style={{ display: "flex", gap: 4, background: "rgba(13, 17, 26, 0.8)", padding: 4, borderRadius: 10, border: "1px solid var(--border)" }}>
          {(["revenue", "profit", "quantity"] as const).map(m => {
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
                  background: active ? "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)" : "transparent",
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
          <BarChart
            data={data}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload.length && onSelectCategory) {
                onSelectCategory(state.activePayload[0].payload.category);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis dataKey="category" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={fmtVal} />
            <Tooltip
              contentStyle={{ background: "#0d111a", border: "1px solid rgba(255, 255, 255, 0.25)", borderRadius: 10, fontSize: 12, color: "#ffffff" }}
              formatter={(v: any) => [fmtVal(Number(v)), metric.toUpperCase()]}
            />
            <Bar dataKey={metric} radius={[8, 8, 0, 0]} cursor="pointer">
              {data.map((_, i) => (
                <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
          No category data
        </div>
      )}
    </div>
  );
}
