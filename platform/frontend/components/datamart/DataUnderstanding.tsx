"use client";
import React from "react";
import { SemanticMetricModel, SemanticMetricInfo } from "@/lib/datamart/datamartEngine";
import {
  Cpu,
  CheckCircle2,
  Zap,
  AlertCircle,
  Code2
} from "lucide-react";

interface DataUnderstandingProps {
  semanticModel: SemanticMetricModel;
}

export default function DataUnderstanding({ semanticModel }: DataUnderstandingProps) {
  const metrics: SemanticMetricInfo[] = Object.values(semanticModel);

  const availableList = metrics.filter(m => m.status === "AVAILABLE");
  const derivableList = metrics.filter(m => m.status === "DERIVABLE");
  const unavailableList = metrics.filter(m => m.status === "UNAVAILABLE");

  return (
    <div className="glass-card" style={{ padding: "22px 26px", marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Cpu size={20} color="var(--accent-blue)" />
            <h2 className="font-heading" style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
              Data Understanding & Semantic Engine
            </h2>
            <span className="badge badge-purple" style={{ fontSize: 11 }}>
              Deterministic Model Mapping
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Transparent status of direct, derived, and unavailable business metrics (Zero hallucinated data)
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>

        {/* Direct Available Metrics */}
        <div style={{ background: "rgba(13, 17, 26, 0.7)", padding: 18, borderRadius: 12, border: "1px solid rgba(16, 185, 129, 0.2)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#34d399", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={16} />
              <span>Direct CSV Metrics</span>
            </div>
            <span className="badge badge-green" style={{ fontSize: 10 }}>{availableList.length}</span>
          </div>
          {availableList.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {availableList.map(m => (
                <div key={m.metricKey} className="glass-card-sm" style={{ padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{m.label}</span>
                  <span className="badge badge-green" style={{ fontSize: 10 }}>Direct Column</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No direct metrics found</div>
          )}
        </div>

        {/* Derived Formula Metrics */}
        <div style={{ background: "rgba(13, 17, 26, 0.7)", padding: 18, borderRadius: 12, border: "1px solid rgba(59, 130, 246, 0.2)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Zap size={16} />
              <span>Formula Derived Metrics</span>
            </div>
            <span className="badge badge-blue" style={{ fontSize: 10 }}>{derivableList.length}</span>
          </div>
          {derivableList.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {derivableList.map(m => (
                <div key={m.metricKey} className="glass-card-sm" style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{m.label}</span>
                    <span className="badge badge-blue" style={{ fontSize: 10 }}>Auto-Calculated</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#60a5fa", fontFamily: "JetBrains Mono", display: "flex", alignItems: "center", gap: 4 }}>
                    <Code2 size={12} />
                    <span>{m.formula}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No derived metrics computed</div>
          )}
        </div>

        {/* Unavailable Metrics */}
        <div style={{ background: "rgba(13, 17, 26, 0.7)", padding: 18, borderRadius: 12, border: "1px solid rgba(239, 68, 68, 0.2)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f87171", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <AlertCircle size={16} />
              <span>Unavailable Metrics</span>
            </div>
            <span className="badge badge-red" style={{ fontSize: 10 }}>{unavailableList.length}</span>
          </div>
          {unavailableList.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {unavailableList.map(m => (
                <div key={m.metricKey} className="glass-card-sm" style={{ padding: "10px 12px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, color: "var(--text-muted)", fontSize: 13 }}>{m.label}</span>
                    <span className="badge badge-red" style={{ fontSize: 10 }}>Missing Data</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#f87171", marginTop: 2 }}>
                    {m.reasonIfUnavailable}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#34d399", fontWeight: 500, display: "flex", alignItems: "center", gap: 6, paddingTop: 6 }}>
              <CheckCircle2 size={15} />
              <span>All enterprise metrics fully supported!</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
