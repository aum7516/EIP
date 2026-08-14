"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Send, ThumbsUp, ThumbsDown, Sparkles, ShoppingCart,
  Plus, Trash2, Search, Filter, ChevronRight, Bot,
  MessageSquare, Package, Star, Zap, Clock
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────── */
interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  intent?: string;
  products?: Product[];
  feedback?: "up" | "down" | null;
  created_at?: string;
}
interface Conversation { id: string; title: string; created_at: string; message_count: number; }
interface Product { id: string; name: string; category: string; price: number; stock_qty?: number; description?: string; score?: number; }

/* ─── Constants ─────────────────────────────────────── */
const INTENT_META: Record<string, { label: string; color: string; bg: string }> = {
  product_query:       { label: "🛍️ Product Search",   color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  business_data_query: { label: "📊 Data — Disabled",  color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  general_support:     { label: "💬 Platform Support", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
};

const SUGGESTIONS = [
  "Recommend a laptop under ₹50,000",
  "Show me ergonomic office chairs",
  "Best wireless earbuds available",
  "Gaming accessories under ₹5,000",
  "What is the DataMart Engine?",
  "How do I run a backtest?",
];

const CATEGORY_ICONS: Record<string, string> = {
  Electronics: "⚡",
  Furniture: "🪑",
  Accessories: "🎒",
  Appliances: "🏠",
};

/* ─── Sub-components ─────────────────────────────────── */
function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "14px 16px" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "#60a5fa",
          animation: "bounce 1.2s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`
        }} />
      ))}
    </div>
  );
}

function ProductCard({ p }: { p: Product }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      padding: 14,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      transition: "border-color 0.2s, transform 0.2s",
      cursor: "pointer",
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(79,142,247,0.5)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      <div style={{
        height: 70,
        borderRadius: 10,
        background: "linear-gradient(135deg, rgba(79,142,247,0.15) 0%, rgba(139,92,246,0.1) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 28,
      }}>
        {CATEGORY_ICONS[p.category] || "📦"}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>{p.name}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#60a5fa", padding: "2px 8px", background: "rgba(96,165,250,0.1)", borderRadius: 20, width: "fit-content" }}>
        {p.category}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#34d399" }}>
        ₹{Number(p.price).toLocaleString("en-IN")}
      </div>
      {p.description && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
          {p.description.slice(0, 70)}...
        </div>
      )}
      {p.stock_qty !== undefined && (
        <div style={{ fontSize: 11, color: p.stock_qty > 0 ? "#34d399" : "#f87171", fontWeight: 600 }}>
          {p.stock_qty > 0 ? `✓ ${p.stock_qty} in stock` : "✗ Out of stock"}
        </div>
      )}
      <button style={{
        width: "100%", padding: "7px 0", borderRadius: 8,
        background: "linear-gradient(90deg, #4f8ef7, #7c3aed)",
        border: "none", color: "#fff", fontSize: 12, fontWeight: 600,
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
      }}>
        <ShoppingCart size={12} /> View Details
      </button>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────── */
