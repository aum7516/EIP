const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("orbit_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ access_token: string; user_id: string; email: string; role: string }>(
      "/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }
    ),
  signup: (email: string, password: string, role?: string) =>
    request<{ access_token: string; user_id: string; email: string; role: string }>(
      "/auth/signup", { method: "POST", body: JSON.stringify({ email, password, role }) }
    ),
  me: () => request<{ id: string; email: string; role: string }>("/auth/me"),

  // Backtesting
  getStrategies: () => request<any[]>("/backtest/strategies"),
  getTickers: () => request<{ preloaded: string[] }>("/backtest/tickers"),
  getTickerInfo: (ticker: string) => request<{ ticker: string; start_date: string; end_date: string; row_count: number; is_preloaded: boolean }>(`/backtest/ticker-info/${encodeURIComponent(ticker)}`),
  uploadBacktestCSV: (file: File, customTicker?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (customTicker) formData.append("custom_ticker", customTicker);
    return request<{ ticker: string; row_count: number; start_date: string; end_date: string; message: string }>(
      "/backtest/upload", { method: "POST", body: formData }
    );
  },
  runBacktest: (body: any) => request<{ run_id: string; status: string }>("/backtest/run", { method: "POST", body: JSON.stringify(body) }),
  getBacktestResults: (runId: string) => request<any>(`/backtest/results/${runId}`),
  getBacktestHistory: () => request<any[]>("/backtest/history"),
  deleteBacktestRun: (runId: string) => request<any>(`/backtest/history/${runId}`, { method: "DELETE" }),

  // DataMart
  getKPIs: () => request<any>("/datamart/kpis"),
  filterData: (body: any) => request<any>("/datamart/filter", { method: "POST", body: JSON.stringify(body) }),
  askNL: (question: string) => request<any>("/datamart/ask", { method: "POST", body: JSON.stringify({ question }) }),

  // Assistant
  chat: (body: { conversation_id?: string; message: string }) =>
    request<any>("/assistant/chat", { method: "POST", body: JSON.stringify(body) }),
  feedback: (message_id: string, feedback: "up" | "down") =>
    request<any>("/assistant/feedback", { method: "POST", body: JSON.stringify({ message_id, feedback }) }),
};
