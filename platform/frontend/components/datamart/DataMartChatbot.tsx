"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { TransactionRecord } from "@/lib/datamart/sampleData";
import {
  askNexusAnalyst,
  generateContextualQuestions,
  SemanticMetricModel
} from "@/lib/datamart/datamartEngine";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Sparkles, Send, Bot, User, RefreshCw, BarChart2, Lightbulb } from "lucide-react";

interface DataMartChatbotProps {
  records: TransactionRecord[];
  semanticModel?: SemanticMetricModel;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  chartData?: { label: string; value: number }[];
  timestamp: string;
}

export default function DataMartChatbot({ records, semanticModel }: DataMartChatbotProps) {
  const contextualGroup = useMemo(() => generateContextualQuestions(records), [records]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initialize welcoming assistant message when dataset changes
  useEffect(() => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages([
      {
        id: "msg-welcome",
        role: "assistant",
        text: `Hello! I am your **DataMart Contextual AI Assistant**. I analyzed your uploaded CSV file and detected **${contextualGroup.badgeLabel}**.\n\nClick any suggested question below or ask me anything about your dataset!`,
        timestamp: timeStr
      }
    ]);
  }, [records, contextualGroup.badgeLabel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = (qStr?: string) => {
    const questionText = qStr || input.trim();
    if (!questionText || loading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: questionText,
      timestamp: timeStr
    };

    setMessages(prev => [...prev, userMsg]);
    if (!qStr) setInput("");
    setLoading(true);

    setTimeout(() => {
      const defaultModel: SemanticMetricModel = semanticModel || {
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

      const res = askNexusAnalyst(questionText, records, defaultModel);

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: res.answerText,
        chartData: res.chartData.length > 0 ? res.chartData : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
      setLoading(false);
    }, 250);
  };

  const formatText = (txt: string) => {
    // Simple bold formatting replacement for **text**
    const parts = txt.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} style={{ color: "#60a5fa" }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="glass-card" style={{ padding: 24, marginBottom: 32, borderRadius: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(59, 130, 246, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={20} color="#60a5fa" />
          </div>
          <div>
            <h3 className="font-heading" style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
              DataMart AI Chatbot & Contextual Assistant
            </h3>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              Smart queries customized to your uploaded CSV content & data fields
            </div>
          </div>
        </div>

        {/* Domain Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="badge badge-purple" style={{ fontSize: 12, padding: "5px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span>{contextualGroup.badgeIcon}</span>
            <span>{contextualGroup.badgeLabel}</span>
          </span>
        </div>
      </div>

      {/* Suggested Questions based on CSV datatype/domain */}
      <div style={{ marginBottom: 18, padding: 14, background: "rgba(255, 255, 255, 0.02)", borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
          <Lightbulb size={14} color="#fbbf24" />
          <span>Smart Questions Tailored to your CSV ({contextualGroup.domain}):</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {contextualGroup.questions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              disabled={loading}
              style={{
                fontSize: 12,
                padding: "6px 14px",
                borderRadius: 14,
                border: "1px solid rgba(59, 130, 246, 0.3)",
                background: "rgba(59, 130, 246, 0.08)",
                color: "#93c5fd",
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                textAlign: "left"
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(59, 130, 246, 0.2)";
                (e.currentTarget as HTMLElement).style.borderColor = "#60a5fa";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(59, 130, 246, 0.08)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(59, 130, 246, 0.3)";
              }}
            >
              💬 {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div style={{
        minHeight: 180,
        maxHeight: 380,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        paddingRight: 4,
        marginBottom: 16
      }}>
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              gap: 6
            }}
          >
            {/* Role Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)", padding: "0 4px" }}>
              {msg.role === "user" ? <User size={12} /> : <Bot size={12} color="#60a5fa" />}
              <span>{msg.role === "user" ? "You" : "DataMart AI Assistant"}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>

            {/* Bubble */}
            <div
              className={msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}
              style={{
                maxWidth: "85%",
                fontSize: 14,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap"
              }}
            >
              {formatText(msg.text)}
            </div>

            {/* Supporting Chart visualization if present */}
            {msg.chartData && msg.chartData.length > 0 && (
              <div
                className="glass-card fade-in"
                style={{
                  width: "100%",
                  maxWidth: 580,
                  padding: 16,
                  borderRadius: 12,
                  marginTop: 6,
                  border: "1px solid var(--border)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
                  <BarChart2 size={15} color="#60a5fa" /> Supporting Query Result Chart
                </div>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={msg.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={v => `₹${(v / 100000).toFixed(1)}L`} />
                    <Tooltip contentStyle={{ background: "rgba(18, 22, 34, 0.95)", border: "1px solid var(--border)", borderRadius: 8, color: "#fff" }} />
                    <Bar dataKey="value" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10 }}>
            <div className="spinner" style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Analyzing CSV metrics & executing query...
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input box */}
      <div style={{ display: "flex", gap: 10 }}>
        <input
          type="text"
          className="input-field"
          placeholder={`Ask anything about your CSV dataset (${contextualGroup.domain})...`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          disabled={loading}
          style={{ borderRadius: 12, padding: "12px 16px" }}
        />
        <button
          onClick={() => handleSend()}
          className="btn-primary"
          style={{ whiteSpace: "nowrap", padding: "12px 22px", borderRadius: 12, display: "flex", alignItems: "center", gap: 8 }}
          disabled={loading || !input.trim()}
        >
          {loading ? <RefreshCw size={16} className="spin" /> : <><Send size={16} /> Ask Chatbot</>}
        </button>
      </div>
    </div>
  );
}
