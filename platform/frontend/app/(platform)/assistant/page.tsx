"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { Send, ThumbsUp, ThumbsDown, Sparkles, ShoppingCart } from "lucide-react";

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
  product_query: "🛍️ Product Support",
  business_data_query: "🔒 Data Queries Disabled",
  general_support: "💬 Platform Guidance"
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm Orbit, EIP's assistant. I can help you with product queries, navigation, and general support. (Note: DataMart SQL data operations are disabled in this tab)." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  const SUGGESTIONS = [
    "Recommend a good laptop under ₹50,000",
    "How do I use the DataMart Workspace?",
    "What features are included in Orbit EIP?",
    "How do I run a strategy backtest?"
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
      setMessages(m => [...m, { role: "assistant", content: `Error connecting to backend: ${e.message}` }]);
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
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)", paddingBottom: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span className="badge badge-purple" style={{ fontSize: 11, padding: "3px 10px" }}>
            <Sparkles size={13} /> Active Endpoint: /assistant/chat (Platform Support)
          </span>
        </div>
        <h1 className="font-heading" style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px" }}>
          Retail AI Assistant Workspace
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: 14 }}>
          Product search & general platform support guidance engine. Data operations are disabled in this workspace.
        </p>
      </div>

      {/* Chat window */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingRight: 4, paddingBottom: 16 }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
            {/* Bubble */}
            <div className={msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"} style={{ maxWidth: "75%", fontSize: 14, lineHeight: 1.5 }}>
              {msg.content}
            </div>

            {/* Intent badge */}
            {msg.intent && (
              <span className={`badge ${INTENT_COLORS[msg.intent] || "badge-amber"}`} style={{ fontSize: 11 }}>
                {INTENT_LABELS[msg.intent] || msg.intent}
              </span>
            )}

            {/* Product cards from RAG backend */}
            {msg.products && msg.products.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, width: "100%", maxWidth: 720 }}>
                {msg.products.map((p, pi) => (
                  <div key={pi} className="glass-card" style={{ padding: 14, borderRadius: 12, border: "1px solid var(--border)" }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)", marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 600, marginBottom: 8 }}>{p.category}</div>
                    <div style={{ fontSize: 17, fontWeight: 900, color: "#34d399", marginBottom: 8 }}>
                      ₹{Number(p.price || p.unit_price || 0).toLocaleString("en-IN")}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: 12 }}>
                      {p.description ? p.description.slice(0, 90) + "..." : "High performance item with standard enterprise warranty."}
                    </div>
                    <button className="btn-primary" style={{ width: "100%", fontSize: 12, padding: "7px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <ShoppingCart size={13} /> View Product
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Feedback buttons */}
            {msg.role === "assistant" && msg.id && (
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                <button
                  onClick={() => giveFeedback(msg.id!, idx, "up")}
                  style={{
                    background: msg.feedback === "up" ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.05)",
                    border: `1px solid ${msg.feedback === "up" ? "#10b981" : "var(--border)"}`,
                    borderRadius: 6,
                    padding: "4px 10px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: msg.feedback === "up" ? "#10b981" : "var(--text-secondary)",
                    fontSize: 12
                  }}
                >
                  <ThumbsUp size={13} /> Helpful
                </button>
                <button
                  onClick={() => giveFeedback(msg.id!, idx, "down")}
                  style={{
                    background: msg.feedback === "down" ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.05)",
                    border: `1px solid ${msg.feedback === "down" ? "#ef4444" : "var(--border)"}`,
                    borderRadius: 6,
                    padding: "4px 10px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: msg.feedback === "down" ? "#ef4444" : "var(--text-secondary)",
                    fontSize: 12
                  }}
                >
                  <ThumbsDown size={13} /> Unhelpful
                </button>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="chat-bubble-assistant" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="spinner" style={{ width: 14, height: 14 }} /> Processing request...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s)}
              className="btn-secondary"
              style={{ fontSize: 12, padding: "8px 14px", borderRadius: 10, background: "rgba(255, 255, 255, 0.04)" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div style={{ display: "flex", gap: 12, padding: "16px 0 0", borderTop: "1px solid var(--border)" }}>
        <input
          className="input-field"
          placeholder="Ask about products, platform features, or platform navigation..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          disabled={loading}
          style={{ borderRadius: 12, padding: "12px 16px" }}
        />
        <button
          className="btn-primary"
          style={{ whiteSpace: "nowrap", minWidth: 110, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <><Send size={15} /> Send</>}
        </button>
      </div>
    </div>
  );
}
