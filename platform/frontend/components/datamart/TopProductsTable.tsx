"use client";
import React, { useState } from "react";
import { Trophy, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface TopProductItem {
  rank: number;
  product: string;
  category: string;
  revenue: number;
  profit: number;
  quantity: number;
  margin: number;
}

interface TopProductsTableProps {
  products: TopProductItem[];
}

export default function TopProductsTable({ products }: TopProductsTableProps) {
  const [sortKey, setSortKey] = useState<keyof TopProductItem>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fmtCurrency = (v: number) => `₹${v.toLocaleString("en-IN")}`;

  const handleSort = (key: keyof TopProductItem) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    const valA = a[sortKey];
    const valB = b[sortKey];
    if (typeof valA === "number" && typeof valB === "number") {
      return sortDir === "desc" ? valB - valA : valA - valB;
    }
    return sortDir === "desc"
      ? String(valB).localeCompare(String(valA))
      : String(valA).localeCompare(String(valB));
  });

  const renderSortIcon = (key: keyof TopProductItem) => {
    if (sortKey !== key) return <ArrowUpDown size={12} color="var(--text-muted)" style={{ marginLeft: 4 }} />;
    return sortDir === "desc" ? <ArrowDown size={12} color="#60a5fa" style={{ marginLeft: 4 }} /> : <ArrowUp size={12} color="#60a5fa" style={{ marginLeft: 4 }} />;
  };

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(245, 158, 11, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trophy size={18} color="#fbbf24" />
          </div>
          <div>
            <h3 className="font-heading" style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
              Top Product Leaders
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              Ranked product performance, profit contribution & margin analysis
            </p>
          </div>
        </div>
        <span className="badge badge-amber" style={{ fontSize: 11 }}>
          Top {products.length} Products
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("rank")} style={{ cursor: "pointer" }}>Rank {renderSortIcon("rank")}</th>
              <th onClick={() => handleSort("product")} style={{ cursor: "pointer" }}>Product Item {renderSortIcon("product")}</th>
              <th onClick={() => handleSort("category")} style={{ cursor: "pointer" }}>Category {renderSortIcon("category")}</th>
              <th onClick={() => handleSort("revenue")} style={{ cursor: "pointer", textAlign: "right" }}>Revenue {renderSortIcon("revenue")}</th>
              <th onClick={() => handleSort("profit")} style={{ cursor: "pointer", textAlign: "right" }}>Net Profit {renderSortIcon("profit")}</th>
              <th onClick={() => handleSort("quantity")} style={{ cursor: "pointer", textAlign: "right" }}>Units {renderSortIcon("quantity")}</th>
              <th onClick={() => handleSort("margin")} style={{ cursor: "pointer", textAlign: "right" }}>Margin % {renderSortIcon("margin")}</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map((p, idx) => (
              <tr key={idx}>
                <td className="font-mono" style={{ fontWeight: 800, color: idx < 3 ? "#fbbf24" : "#60a5fa" }}>
                  #{p.rank}
                </td>
                <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.product}</td>
                <td style={{ color: "var(--text-secondary)" }}>{p.category}</td>
                <td className="font-mono" style={{ textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>{fmtCurrency(p.revenue)}</td>
                <td className="font-mono" style={{ textAlign: "right", color: "#34d399", fontWeight: 700 }}>{fmtCurrency(p.profit)}</td>
                <td className="font-mono" style={{ textAlign: "right" }}>{p.quantity.toLocaleString()}</td>
                <td style={{ textAlign: "right" }}>
                  <span className={`badge ${p.margin > 25 ? "badge-green" : "badge-amber"}`} style={{ fontSize: 11 }}>
                    {p.margin}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
