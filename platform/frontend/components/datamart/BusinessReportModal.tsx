"use client";
import React from "react";
import { KPISummary, AnomalyItem, AIInsightItem } from "@/lib/datamart/datamartEngine";
import { TransactionRecord } from "@/lib/datamart/sampleData";
import { Download, Printer, X, ShieldCheck, FileText, Sparkles, AlertOctagon, Lightbulb } from "lucide-react";

interface BusinessReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpis: KPISummary;
  records: TransactionRecord[];
  anomalies: AnomalyItem[];
  insights: AIInsightItem[];
  datasetName: string;
}

export default function BusinessReportModal({
  isOpen,
  onClose,
  kpis,
  records,
  anomalies,
  insights,
  datasetName
}: BusinessReportModalProps) {
  if (!isOpen) return null;

  const fmtCurrency = (v: number | null) => {
    if (v === null || v === undefined) return "N/A";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!records.length) return;
    const headers = Object.keys(records[0]).filter(k => !k.startsWith("_"));
    const rows = records.map(r => headers.map(h => `"${r[h] ?? ""}"`).join(","));
    const csvStr = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csvStr], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `datamart_executive_report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(12px)",
        zIndex: 99999,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 24
      }}
    >
      <div
        className="glass-card fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 920,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#0d111a",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: 20,
          padding: 36,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)"
        }}
      >
        {/* Header bar */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 28, borderBottom: "1px solid var(--border)", paddingBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#60a5fa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
              <ShieldCheck size={14} color="#60a5fa" />
              <span>ORBIT ENTERPRISE INTELLIGENCE PLATFORM</span>
            </div>
            <h1 className="font-heading" style={{ fontSize: 26, fontWeight: 900, color: "var(--text-primary)", marginTop: 4 }}>
              Executive DataMart Intelligence Report
            </h1>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
              Generated on {new Date().toLocaleDateString("en-IN")} | Dataset: <strong style={{ color: "var(--text-primary)" }}>{datasetName}</strong> ({records.length.toLocaleString()} txs)
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleExportCSV} className="btn-secondary" style={{ fontSize: 12, padding: "9px 15px" }}>
              <Download size={14} />
              <span>Export CSV</span>
            </button>
            <button onClick={handlePrint} className="btn-primary" style={{ fontSize: 12, padding: "9px 18px" }}>
              <Printer size={14} />
              <span>Print / PDF</span>
            </button>
            <button onClick={onClose} className="btn-secondary" style={{ fontSize: 12, padding: "9px 12px" }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Section 1: Executive Summary */}
        <div style={{ marginBottom: 28 }}>
          <h2 className="font-heading" style={{ fontSize: 15, fontWeight: 800, color: "#60a5fa", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>
            <FileText size={16} />
            <span>1. Executive Summary</span>
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-primary)", background: "rgba(18, 22, 34, 0.8)", padding: 18, borderRadius: 12, border: "1px solid var(--border)" }}>
            During the evaluated performance cycle, the dataset processed total net revenue of <strong className="font-mono" style={{ color: "#60a5fa" }}>{fmtCurrency(kpis.totalRevenue)}</strong> across <strong className="font-mono">{kpis.totalTransactions.toLocaleString()} transactions</strong>. Gross cumulative profit stands at <strong className="font-mono" style={{ color: "#34d399" }}>{fmtCurrency(kpis.totalProfit)}</strong> with an overall net profit margin of <strong className="font-mono" style={{ color: "#fbbf24" }}>{kpis.profitMargin !== null ? `${kpis.profitMargin.toFixed(1)}%` : "N/A"}</strong>.
          </p>
        </div>

        {/* Section 2: Key Performance Indicators */}
        <div style={{ marginBottom: 28 }}>
          <h2 className="font-heading" style={{ fontSize: 15, fontWeight: 800, color: "#60a5fa", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            2. Core Financial Indicators
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            <div style={{ background: "rgba(18, 22, 34, 0.8)", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Net Revenue</div>
              <div className="font-heading font-mono" style={{ fontSize: 22, fontWeight: 900, color: "#60a5fa", marginTop: 4 }}>{fmtCurrency(kpis.totalRevenue)}</div>
            </div>
            <div style={{ background: "rgba(18, 22, 34, 0.8)", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Net Profit</div>
              <div className="font-heading font-mono" style={{ fontSize: 22, fontWeight: 900, color: kpis.totalProfit !== null ? "#34d399" : "var(--text-muted)", marginTop: 4 }}>{fmtCurrency(kpis.totalProfit)}</div>
            </div>
            <div style={{ background: "rgba(18, 22, 34, 0.8)", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Average Order Value</div>
              <div className="font-heading font-mono" style={{ fontSize: 22, fontWeight: 900, color: "#fbbf24", marginTop: 4 }}>{fmtCurrency(kpis.avgOrderValue)}</div>
            </div>
          </div>
        </div>

        {/* Section 3: Operational Anomalies */}
        <div style={{ marginBottom: 28 }}>
          <h2 className="font-heading" style={{ fontSize: 15, fontWeight: 800, color: "#60a5fa", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertOctagon size={16} color="#f87171" />
            <span>3. Statistical Outlier & Anomaly Audit</span>
          </h2>
          {anomalies.length > 0 ? (
            anomalies.map((a, i) => (
              <div key={i} style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: 10, padding: 14, marginBottom: 10, fontSize: 13 }}>
                <strong style={{ color: "#f87171" }}>🚨 {a.title} ({a.regionOrCategory}):</strong> {a.metricValue}. {a.contributingFactor}
              </div>
            ))
          ) : (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No statistical anomalies flagged in active dataset</div>
          )}
        </div>

        {/* Section 4: AI Recommendations */}
        <div style={{ marginBottom: 24 }}>
          <h2 className="font-heading" style={{ fontSize: 15, fontWeight: 800, color: "#60a5fa", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={16} color="#c084fc" />
            <span>4. AI Strategic Recommendations</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {insights.map((ins, i) => (
              <div key={i} style={{ background: "rgba(18, 22, 34, 0.8)", padding: 16, borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}>
                <strong style={{ color: "#60a5fa", display: "block", marginBottom: 4 }}>💡 {ins.metric}</strong>
                <p style={{ color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.4 }}>{ins.explanation}</p>
                <div style={{ color: "#34d399", fontWeight: 600 }}>Action Item: {ins.recommendation}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: 18, fontSize: 11, color: "var(--text-muted)" }}>
          Orbit EIP Platform — Executive Intelligence DataMart Workspace Report
        </div>
      </div>
    </div>
  );
}
