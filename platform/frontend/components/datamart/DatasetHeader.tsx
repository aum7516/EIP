"use client";
import React, { useRef } from "react";
import {
  UploadCloud,
  FileText,
  Trash2,
  Zap,
  Sparkles,
  ShieldCheck,
  Database
} from "lucide-react";

interface DatasetHeaderProps {
  datasetName: string;
  rowCount: number;
  healthScore: number;
  onFileUpload: (file: File) => void;
  onResetToSample: () => void;
  onClearDataset: () => void;
  onOpenReport: () => void;
  isCustomUploaded: boolean;
}

export default function DatasetHeader({
  datasetName,
  rowCount,
  healthScore,
  onFileUpload,
  onResetToSample,
  onClearDataset,
  onOpenReport,
  isCustomUploaded
}: DatasetHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div
      className="glass-card"
      style={{
        padding: "24px 28px",
        marginBottom: 24,
        background: "linear-gradient(135deg, rgba(18, 22, 34, 0.95) 0%, rgba(13, 17, 26, 0.85) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.12)"
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
        {/* Title & Metadata */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 className="font-heading" style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
              DataMart Analytics Engine
            </h1>
            <span className="badge badge-blue" style={{ fontSize: 11, padding: "3px 10px" }}>
              <ShieldCheck size={13} />
              Enterprise v2.4
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>
              <Database size={15} color="var(--accent-blue)" />
              <span>Dataset:</span>
              <strong style={{ color: "var(--text-primary)" }}>{datasetName}</strong>
            </div>

            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>•</span>

            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--accent-cyan)", fontFamily: "JetBrains Mono" }}>
                {rowCount.toLocaleString()}
              </strong> transactions loaded
            </div>

            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>•</span>

            <div className="badge badge-green" style={{ fontSize: 11 }}>
              <Sparkles size={12} />
              Health Index: {healthScore}/100
            </div>
          </div>
        </div>

        {/* Executive Action Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.xlsx"
            style={{ display: "none" }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary"
            style={{ fontSize: 13, padding: "9px 16px" }}
          >
            <UploadCloud size={16} color="var(--accent-blue)" />
            <span>Upload New CSV</span>
          </button>

          <button
            onClick={onClearDataset}
            className="btn-secondary"
            style={{ fontSize: 13, padding: "9px 14px", color: "var(--text-secondary)" }}
          >
            <Trash2 size={15} color="var(--accent-red)" />
            <span>Clear</span>
          </button>

          {isCustomUploaded && (
            <button
              onClick={onResetToSample}
              className="btn-secondary"
              style={{ fontSize: 13, padding: "9px 14px" }}
            >
              <Zap size={15} color="var(--accent-amber)" />
              <span>Sample Data</span>
            </button>
          )}

          <button
            onClick={onOpenReport}
            className="btn-primary"
            style={{ fontSize: 13, padding: "10px 20px" }}
          >
            <FileText size={16} />
            <span>Generate Business Report</span>
          </button>
        </div>
      </div>
    </div>
  );
}
