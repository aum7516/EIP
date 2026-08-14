"use client";
import React, { useState } from "react";
import { TransactionRecord } from "@/lib/datamart/sampleData";
import { askNexusAnalyst, SemanticMetricModel } from "@/lib/datamart/datamartEngine";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface AIAnalystProps {
  records: TransactionRecord[];
  semanticModel?: SemanticMetricModel;
}

const SAMPLE_QUESTIONS = [
  "Which category generated the most revenue?",
  "Which region performs best by revenue?",
  "Show me top 10 products by revenue",
  "What is the total profit margin?",
  "Compare North vs West performance"
];

export default function AIAnalyst({ records, semanticModel }: AIAnalystProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{
    answerText: string;
    chartData: { label: string; value: number }[];
    chartType: string;
  } | null>(null);

  const handleAsk = (qStr?: string) => {
    const targetQ = qStr || question;
    if (!targetQ.trim()) return;

    setLoading(true);
    setTimeout(() => {
      // Default semantic model fallback if omitted
      const defaultModel = semanticModel || {
        revenue: { metricKey: "revenue", label: "Revenue", status: "AVAILABLE" },
        profit: { metricKey: "profit", label: "Profit", status: "AVAILABLE" },
        cost: { metricKey: "cost", label: "Cost", status: "AVAILABLE" },
        profitMargin: { metricKey: "profitMargin", label: "Profit Margin", status: "AVAILABLE" },
        unitsSold: { metricKey: "unitsSold", label: "Units Sold", status: "AVAILABLE" },
        avgOrderValue: { metricKey: "avgOrderValue", label: "AOV", status: "AVAILABLE" },
        unitPrice: { metricKey: "unitPrice", label: "Unit Price", status: "AVAILABLE" },
        quantity: { metricKey: "quantity", label: "Quantity", status: "AVAILABLE" },
        discount: { metricKey: "discount", label: "Discount", status: "AVAILABLE" }
      };

      const res = askNexusAnalyst(targetQ, records, defaultModel);
      setResponse(res);
      setLoading(false);
    }, 300);
  };

  return (
    <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>Ask NEXUS - AI Data Analyst</h2>
          <span className="badge badge-blue">
            🤖 Natural Language Engine
          </span>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>
        Ask any natural language question. NEXUS evaluates metric availability before querying (zero hallucinated metrics).
      </p>

      {/* Suggested chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {SAMPLE_QUESTIONS.map((sq, i) => (
          <button
            key={i}
            onClick={() => {
              setQuestion(sq);
              handleAsk(sq);
            }}
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--bg-secondary)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            💬 {sq}
          </button>
        ))}
      </div>

      {/* Input box */}
      <div style={{ display: "flex", gap: 10 }}>
        <input
          type="text"
          className="input-field"
          placeholder="Ask anything about your transactional dataset..."
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAsk()}
        />
        <button
          onClick={() => handleAsk()}
          className="btn-primary"
          style={{ whiteSpace: "nowrap", padding: "10px 20px" }}
          disabled={loading}
        >
          {loading ? "Analyzing..." : "Ask NEXUS ⚡"}
        </button>
      </div>

      {/* Answer Output */}
      {response && (
        <div className="fade-in" style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
          <div
            style={{
              padding: 16,
              background: "var(--bg-card-hover)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--text-primary)",
              marginBottom: 16
            }}
          >
            {response.answerText}
          </div>

          {response.chartData.length > 0 && (
            <div style={{ background: "var(--bg-secondary)", padding: 14, borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase" }}>
                Supporting Query Result Chart
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={response.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={v => `₹${(v / 100000).toFixed(1)}L`} />
                  <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="value" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
