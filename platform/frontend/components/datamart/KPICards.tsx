"use client";
import React, { useState } from "react";
import { KPISummary, SemanticMetricModel } from "@/lib/datamart/datamartEngine";
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Layers,
  BarChart3,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Sparkles,
  Maximize2,
  X,
  CheckCircle2,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Filter
} from "lucide-react";

interface KPICardsProps {
  kpis: KPISummary;
  semanticModel?: SemanticMetricModel;
}

export default function KPICards({ kpis, semanticModel }: KPICardsProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"default" | "trend" | "available">("default");
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
  const [activeModalTab, setActiveModalTab] = useState<"overview" | "breakdown">("overview");

  // Custom order index state for manual rearrangement
  const [customOrder, setCustomOrder] = useState<string[]>([
    "revenue",
    "profit",
    "transactions",
    "units",
    "aov",
    "margin"
  ]);

  const fmtCurrency = (v: number | null) => {
    if (v === null || v === undefined) return "N/A";
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
  };

  const rawCardsMap: Record<string, any> = {
    revenue: {
      id: "revenue",
      label: "Total Revenue",
      value: fmtCurrency(kpis.totalRevenue),
      rawNum: kpis.totalRevenue || 0,
      change: kpis.revenueChangePct,
      isAvailable: semanticModel ? semanticModel.revenue.status !== "UNAVAILABLE" : kpis.totalRevenue !== null,
      subtext: semanticModel?.revenue.formula ? `⚡ ${semanticModel.revenue.formula}` : "vs previous period",
      stripeColor: "#3b82f6",
      glowColor: "rgba(59, 130, 246, 0.35)",
      iconBg: "rgba(59, 130, 246, 0.2)",
      iconColor: "#60a5fa",
      icon: DollarSign,
      details: {
        formula: semanticModel?.revenue.formula || "sum(quantity * unit_price)",
        statusText: "Directly derived from transaction records",
        summary: "Represents total gross sales before deducting costs, operational expenses, or discounts.",
        recommendation: "Focus on high-margin product categories to accelerate net profitability alongside revenue expansion.",
        breakdownStats: [
          { key: "Revenue Model", val: semanticModel?.revenue.formula ? "Auto-Derived" : "Direct Column" },
          { key: "Metric Type", val: "Financial Aggregation" },
          { key: "Period Trajectory", val: kpis.revenueChangePct !== null ? `${kpis.revenueChangePct >= 0 ? "+" : ""}${kpis.revenueChangePct}%` : "N/A" }
        ]
      }
    },
    profit: {
      id: "profit",
      label: "Total Net Profit",
      value: fmtCurrency(kpis.totalProfit),
      rawNum: kpis.totalProfit || 0,
      change: kpis.profitChangePct,
      isAvailable: semanticModel ? semanticModel.profit.status !== "UNAVAILABLE" : kpis.totalProfit !== null,
      subtext: semanticModel?.profit.status === "UNAVAILABLE" ? "○ Cost / Profit missing" : semanticModel?.profit.formula ? `⚡ ${semanticModel.profit.formula}` : "net revenue yield",
      stripeColor: "#10b981",
      glowColor: "rgba(16, 185, 129, 0.35)",
      iconBg: "rgba(16, 185, 129, 0.2)",
      iconColor: "#34d399",
      icon: TrendingUp,
      details: {
        formula: semanticModel?.profit.formula || "sum(revenue - cost)",
        statusText: semanticModel?.profit.status === "UNAVAILABLE" ? "Missing Cost/Profit columns in CSV" : "Computed from item costs & sales revenue",
        summary: "Cumulative net earnings calculated after deducting item acquisition and fulfillment costs.",
        recommendation: "Negotiate vendor volume pricing for top 10 items to expand overall profit margin.",
        breakdownStats: [
          { key: "Profitability Status", val: semanticModel?.profit.status || "AVAILABLE" },
          { key: "Cost Deductions", val: "Calculated per transaction" },
          { key: "Net Yield", val: kpis.profitMargin !== null ? `${kpis.profitMargin.toFixed(1)}%` : "N/A" }
        ]
      }
    },
    transactions: {
      id: "transactions",
      label: "Total Transactions",
      value: kpis.totalTransactions.toLocaleString(),
      rawNum: kpis.totalTransactions,
      change: kpis.transactionsChangePct,
      isAvailable: true,
      subtext: "verified orders logged",
      stripeColor: "#8b5cf6",
      glowColor: "rgba(139, 92, 246, 0.35)",
      iconBg: "rgba(139, 92, 246, 0.2)",
      iconColor: "#c084fc",
      icon: ShoppingBag,
      details: {
        formula: "count(distinct transaction_id)",
        statusText: "Directly counted from dataset rows",
        summary: "Total number of completed transaction records logged across the selected date range.",
        recommendation: "Implement customer loyalty incentives to drive repeat order frequency.",
        breakdownStats: [
          { key: "Order Volume", val: `${kpis.totalTransactions.toLocaleString()} orders` },
          { key: "Data Integrity", val: "100% Unique Row Validation" },
          { key: "Growth Index", val: kpis.transactionsChangePct !== null ? `${kpis.transactionsChangePct >= 0 ? "+" : ""}${kpis.transactionsChangePct}%` : "N/A" }
        ]
      }
    },
    units: {
      id: "units",
      label: "Total Units Sold",
      value: kpis.unitsSold !== null ? kpis.unitsSold.toLocaleString() : "N/A",
      rawNum: kpis.unitsSold || 0,
      change: kpis.unitsChangePct,
      isAvailable: semanticModel ? semanticModel.unitsSold.status !== "UNAVAILABLE" : kpis.unitsSold !== null,
      subtext: semanticModel?.unitsSold.status === "UNAVAILABLE" ? "○ Quantity column missing" : "aggregate item volume",
      stripeColor: "#f59e0b",
      glowColor: "rgba(245, 158, 11, 0.35)",
      iconBg: "rgba(245, 158, 11, 0.2)",
      iconColor: "#fbbf24",
      icon: Layers,
      details: {
        formula: "sum(quantity)",
        statusText: "Aggregate item quantity count",
        summary: "Physical quantity of all inventory items sold during the active filtering window.",
        recommendation: "Bundle slow-moving items with top sellers to accelerate overall unit throughput.",
        breakdownStats: [
          { key: "Physical Volume", val: kpis.unitsSold ? `${kpis.unitsSold.toLocaleString()} units` : "N/A" },
          { key: "Avg Units Per Order", val: kpis.unitsSold ? (kpis.unitsSold / Math.max(1, kpis.totalTransactions)).toFixed(1) : "N/A" },
          { key: "Quantity Column", val: semanticModel?.unitsSold.status || "AVAILABLE" }
        ]
      }
    },
    aov: {
      id: "aov",
      label: "Avg Order Value (AOV)",
      value: fmtCurrency(kpis.avgOrderValue),
      rawNum: kpis.avgOrderValue || 0,
      change: kpis.aovChangePct,
      isAvailable: semanticModel ? semanticModel.avgOrderValue.status !== "UNAVAILABLE" : kpis.avgOrderValue !== null,
      subtext: "average ticket size",
      stripeColor: "#06b6d4",
      glowColor: "rgba(6, 182, 212, 0.35)",
      iconBg: "rgba(6, 182, 212, 0.2)",
      iconColor: "#22d3ee",
      icon: BarChart3,
      details: {
        formula: "total_revenue / total_transactions",
        statusText: "Derived ticket size metric",
        summary: "Average revenue generated per single customer transaction order.",
        recommendation: "Introduce cross-sell product recommendations at checkout to increase AOV.",
        breakdownStats: [
          { key: "Average Ticket Size", val: fmtCurrency(kpis.avgOrderValue) },
          { key: "Calculation Logic", val: "Revenue / Transaction Count" },
          { key: "Growth Index", val: kpis.aovChangePct !== null ? `${kpis.aovChangePct >= 0 ? "+" : ""}${kpis.aovChangePct}%` : "N/A" }
        ]
      }
    },
    margin: {
      id: "margin",
      label: "Net Profit Margin",
      value: kpis.profitMargin !== null ? `${kpis.profitMargin.toFixed(1)}%` : "N/A",
      rawNum: kpis.profitMargin || 0,
      change: kpis.marginChangePct,
      isAvailable: semanticModel ? semanticModel.profitMargin.status !== "UNAVAILABLE" : kpis.profitMargin !== null,
      subtext: semanticModel?.profitMargin.status === "UNAVAILABLE" ? "○ Profit/Revenue missing" : "overall profitability ratio",
      stripeColor: kpis.profitMargin !== null && kpis.profitMargin > 20 ? "#10b981" : "#f59e0b",
      glowColor: kpis.profitMargin !== null && kpis.profitMargin > 20 ? "rgba(16, 185, 129, 0.35)" : "rgba(245, 158, 11, 0.35)",
      iconBg: kpis.profitMargin !== null && kpis.profitMargin > 20 ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
      iconColor: kpis.profitMargin !== null && kpis.profitMargin > 20 ? "#34d399" : "#fbbf24",
      icon: Zap,
      details: {
        formula: "(total_profit / total_revenue) * 100",
        statusText: "Overall net margin percentage",
        summary: "Percentage of total revenue that translates directly into net profit.",
        recommendation: "Audit high-discount channels to protect margin integrity across categories.",
        breakdownStats: [
          { key: "Net Margin Ratio", val: kpis.profitMargin !== null ? `${kpis.profitMargin.toFixed(1)}%` : "N/A" },
          { key: "Margin Target Benchmark", val: "> 25.0% Healthy" },
          { key: "Status", val: kpis.profitMargin !== null && kpis.profitMargin > 20 ? "Strong Profitability" : "Moderate Margin" }
        ]
      }
    }
  };

  // Reorder array based on customOrder & sortBy
  const orderedCards = customOrder.map(id => rawCardsMap[id]).filter(Boolean);

  const cards = [...orderedCards].sort((a, b) => {
    if (sortBy === "trend") {
      return (b.change || 0) - (a.change || 0);
    }
    if (sortBy === "available") {
      return (b.isAvailable ? 1 : 0) - (a.isAvailable ? 1 : 0);
    }
    return 0;
  });

  const moveCard = (index: number, direction: "left" | "right") => {
    const newOrder = [...customOrder];
    const targetIdx = direction === "left" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    setCustomOrder(newOrder);
  };

  const selectedCard = selectedCardId ? rawCardsMap[selectedCardId] : null;

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Control & Rearrange Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="font-heading" style={{ fontSize: 15, fontWeight: 800, color: "#ffffff" }}>
            Executive KPI Matrix
          </span>
          <span className="badge badge-purple" style={{ fontSize: 10, cursor: "pointer" }}>
            ⚡ Interactive Cards (Click to Inspect)
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Arrange Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(13, 17, 26, 0.9)", padding: "5px 10px", borderRadius: 10, border: "1px solid var(--border)" }}>
            <SlidersHorizontal size={13} color="#60a5fa" />
            <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>Arrange:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              style={{ background: "transparent", border: "none", color: "#ffffff", fontSize: 11, outline: "none", cursor: "pointer", fontWeight: 700 }}
            >
              <option value="default" style={{ background: "#0d111a" }}>Custom / Drag Order</option>
              <option value="trend" style={{ background: "#0d111a" }}>Highest Growth %</option>
              <option value="available" style={{ background: "#0d111a" }}>Available First</option>
            </select>
          </div>

          {/* Grid / List Layout Switcher */}
          <div style={{ display: "flex", background: "rgba(13, 17, 26, 0.9)", padding: 3, borderRadius: 10, border: "1px solid var(--border)" }}>
            <button
              onClick={() => setLayoutMode("grid")}
              style={{
                background: layoutMode === "grid" ? "rgba(59, 130, 246, 0.3)" : "transparent",
                border: "none",
                borderRadius: 7,
                padding: "5px 9px",
                color: layoutMode === "grid" ? "#ffffff" : "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 600
              }}
            >
              <LayoutGrid size={13} />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setLayoutMode("list")}
              style={{
                background: layoutMode === "list" ? "rgba(59, 130, 246, 0.3)" : "transparent",
                border: "none",
                borderRadius: 7,
                padding: "5px 9px",
                color: layoutMode === "list" ? "#ffffff" : "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 600
              }}
            >
              <List size={13} />
              <span>Rows</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: layoutMode === "grid" ? "repeat(auto-fit, minmax(220px, 1fr))" : "1fr",
        gap: 16
      }}>
        {cards.map((card, i) => {
          const IconComponent = card.icon;
          const isUp = card.change !== null && card.change >= 0;

          return (
            <div
              key={card.id}
              onClick={() => setSelectedCardId(card.id)}
              className="kpi-hero-card fade-in"
              style={{
                animationDelay: `${i * 0.04}s`,
                opacity: card.isAvailable ? 1 : 0.75,
                "--stripe-color": card.stripeColor,
                "--glow-color": card.glowColor,
                cursor: "pointer"
              } as React.CSSProperties}
            >
              {/* Card Header & Move Buttons */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div
                  className="kpi-icon-badge"
                  style={{
                    "--icon-bg": card.iconBg,
                    "--icon-color": card.iconColor
                  } as React.CSSProperties}
                >
                  <IconComponent size={20} />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {/* Manual Move Position Buttons */}
                  {sortBy === "default" && (
                    <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.06)", borderRadius: 6, padding: 2 }}>
                      <button
                        title="Move Card Left"
                        onClick={(e) => { e.stopPropagation(); moveCard(i, "left"); }}
                        disabled={i === 0}
                        style={{ border: "none", background: "transparent", color: i === 0 ? "var(--text-muted)" : "#ffffff", cursor: i === 0 ? "default" : "pointer", padding: "1px 3px", display: "flex" }}
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <button
                        title="Move Card Right"
                        onClick={(e) => { e.stopPropagation(); moveCard(i, "right"); }}
                        disabled={i === cards.length - 1}
                        style={{ border: "none", background: "transparent", color: i === cards.length - 1 ? "var(--text-muted)" : "#ffffff", cursor: i === cards.length - 1 ? "default" : "pointer", padding: "1px 3px", display: "flex" }}
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  )}

                  {card.isAvailable && card.change !== null ? (
                    <div
                      className={`badge ${isUp ? "badge-green" : "badge-red"}`}
                      style={{ fontSize: 11, padding: "3px 8px" }}
                    >
                      {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      <span>{Math.abs(card.change)}%</span>
                    </div>
                  ) : (
                    <div className="badge badge-amber" style={{ fontSize: 10, padding: "2px 7px" }}>
                      <AlertCircle size={11} />
                      <span>Unavailable</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Metric Value */}
              <div
                className="font-heading font-mono"
                style={{
                  fontSize: layoutMode === "list" ? 24 : 28,
                  fontWeight: 900,
                  color: card.isAvailable ? "#ffffff" : "var(--text-muted)",
                  letterSpacing: "-0.5px",
                  lineHeight: 1.2
                }}
              >
                {card.value}
              </div>

              {/* Metric Title Label */}
              <div
                className="font-heading"
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#cbd5e1",
                  marginTop: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.6px"
                }}
              >
                {card.label}
              </div>

              {/* Subtext Formula & Inspect Action Button */}
              <div
                style={{
                  fontSize: 11,
                  color: card.isAvailable ? "#94a3b8" : "var(--accent-amber)",
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: "1px solid var(--border-subtle)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {card.isAvailable && semanticModel && <Sparkles size={11} color="var(--accent-blue)" />}
                  <span>{card.subtext}</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCardId(card.id);
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: 6,
                    padding: "3px 8px",
                    color: card.iconColor,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Inspect ↗
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* INTERACTIVE METRIC DETAIL MODAL */}
      {selectedCard && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0, 0, 0, 0.88)",
            backdropFilter: "blur(16px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
          onClick={() => setSelectedCardId(null)}
        >
          <div
            className="glass-card fade-in"
            style={{
              width: "100%",
              maxWidth: 620,
              background: "#0d111a",
              border: `1px solid ${selectedCard.stripeColor}`,
              borderRadius: 20,
              padding: 30,
              boxShadow: `0 25px 60px rgba(0,0,0,0.9), 0 0 35px ${selectedCard.glowColor}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Toolbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  className="kpi-icon-badge"
                  style={{
                    "--icon-bg": selectedCard.iconBg,
                    "--icon-color": selectedCard.iconColor
                  } as React.CSSProperties}
                >
                  <selectedCard.icon size={22} />
                </div>
                <div>
                  <h2 className="font-heading" style={{ fontSize: 22, fontWeight: 900, color: "#ffffff" }}>
                    {selectedCard.label}
                  </h2>
                  <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 2 }}>
                    Deep-Dive Executive Metric Audit
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCardId(null)}
                className="btn-secondary"
                style={{ padding: "8px 12px", fontSize: 12 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
              <button
                onClick={() => setActiveModalTab("overview")}
                style={{
                  background: activeModalTab === "overview" ? "rgba(59, 130, 246, 0.25)" : "transparent",
                  border: activeModalTab === "overview" ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid transparent",
                  color: activeModalTab === "overview" ? "#ffffff" : "var(--text-secondary)",
                  padding: "6px 16px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Metric Overview & Logic
              </button>
              <button
                onClick={() => setActiveModalTab("breakdown")}
                style={{
                  background: activeModalTab === "breakdown" ? "rgba(59, 130, 246, 0.25)" : "transparent",
                  border: activeModalTab === "breakdown" ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid transparent",
                  color: activeModalTab === "breakdown" ? "#ffffff" : "var(--text-secondary)",
                  padding: "6px 16px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Detailed Statistics
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeModalTab === "overview" ? (
              <>
                {/* Aggregated Value Box */}
                <div style={{ background: "rgba(18, 22, 34, 0.95)", padding: 20, borderRadius: 14, border: "1px solid var(--border)", marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.5px" }}>Aggregated Dataset Total</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 4 }}>
                    <span className="font-heading font-mono" style={{ fontSize: 34, fontWeight: 900, color: selectedCard.iconColor }}>
                      {selectedCard.value}
                    </span>
                    {selectedCard.change !== null && (
                      <span className={`badge ${selectedCard.change >= 0 ? "badge-green" : "badge-red"}`} style={{ fontSize: 12 }}>
                        {selectedCard.change >= 0 ? `↑ +${selectedCard.change}%` : `↓ ${selectedCard.change}%`} vs prev period
                      </span>
                    )}
                  </div>
                </div>

                {/* Calculation Formula */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
                    ⚡ Semantic Formula & Logic
                  </div>
                  <div className="font-mono" style={{ background: "rgba(7, 9, 14, 0.95)", padding: "12px 16px", borderRadius: 10, border: "1px solid var(--border)", fontSize: 13, color: "#60a5fa" }}>
                    {selectedCard.details.formula}
                  </div>
                </div>

                {/* Status & Summary */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
                    ℹ Description & Scope
                  </div>
                  <p style={{ fontSize: 13, color: "#ffffff", lineHeight: 1.5, marginBottom: 10 }}>
                    {selectedCard.details.summary}
                  </p>
                  <div style={{ fontSize: 12, color: "#34d399", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle2 size={15} />
                    <span>{selectedCard.details.statusText}</span>
                  </div>
                </div>

                {/* AI Recommendation Callout */}
                <div style={{ background: "rgba(59, 130, 246, 0.12)", border: "1px solid rgba(59, 130, 246, 0.35)", padding: 16, borderRadius: 14, fontSize: 12, color: "#ffffff" }}>
                  <strong style={{ color: "#60a5fa", display: "block", marginBottom: 4 }}>💡 Optimization Recommendation:</strong>
                  {selectedCard.details.recommendation}
                </div>
              </>
            ) : (
              /* TAB 2: BREAKDOWN STATISTICS */
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 14 }}>
                  System Breakdown Properties
                </div>
                <table className="custom-table" style={{ marginBottom: 20 }}>
                  <thead>
                    <tr>
                      <th>Property Attribute</th>
                      <th style={{ textAlign: "right" }}>System Evaluation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCard.details.breakdownStats.map((st: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: "#cbd5e1" }}>{st.key}</td>
                        <td className="font-mono" style={{ textAlign: "right", fontWeight: 700, color: selectedCard.iconColor }}>{st.val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button
                  onClick={() => setSelectedCardId(null)}
                  className="btn-primary"
                  style={{ width: "100%", fontSize: 13 }}
                >
                  Done Inspecting Metric
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
