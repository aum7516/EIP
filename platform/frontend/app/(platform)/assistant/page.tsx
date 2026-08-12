"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  intent?: string;
  products?: any[];
  chart_data?: any[];
  feedback?: "up" | "down" | null;
}

const INTENT_COLORS: Record<string, string> = {
  product_query: "badge-green",
  business_data_query: "badge-blue",
  general_support: "badge-amber"
};
const INTENT_LABELS: Record<string, string> = {
  product_query: "??? Product RAG",
  business_data_query: "?? Shared SQL Engine",
  general_support: "?? General"
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm Orbit, EIP's intelligent assistant. I can help you find products, check sales analytics, or answer general platform questions. What would you like to know?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  const SUGGESTIONS = [
    "Recommend a good laptop under ?50,000",
    "What was total revenue last quarter?",
    "Show me trending products this week",
    "Which region has the highest sales?"
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput("");
    setMessages(m => [...m, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const res = await api.chat({ conversation_id: convId, message: userMsg });
      if (res.conversation_id) setConvId(res.conversation_id);
      setMessages(m => [...m, {
        id: res.message_id,
        role: "assistant",
        content: res.answer_text || "I could not generate a response.",
        intent: res.intent,
        products: res.products,
        chart_data: res.chart_data
      }]);
    } catch (e: any) {
      setMessages(m => [...m, { role: "assistant", content: `Error: ${e.message}` }]);
    }
    setLoading(false);
  }

  async function giveFeedback(msgId: string, idx: number, fb: "up" | "down") {
    try {
      await api.feedback(msgId, fb);
      setMessages(m => m.map((msg, i) => i === idx ? { ...msg, feedback: fb } : msg));
    } catch {}
  }

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Retail AI Assistant</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: 14 }}>
          RAG-powered product recommendations + live business data queries � Grounded, not hallucinated
        </p>
      </div>

      {/* Chat window */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 16 }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 6 }}>
            {/* Bubble */}
            <div className={msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"} style={{ maxWidth: "72%" }}>
              {msg.content}
            </div>

            {/* Intent badge */}
            {msg.intent && (
              <span className={`badge ${INTENT_COLORS[msg.intent] || "badge-amber"}`} style={{ fontSize: 11 }}>
                {INTENT_LABELS[msg.intent] || msg.intent}
              </span>
            )}

            {/* Product cards */}
            {msg.products && msg.products.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, maxWidth: "100%" }}>
                {msg.products.map((p, pi) => (
                  <div key={pi} className="product-card" style={{ width: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{p.category}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent-green)", marginBottom: 8 }}>
                      ?{Number(p.price).toLocaleString("en-IN")}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: 10 }}>{p.description?.slice(0, 80)}�</div>
                    <button className="btn-primary" style={{ width: "100%", fontSize: 12, padding: "6px 0" }}>Add to Cart</button>
                  </div>
                ))}
              </div>
            )}

            {/* Chart from business query */}
            {msg.chart_data && msg.chart_data.length > 0 && (
              <div style={{ width: 400, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={msg.chart_data}>
                    <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Bar dataKey="value" fill="#4f8ef7" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Feedback */}
            {msg.role === "assistant" && msg.id && (
              <div style={{ display: "flex", gap: 8 }}>
                {[["up","??"], ["down","??"]].map(([fb, emoji]) => (
                  <button key={fb} onClick={() => giveFeedback(msg.id!, idx, fb as "up"|"down")}
                    style={{
                      background: msg.feedback === fb ? (fb === "up" ? "var(--accent-green-glow)" : "rgba(239,68,68,0.1)") : "var(--bg-card-hover)",
                      border: `1px solid ${msg.feedback === fb ? (fb === "up" ? "var(--accent-green)" : "var(--accent-red)") : "var(--border)"}`,
                      borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 13
                    }}>{emoji}</button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="chat-bubble-assistant" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="spinner" style={{ width: 14, height: 14 }} /> Thinking�
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => sendMessage(s)}
              className="btn-secondary" style={{ fontSize: 12, padding: "6px 14px" }}>{s}</button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div style={{ display: "flex", gap: 12, padding: "16px 0 0", borderTop: "1px solid var(--border-subtle)" }}>
        <input
          className="input-field"
          placeholder="Ask about products, sales trends, or anything about EIP�"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          disabled={loading}
        />
        <button className="btn-primary" style={{ whiteSpace: "nowrap", minWidth: 100 }}
          onClick={() => sendMessage()} disabled={loading || !input.trim()}>
          {loading ? <div className="spinner" style={{ display: "inline-block", width: 16, height: 16 }} /> : "Send ?"}
        </button>
      </div>
    </div>
  );
}