export default function AssistantPage() {
  /* Chat state */
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm **Orbit**, EIP's AI shopping assistant. 🚀\n\nI can help you:\n- 🔍 Find and compare products\n- 💡 Get personalized recommendations\n- 🗺️ Navigate the EIP platform\n\nWhat are you looking for today?",
      created_at: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState<string | undefined>();

  /* Conversations sidebar */
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);

  /* Catalog panel */
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("");
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  /* Stats */
  const [stats, setStats] = useState<any>(null);

  /* Panel visibility (mobile-friendly) */
  const [showConvPanel, setShowConvPanel] = useState(true);
  const [showCatalogPanel, setShowCatalogPanel] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Load initial data */
  useEffect(() => {
    loadConversations();
    loadCatalog();
    api.getAssistantStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadConversations = useCallback(async () => {
    setConvsLoading(true);
    try {
      const data = await api.getConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch { } finally { setConvsLoading(false); }
  }, []);

  const loadCatalog = useCallback(async (q = "", cat = "") => {
    setCatalogLoading(true);
    try {
      const data = await api.getProducts(q || undefined, cat || undefined, 20);
      setCatalogProducts(data.products || []);
      if (data.categories) setCategories(data.categories);
    } catch { } finally { setCatalogLoading(false); }
  }, []);

  /* Debounced catalog search */
  useEffect(() => {
    const t = setTimeout(() => loadCatalog(catalogQuery, catalogCategory), 350);
    return () => clearTimeout(t);
  }, [catalogQuery, catalogCategory]);

  async function sendMessage(text?: string) {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput("");
    inputRef.current?.focus();
    setMessages(m => [...m, { role: "user", content: userMsg, created_at: new Date().toISOString() }]);
    setLoading(true);
    try {
      const res = await api.chat({ conversation_id: convId, message: userMsg });
      if (res.conversation_id) {
        setConvId(res.conversation_id);
        loadConversations(); // refresh sidebar
      }
      setMessages(m => [...m, {
        id: res.message_id,
        role: "assistant",
        content: res.answer_text || "I could not generate a response.",
        intent: res.intent,
        products: res.products,
        created_at: new Date().toISOString(),
      }]);
    } catch (e: any) {
      setMessages(m => [...m, { role: "assistant", content: `⚠️ Connection error: ${e.message}`, created_at: new Date().toISOString() }]);
    }
    setLoading(false);
  }

  async function giveFeedback(msgId: string, idx: number, fb: "up" | "down") {
    try {
      await api.feedback(msgId, fb);
      setMessages(m => m.map((msg, i) => i === idx ? { ...msg, feedback: fb } : msg));
    } catch { }
  }

  async function loadConversation(conv: Conversation) {
    setConvId(conv.id);
    setLoading(true);
    try {
      const data = await api.getConversationMessages(conv.id);
      if (data.messages) {
        setMessages(data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          intent: m.intent_type,
          feedback: m.feedback,
          created_at: m.created_at,
        })));
      }
    } catch { } finally { setLoading(false); }
  }

  async function deleteConversation(convId: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await api.deleteConversation(convId);
      loadConversations();
      setConvId(undefined);
      setMessages([{ role: "assistant", content: "Hello! I'm **Orbit**, EIP's AI assistant. How can I help you today?" }]);
    } catch { }
  }

  function startNewChat() {
    setConvId(undefined);
    setMessages([{
      role: "assistant",
      content: "Hello! I'm **Orbit**, EIP's AI assistant. 🚀 What are you looking for today?",
      created_at: new Date().toISOString(),
    }]);
    inputRef.current?.focus();
  }

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        .msg-content p { margin: 4px 0; }
        .msg-content strong { color: var(--text-primary); }
        .conv-item:hover .conv-delete { opacity: 1 !important; }
      `}</style>

      <div className="fade-in" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 40px)", gap: 0 }}>

        {/* ── Page Header ─────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: "linear-gradient(135deg, #4f8ef7 0%, #7c3aed 100%)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Bot size={17} color="#fff" />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.3px" }}>Retail AI Assistant</h1>
              <span className="badge badge-purple" style={{ fontSize: 10, padding: "2px 8px" }}>
                <Sparkles size={10} /> Orbit AI
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginLeft: 40 }}>
              Product search · Recommendations · Platform guidance
            </p>
          </div>
          {/* Stats bar */}
          {stats && (
            <div style={{ display: "flex", gap: 16 }}>
              {[
                { icon: <MessageSquare size={13} />, val: stats.total_conversations, label: "Conversations" },
                { icon: <Zap size={13} />, val: stats.helpful_responses, label: "Helpful" },
                { icon: <Package size={13} />, val: stats.catalog_size, label: "Products" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center", color: "#60a5fa", fontSize: 12 }}>
                    {s.icon}
                    <span style={{ fontWeight: 800 }}>{s.val}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 3-Column Layout ─────────────────────── */}
        <div style={{ display: "flex", gap: 12, flex: 1, minHeight: 0 }}>

          {/* ── Left: Conversations Sidebar ───────── */}
          <div style={{
            width: 220,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            flexShrink: 0,
          }}>
            <button
              onClick={startNewChat}
              style={{
                width: "100%", padding: "9px 14px", borderRadius: 10,
                background: "linear-gradient(90deg, #4f8ef7, #7c3aed)",
                border: "none", color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8
              }}
            >
              <Plus size={15} /> New Chat
            </button>

            <div style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", padding: "8px 4px 4px" }}>
                History
              </div>
              {convsLoading ? (
                <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", paddingTop: 20 }}>
                  <div className="spinner" style={{ width: 16, height: 16, margin: "0 auto 8px" }} />
                  Loading...
                </div>
              ) : conversations.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", paddingTop: 20, lineHeight: 1.6 }}>
                  <MessageSquare size={24} style={{ margin: "0 auto 8px", display: "block", opacity: 0.4 }} />
                  No conversations yet
                </div>
              ) : (
                conversations.map(c => (
                  <div
                    key={c.id}
                    className="conv-item"
                    onClick={() => loadConversation(c)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: convId === c.id ? "rgba(79,142,247,0.12)" : "transparent",
                      border: `1px solid ${convId === c.id ? "rgba(79,142,247,0.3)" : "transparent"}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "all 0.15s",
                      position: "relative"
                    }}
                    onMouseEnter={e => {
                      if (convId !== c.id) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={e => {
                      if (convId !== c.id) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <ChevronRight size={11} color={convId === c.id ? "#60a5fa" : "var(--text-muted)"} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: convId === c.id ? "#60a5fa" : "var(--text-primary)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.title}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                        {c.message_count} msgs
                      </div>
                    </div>
                    <button
                      className="conv-delete"
                      onClick={(e) => deleteConversation(c.id, e)}
                      style={{
                        background: "transparent", border: "none", padding: 2,
                        cursor: "pointer", color: "#f87171", opacity: 0,
                        transition: "opacity 0.15s", borderRadius: 4, flexShrink: 0
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Center: Chat ─────────────────────────── */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            background: "rgba(255,255,255,0.015)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            overflow: "hidden",
          }}>
            {/* Chat Header */}
            <div style={{
              padding: "12px 18px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(0,0,0,0.2)",
              flexShrink: 0,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "linear-gradient(135deg, #4f8ef7, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Bot size={15} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Orbit Assistant</div>
                <div style={{ fontSize: 10, color: "#34d399", display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399" }} />
                  Online — Ready to help
                </div>
              </div>
              {convId && (
                <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)" }}>
                  Conv ID: {convId.slice(0, 8)}…
                </div>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 6 }}>
                  {/* Bubble */}
                  <div style={{
                    maxWidth: "78%",
                    padding: "12px 15px",
                    borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: msg.role === "user"
                      ? "linear-gradient(135deg, #4f8ef7 0%, #7c3aed 100%)"
                      : "rgba(255,255,255,0.05)",
                    border: msg.role === "user" ? "none" : "1px solid var(--border)",
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: msg.role === "user" ? "#fff" : "var(--text-primary)",
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.content.replace(/\*\*(.*?)\*\*/g, "$1")}
                  </div>

                  {/* Intent badge */}
                  {msg.intent && INTENT_META[msg.intent] && (
                    <span style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 20,
                      fontWeight: 600,
                      color: INTENT_META[msg.intent].color,
                      background: INTENT_META[msg.intent].bg,
                      border: `1px solid ${INTENT_META[msg.intent].color}30`
                    }}>
                      {INTENT_META[msg.intent].label}
                    </span>
                  )}

                  {/* Product cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                      gap: 10,
                      width: "100%",
                      maxWidth: 680,
                    }}>
                      {msg.products.slice(0, 5).map((p, pi) => <ProductCard key={pi} p={p} />)}
                    </div>
                  )}

                  {/* Feedback buttons */}
                  {msg.role === "assistant" && msg.id && (
                    <div style={{ display: "flex", gap: 6 }}>
                      {(["up", "down"] as const).map(fb => (
                        <button key={fb}
                          onClick={() => giveFeedback(msg.id!, idx, fb)}
                          style={{
                            background: msg.feedback === fb
                              ? fb === "up" ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)"
                              : "rgba(255,255,255,0.04)",
                            border: `1px solid ${msg.feedback === fb ? (fb === "up" ? "#34d399" : "#f87171") : "var(--border)"}`,
                            borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                            display: "inline-flex", alignItems: "center", gap: 5,
                            color: msg.feedback === fb ? (fb === "up" ? "#34d399" : "#f87171") : "var(--text-muted)",
                            fontSize: 11, fontWeight: 600, transition: "all 0.15s"
                          }}>
                          {fb === "up" ? <ThumbsUp size={11} /> : <ThumbsDown size={11} />}
                          {fb === "up" ? "Helpful" : "Not helpful"}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  {msg.created_at && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.6 }}>
                      <Clock size={9} style={{ display: "inline", marginRight: 3 }} />
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #4f8ef7, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Bot size={14} color="#fff" />
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "18px 18px 18px 4px" }}>
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggestion chips — shown when only 1 message */}
            {messages.length === 1 && (
              <div style={{ padding: "0 18px 14px", display: "flex", flexWrap: "wrap", gap: 7 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)} style={{
                    padding: "7px 13px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(79,142,247,0.5)"; (e.currentTarget as HTMLElement).style.color = "#60a5fa"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input bar */}
            <div style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: 10,
              background: "rgba(0,0,0,0.15)",
              flexShrink: 0,
            }}>
              <input
                ref={inputRef}
                style={{
                  flex: 1, padding: "11px 15px", borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)", fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                placeholder="Ask about products, features, or get recommendations..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(79,142,247,0.6)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                style={{
                  padding: "11px 20px", borderRadius: 12,
                  background: "linear-gradient(135deg, #4f8ef7 0%, #7c3aed 100%)",
                  border: "none", color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  opacity: loading || !input.trim() ? 0.5 : 1,
                  display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
                  transition: "opacity 0.2s",
                }}
              >
                {loading ? <div className="spinner" style={{ width: 15, height: 15 }} /> : <><Send size={14} /> Send</>}
              </button>
            </div>
          </div>

          {/* ── Right: Product Catalog Panel ───────── */}
          <div style={{
            width: 260,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            flexShrink: 0,
          }}>
            {/* Search + filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  style={{
                    width: "100%", padding: "9px 12px 9px 30px", borderRadius: 10,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box",
                    outline: "none",
                  }}
                  placeholder="Search catalog..."
                  value={catalogQuery}
                  onChange={e => setCatalogQuery(e.target.value)}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(79,142,247,0.6)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => setCatalogCategory("")} style={{
                  padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: catalogCategory === "" ? "rgba(79,142,247,0.2)" : "transparent",
                  border: `1px solid ${catalogCategory === "" ? "rgba(79,142,247,0.5)" : "var(--border)"}`,
                  color: catalogCategory === "" ? "#60a5fa" : "var(--text-muted)",
                  cursor: "pointer"
                }}>All</button>
                {categories.map(cat => (
                  <button key={cat} onClick={() => setCatalogCategory(cat === catalogCategory ? "" : cat)} style={{
                    padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: catalogCategory === cat ? "rgba(79,142,247,0.2)" : "transparent",
                    border: `1px solid ${catalogCategory === cat ? "rgba(79,142,247,0.5)" : "var(--border)"}`,
                    color: catalogCategory === cat ? "#60a5fa" : "var(--text-muted)",
                    cursor: "pointer"
                  }}>
                    {CATEGORY_ICONS[cat] || ""} {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                <Package size={11} style={{ display: "inline", marginRight: 4 }} />
                Catalog ({catalogProducts.length})
              </div>
            </div>

            {/* Product grid */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {catalogLoading ? (
                <div style={{ textAlign: "center", paddingTop: 30 }}>
                  <div className="spinner" style={{ width: 20, height: 20, margin: "0 auto 10px" }} />
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading catalog...</div>
                </div>
              ) : catalogProducts.length === 0 ? (
                <div style={{ textAlign: "center", paddingTop: 30, color: "var(--text-muted)", fontSize: 12 }}>
                  <Package size={28} style={{ display: "block", margin: "0 auto 8px", opacity: 0.3 }} />
                  No products found
                </div>
              ) : (
                catalogProducts.map((p, i) => <ProductCard key={i} p={p} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
