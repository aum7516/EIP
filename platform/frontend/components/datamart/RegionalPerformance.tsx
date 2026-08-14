"use client";
import React, { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Globe } from "lucide-react";

interface RegionalPerformanceProps {
  data: { region: string; revenue: number; profit: number; transactions: number }[];
}

const REGION_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"];

export default function RegionalPerformance({ data }: RegionalPerformanceProps) {
  const [metric, setMetric] = useState<"revenue" | "profit">("revenue");

  const fmtVal = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    return `₹${(val / 1000).toFixed(0)}k`;
  };

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(139, 92, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Globe size={18} color="#c084fc" />
          </div>
          <div>
            <h3 className="font-heading" style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
              Regional Distribution
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              Geographic revenue & profit contribution
            </p>
          </div>
        </div>

        {/* Metric Switcher */}
        <div style={{ display: "flex", gap: 4, background: "rgba(13, 17, 26, 0.8)", padding: 4, borderRadius: 10, border: "1px solid var(--border)" }}>
          {(["revenue", "profit"] as const).map(m => {
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
                  background: active ? "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)" : "transparent",
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
          <PieChart>
            <Pie
              data={data}
              dataKey={metric}
              nameKey="region"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={82}
              paddingAngle={5}
              stroke="rgba(18, 22, 34, 0.9)"
              strokeWidth={3}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={REGION_COLORS[i % REGION_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#0d111a", border: "1px solid rgba(255, 255, 255, 0.25)", borderRadius: 10, fontSize: 12, color: "#ffffff" }}
              formatter={(v: any) => [fmtVal(Number(v)), metric.toUpperCase()]}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
          No regional data available
        </div>
      )}
    </div>
  );
}
