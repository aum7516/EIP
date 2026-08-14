const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("orbit_token");
}

function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("orbit_token", token);
  }
}

export async function ensureDemoToken(): Promise<string> {
  let token = getToken();
  if (token) return token;

  try {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "analyst@orbit.com", password: "demoPassword123!", role: "analyst" }),
    });

    if (!res.ok) {
      // Try login if signup says already registered
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "analyst@orbit.com", password: "demoPassword123!" }),
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        if (loginData.access_token) {
          setToken(loginData.access_token);
          return loginData.access_token;
        }
      }
    } else {
      const data = await res.json();
      if (data.access_token) {
        setToken(data.access_token);
        return data.access_token;
      }
    }
  } catch (err) {
    console.error("Failed to fetch demo token:", err);
  }
  return "";
}

async function request<T>(path: string, options: RequestInit = {}, retryOn401 = true): Promise<T> {
  let token = getToken();
  if (!token && !path.startsWith("/auth/")) {
    token = await ensureDemoToken();
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retryOn401 && !path.startsWith("/auth/")) {
    // Clear stale token, acquire fresh demo token, and retry once
    if (typeof window !== "undefined") localStorage.removeItem("orbit_token");
    const newToken = await ensureDemoToken();
    if (newToken) {
      return request<T>(path, options, false);
    }
  }

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
  runBacktest: (body: any) => request<{ run_id: string; status: string }>("/backtest/run", { method: "POST", body: JSON.stringify(body) }),
  getBacktestResults: (runId: string) => request<any>(`/backtest/results/${runId}`),
  getBacktestHistory: () => request<any[]>("/backtest/history"),

  // DataMart
  ingestCSV: async (file: File) => {
    let token = getToken() || (await ensureDemoToken());
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}/datamart/ingest`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Upload failed");
    }
    return res.json();
  },
  getKPIs: () => request<any>("/datamart/kpis"),
  filterData: (body: any) => request<any>("/datamart/filter", { method: "POST", body: JSON.stringify(body) }),
  askNL: (question: string) => request<any>("/datamart/ask", { method: "POST", body: JSON.stringify({ question }) }),

  // Assistant
  chat: (body: { conversation_id?: string; message: string }) =>
    request<any>("/assistant/chat", { method: "POST", body: JSON.stringify(body) }),
  feedback: (message_id: string, feedback: "up" | "down") =>
    request<any>("/assistant/feedback", { method: "POST", body: JSON.stringify({ message_id, feedback }) }),
};

