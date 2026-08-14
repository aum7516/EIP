"use client";
import React from "react";
import { AIInsightItem } from "@/lib/datamart/datamartEngine";
import { Sparkles, BrainCircuit, Lightbulb, AlertTriangle, ShieldAlert } from "lucide-react";

interface AIInsightsProps {
  insights: AIInsightItem[];
}

export default function AIInsights({ insights }: AIInsightsProps) {
  const getBadgeClass = (sev: string) => {
    switch (sev) {
      case "Critical": return "badge-red";
      case "Warning": return "badge-amber";
      default: return "badge-green";
    }
  };

  const getBorderColor = (sev: string) => {
    switch (sev) {
      case "Critical": return "rgba(239, 68, 68, 0.3)";
      case "Warning": return "rgba(245, 158, 11, 0.3)";
      default: return "rgba(16, 185, 129, 0.3)";
    }
  };

  return (
    <div className="glass-card" style={{ padding: 26, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(139, 92, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BrainCircuit size={18} color="#c084fc" />
            </div>
            <h2 className="font-heading" style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary)" }}>
              AI Business Intelligence Engine
            </h2>
            <span className="badge badge-purple" style={{ fontSize: 11 }}>
              <Sparkles size={12} /> Auto AI Synthesis
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Automated deep insights derived from real-time dataset calculations
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 16 }}>
        {insights.map(item => (
          <div
            key={item.id}
            style={{
              background: "rgba(13, 17, 26, 0.75)",
              border: `1px solid ${getBorderColor(item.severity)}`,
              borderRadius: 12,
              padding: 18,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              backdropFilter: "blur(12px)",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
              transition: "all 0.25s ease"
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span className={`badge ${getBadgeClass(item.severity)}`}>
                  {item.severity === "Critical" ? <ShieldAlert size={12} /> : <AlertTriangle size={12} />}
                  <span>{item.severity} Impact</span>
                </span>
                <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa" }}>
                  {item.metric}
                </span>
              </div>

              <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 14 }}>
                {item.explanation}
              </p>
            </div>

            <div style={{ paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "flex-start", gap: 6 }}>
              <Lightbulb size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong style={{ color: "#fbbf24" }}>AI Action Recommendation:</strong> {item.recommendation}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
