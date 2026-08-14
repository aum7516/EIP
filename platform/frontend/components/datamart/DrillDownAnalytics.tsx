"use client";
import React, { useState } from "react";
import { TransactionRecord } from "@/lib/datamart/sampleData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Layers, ChevronRight, ArrowLeft, MousePointerClick } from "lucide-react";

interface DrillDownAnalyticsProps {
  records: TransactionRecord[];
  selectedCategory?: string | null;
  onClearDrillDown?: () => void;
}

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#ef4444", "#14b8a6"];

export default function DrillDownAnalytics({
  records,
  selectedCategory,
  onClearDrillDown
}: DrillDownAnalyticsProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(selectedCategory || null);
  const [activeProduct, setActiveProduct] = useState<string | null>(null);

  React.useEffect(() => {
    if (selectedCategory !== undefined) {
      setActiveCategory(selectedCategory);
    }
  }, [selectedCategory]);

  const resetAll = () => {
    setActiveCategory(null);
    setActiveProduct(null);
    if (onClearDrillDown) onClearDrillDown();
  };

  // Level 1: Categories
  const categoriesMap: Record<string, { category: string; revenue: number; profit: number; count: number }> = {};
  records.forEach(r => {
    const c = r.category || "Uncategorized";
    if (!categoriesMap[c]) categoriesMap[c] = { category: c, revenue: 0, profit: 0, count: 0 };
    categoriesMap[c].revenue += r.revenue || 0;
    categoriesMap[c].profit += r.profit || 0;
    categoriesMap[c].count += 1;
  });
  const categoryData = Object.values(categoriesMap).sort((a, b) => b.revenue - a.revenue);
  const hasValidRevenue = categoryData.some(c => c.revenue > 0);

  // Level 2: Products
  const productsMap: Record<string, { product: string; revenue: number; profit: number; quantity: number }> = {};
  if (activeCategory) {
    records
      .filter(r => r.category === activeCategory)
      .forEach(r => {
        const p = r.product;
        if (!productsMap[p]) productsMap[p] = { product: p, revenue: 0, profit: 0, quantity: 0 };
        productsMap[p].revenue += r.revenue || 0;
        productsMap[p].profit += r.profit || 0;
        productsMap[p].quantity += r.quantity || 0;
      });
  }
  const productData = Object.values(productsMap).sort((a, b) => b.revenue - a.revenue);

  // Level 3: Individual transactions
  const productTxs = activeProduct
    ? records.filter(r => r.category === activeCategory && r.product === activeProduct).slice(0, 10)
    : [];

  const fmtCurrency = (v: number | null) => v !== null ? `₹${v.toLocaleString("en-IN")}` : "N/A";

  return (
    <div className="glass-card" style={{ padding: 26, marginBottom: 24 }}>
      {/* Breadcrumb Control Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span
              onClick={resetAll}
              style={{ color: "#60a5fa", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}
            >
              <Layers size={14} />
              <span>Overview</span>
            </span>
            {activeCategory && (
              <>
                <ChevronRight size={14} color="var(--text-muted)" />
                <span
                  onClick={() => setActiveProduct(null)}
                  style={{ color: activeProduct ? "#60a5fa" : "var(--text-primary)", cursor: activeProduct ? "pointer" : "default", fontWeight: 600 }}
                >
                  {activeCategory}
                </span>
              </>
            )}
            {activeProduct && (
              <>
                <ChevronRight size={14} color="var(--text-muted)" />
                <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                  {activeProduct}
                </span>
              </>
            )}
          </div>
          <h3 className="font-heading" style={{ fontSize: 16, fontWeight: 900, marginTop: 4 }}>
            Multi-Level Hierarchical Drill-Down Engine
          </h3>
        </div>

        {(activeCategory || activeProduct) && (
          <button onClick={resetAll} className="btn-secondary" style={{ fontSize: 12, padding: "6px 14px" }}>
            <ArrowLeft size={14} />
            <span>Reset View</span>
          </button>
        )}
      </div>

      {/* Dynamic View Logic */}
      {!hasValidRevenue && !activeCategory ? (
        <div style={{ height: 230, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(13, 17, 26, 0.8)", borderRadius: 12, color: "var(--text-muted)", fontSize: 13 }}>
          <MousePointerClick size={28} color="var(--text-muted)" style={{ marginBottom: 6 }} />
          <div>No category drill-down data available in current dataset</div>
        </div>
      ) : !activeCategory ? (
        // Level 1: Category Bar View
        <div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>
            Click on any category bar to inspect top product items within that segment
          </p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart
              data={categoryData}
              onClick={(st: any) => {
                if (st && st.activePayload && st.activePayload.length) {
                  setActiveCategory(st.activePayload[0].payload.category);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis dataKey="category" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip
                contentStyle={{ background: "rgba(13, 17, 26, 0.95)", border: "1px solid rgba(255, 255, 255, 0.25)", borderRadius: 10, color: "#ffffff" }}
                formatter={(v: any) => [fmtCurrency(Number(v)), "Revenue"]}
              />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]} cursor="pointer">
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : !activeProduct ? (
        // Level 2: Products View
        <div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>
            Products inside <strong style={{ color: "var(--text-primary)" }}>{activeCategory}</strong>. Click any product bar to view underlying transactions.
          </p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart
              data={productData}
              onClick={(st: any) => {
                if (st && st.activePayload && st.activePayload.length) {
                  setActiveProduct(st.activePayload[0].payload.product);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis dataKey="product" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "rgba(13, 17, 26, 0.95)", border: "1px solid rgba(255, 255, 255, 0.25)", borderRadius: 10, color: "#ffffff" }}
                formatter={(v: any) => [fmtCurrency(Number(v)), "Revenue"]}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        // Level 3: Individual Transactions Table
        <div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>
            Recent sample transaction logs for <strong style={{ color: "var(--text-primary)" }}>{activeProduct}</strong>
          </p>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Tx ID</th>
                <th>Date</th>
                <th>Region</th>
                <th>Customer</th>
                <th style={{ textAlign: "right" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Revenue</th>
                <th style={{ textAlign: "right" }}>Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {productTxs.map((t, idx) => (
                <tr key={idx}>
                  <td className="font-mono" style={{ fontWeight: 600, color: "#60a5fa" }}>{t.transaction_id}</td>
                  <td className="font-mono">{t.date || "-"}</td>
                  <td>{t.region}</td>
                  <td>{t.customer_type}</td>
                  <td className="font-mono" style={{ textAlign: "right" }}>{t.quantity ?? "-"}</td>
                  <td className="font-mono" style={{ textAlign: "right", fontWeight: 700 }}>{fmtCurrency(t.revenue)}</td>
                  <td className="font-mono" style={{ textAlign: "right", color: "#34d399", fontWeight: 700 }}>{fmtCurrency(t.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
