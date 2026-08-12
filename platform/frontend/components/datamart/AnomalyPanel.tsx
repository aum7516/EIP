"use client";
import React from "react";
import { AnomalyItem } from "@/lib/datamart/datamartEngine";
import { AlertOctagon, Zap, CheckCircle2, ShieldAlert } from "lucide-react";

interface AnomalyPanelProps {
  anomalies: AnomalyItem[];
}

export default function AnomalyPanel({ anomalies }: AnomalyPanelProps) {
  if (!anomalies.length) return null;

  return (
    <div className="glass-card" style={{ padding: 26, marginBottom: 24, border: "1px solid rgba(239, 68, 68, 0.25)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertOctagon size={18} color="#f87171" />
            </div>
            <h2 className="font-heading" style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary)" }}>
              Statistical Anomaly Detection
            </h2>
            <span className="badge badge-red" style={{ fontSize: 11 }}>
              <ShieldAlert size={12} /> {anomalies.length} Outliers Detected
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Automated z-score variance analysis & statistical outlier flags
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {anomalies.map(anom => (
          <div
            key={anom.id}
            style={{
              background: "rgba(239, 68, 68, 0.06)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: 12,
              padding: 18,
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <h4 className="font-heading" style={{ fontSize: 14, fontWeight: 800, color: "#f87171", display: "flex", alignItems: "center", gap: 6 }}>
                <Zap size={14} color="#f87171" />
                <span>{anom.title}</span>
              </h4>
              <span className="badge badge-red" style={{ fontSize: 10 }}>
                {anom.regionOrCategory}
              </span>
            </div>

            <div className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              {anom.primaryMetric}: <span style={{ color: "#fbbf24" }}>{anom.metricValue}</span>
            </div>

            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
              <strong style={{ color: "var(--text-primary)" }}>Contributing Cause:</strong> {anom.contributingFactor}
            </p>

            <div style={{ fontSize: 11, color: "#34d399", fontWeight: 600, paddingTop: 10, borderTop: "1px solid rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "flex-start", gap: 6 }}>
              <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>Recommended Action: {anom.recommendation}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
