"use client";
import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { CreditCard } from "lucide-react";

interface PaymentMethodChartProps {
  data: { name: string; value: number }[];
}

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4"];

export default function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  const validData = data.filter(d => d.value > 0);
  const fmtVal = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    return `₹${(val / 1000).toFixed(0)}k`;
  };

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CreditCard size={18} color="#34d399" />
        </div>
        <div>
          <h3 className="font-heading" style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
            Payment Method Share
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            Channel breakdown of transactional volume
          </p>
        </div>
      </div>

      {validData.length > 0 ? (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={validData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={78}
              innerRadius={42}
              stroke="rgba(18, 22, 34, 0.9)"
              strokeWidth={3}
            >
              {validData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#0d111a", border: "1px solid rgba(255, 255, 255, 0.25)", borderRadius: 10, fontSize: 12, color: "#ffffff" }}
              formatter={(v: any) => [fmtVal(Number(v)), "Revenue"]}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ height: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13, background: "rgba(13, 17, 26, 0.8)", borderRadius: 12 }}>
          <CreditCard size={28} color="var(--text-muted)" style={{ marginBottom: 6 }} />
          <div>No payment method column in dataset</div>
        </div>
      )}
    </div>
  );
}
