"use client";
import React from "react";
import { DatasetHealthProfile } from "@/lib/datamart/datamartEngine";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Layers,
  ShieldCheck
} from "lucide-react";

interface DatasetHealthProps {
  health: DatasetHealthProfile;
}

export default function DatasetHealth({ health }: DatasetHealthProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return "#10b981";
    if (score >= 75) return "#f59e0b";
    return "#ef4444";
  };

  const scoreColor = getScoreColor(health.healthScore);

  return (
    <div className="glass-card" style={{ padding: "22px 26px", marginBottom: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 28, alignItems: "center" }}>

        {/* Health Index Score Gauge */}
        <div style={{ borderRight: "1px solid var(--border)", paddingRight: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span className="font-heading" style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Data Quality Score
            </span>
            <ShieldCheck size={16} color={scoreColor} />
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
            <span className="font-heading font-mono" style={{ fontSize: 38, fontWeight: 900, color: scoreColor, letterSpacing: "-1px" }}>
              {health.healthScore}
            </span>
            <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>/ 100</span>
          </div>

          {/* Progress Bar */}
          <div style={{ width: "100%", height: 6, background: "rgba(255, 255, 255, 0.08)", borderRadius: 99, overflow: "hidden", marginBottom: 14 }}>
            <div
              style={{
                width: `${health.healthScore}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${scoreColor} 0%, #3b82f6 100%)`,
                borderRadius: 99,
                transition: "width 0.5s ease"
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
            <div className="glass-card-sm" style={{ padding: "8px 10px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Rows</div>
              <div className="font-mono" style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", marginTop: 2 }}>
                {health.rowCount.toLocaleString()}
              </div>
            </div>
            <div className="glass-card-sm" style={{ padding: "8px 10px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Columns</div>
              <div className="font-mono" style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", marginTop: 2 }}>
                {health.colCount}
              </div>
            </div>
            <div className="glass-card-sm" style={{ padding: "8px 10px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Missing</div>
              <div className="font-mono" style={{ fontWeight: 700, fontSize: 13, color: health.missingValuesCount ? "#fbbf24" : "#34d399", marginTop: 2 }}>
                {health.missingValuesCount}
              </div>
            </div>
            <div className="glass-card-sm" style={{ padding: "8px 10px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Duplicates</div>
              <div className="font-mono" style={{ fontWeight: 700, fontSize: 13, color: health.duplicateCount ? "#f87171" : "#34d399", marginTop: 2 }}>
                {health.duplicateCount}
              </div>
            </div>
          </div>
        </div>

        {/* Quality Audit Checklist */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileCheck size={18} color="var(--accent-blue)" />
              <h3 className="font-heading" style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                Automated Quality & Structure Audit
              </h3>
            </div>
            <span className="badge badge-green" style={{ fontSize: 10 }}>
              <CheckCircle2 size={12} />
              Validated
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {health.warnings.map((w, idx) => {
              const isWarn = w.type === "warning";
              return (
                <div
                  key={idx}
                  style={{
                    fontSize: 12,
                    padding: "9px 13px",
                    borderRadius: 10,
                    background: isWarn ? "rgba(245, 158, 11, 0.08)" : "rgba(16, 185, 129, 0.08)",
                    border: isWarn ? "1px solid rgba(245, 158, 11, 0.25)" : "1px solid rgba(16, 185, 129, 0.25)",
                    color: isWarn ? "#fbbf24" : "#34d399",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}
                >
                  {isWarn ? <AlertTriangle size={14} style={{ flexShrink: 0 }} /> : <CheckCircle2 size={14} style={{ flexShrink: 0 }} />}
                  <span style={{ lineHeight: 1.3 }}>{w.text}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
