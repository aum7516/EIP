"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine
} from "recharts";

type Step = "data" | "strategy" | "run" | "results";

export default function BacktestingPage() {
  const [step, setStep] = useState<Step>("data");
  const [strategies, setStrategies] = useState<any[]>([]);
  const [tickers, setTickers] = useState<string[]>([]);
  const [selectedTicker, setSelectedTicker] = useState("AAPL");
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null);
  const [params, setParams] = useState<Record<string, number>>({});
  const [dateRange, setDateRange] = useState({ start: "2020-01-01", end: "2024-12-31", split: "2022-12-31" });
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const pollRef = useRef<any>(null);

  useEffect(() => {
    api.getStrategies().then(s => { setStrategies(s); if (s[0]) { setSelectedStrategy(s[0]); initParams(s[0]); } });
    api.getTickers().then(t => setTickers(t.preloaded));
    api.getBacktestHistory().then(setHistory).catch(() => {});
  }, []);

  function initParams(strat: any) {
    const def: Record<string, number> = {};
    Object.entries(strat.parameters || {}).forEach(([k, v]: any) => { def[k] = v.default; });
    setParams(def);
  }

  async function startRun() {
    if (!selectedStrategy) return;
    setRunning(true); setError(""); setResult(null);
    try {
      const { run_id } = await api.runBacktest({
        ticker: selectedTicker,
        strategy_id: selectedStrategy.id,
        start_date: dateRange.start,
        end_date: dateRange.end,
        split_date: dateRange.split,
        parameters: params
      });
      setRunId(run_id);
      setStep("run");
      pollRef.current = setInterval(async () => {
        const res = await api.getBacktestResults(run_id);
        if (res.status === "completed" || res.status === "failed") {
          clearInterval(pollRef.current);
          setRunning(false);
          if (res.status === "completed") { setResult(res); setStep("results"); api.getBacktestHistory().then(setHistory); }
          else setError(res.error || "Backtest failed");
        }
      }, 2000);
    } catch (e: any) { setError(e.message); setRunning(false); }
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const fmt = (v: number, suffix = "") => `${v > 0 ? "+" : ""}${v.toFixed(2)}${suffix}`;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Strategy Backtesting</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: 14 }}>
          Evaluate trading strategies with guaranteed look-ahead bias prevention
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {(["data","strategy","run","results"] as Step[]).map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: step === s ? "linear-gradient(135deg,#4f8ef7,#7c3aed)" : ["data","strategy","run","results"].indexOf(step) > i ? "var(--accent-green)" : "var(--bg-card)",
              border: `1px solid ${step === s ? "transparent" : "var(--border)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: step === s || ["data","strategy","run","results"].indexOf(step) > i ? "white" : "var(--text-muted)"
            }}>{["data","strategy","run","results"].indexOf(step) > i ? "?" : i + 1}</div>
            <span style={{ fontSize: 13, color: step === s ? "var(--text-primary)" : "var(--text-muted)", fontWeight: step === s ? 600 : 400 }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < 3 && <div style={{ width: 32, height: 1, background: "var(--border)" }} />}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        {/* Main panel */}
        <div>
          {/* Step 1: Data selection */}
          {step === "data" && (
            <div className="glass-card fade-in" style={{ padding: 28 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>1 � Select Market Data</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Ticker / Instrument</label>
                  <select className="input-field" value={selectedTicker} onChange={e => setSelectedTicker(e.target.value)}>
                    {tickers.map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="custom">+ Custom yfinance ticker</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Data Source</label>
                  <div className="input-field" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)" }}>
                    <span>??</span> Preloaded CSV (demo-safe)
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Start Date</label>
                  <input type="date" className="input-field" value={dateRange.start} onChange={e => setDateRange(d => ({ ...d, start: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>End Date</label>
                  <input type="date" className="input-field" value={dateRange.end} onChange={e => setDateRange(d => ({ ...d, end: e.target.value }))} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>
                    Train / Test Split Date
                    <span style={{ marginLeft: 8, color: "var(--text-muted)", fontWeight: 400 }}>� data before this date = train; after = test (out-of-sample)</span>
                  </label>
                  <input type="date" className="input-field" value={dateRange.split} onChange={e => setDateRange(d => ({ ...d, split: e.target.value }))} />
                </div>
              </div>
              <button className="btn-primary" style={{ marginTop: 24 }} onClick={() => setStep("strategy")}>Next: Choose Strategy ?</button>
            </div>
          )}

          {/* Step 2: Strategy */}
          {step === "strategy" && (
            <div className="glass-card fade-in" style={{ padding: 28 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>2 � Define Strategy</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                {strategies.map(s => (
                  <div key={s.id} onClick={() => { setSelectedStrategy(s); initParams(s); }}
                    style={{
                      padding: 16, borderRadius: 10, cursor: "pointer",
                      border: `2px solid ${selectedStrategy?.id === s.id ? "var(--accent-blue)" : "var(--border)"}`,
                      background: selectedStrategy?.id === s.id ? "var(--accent-blue-glow)" : "var(--bg-card-hover)",
                      transition: "all 0.15s"
                    }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{s.description}</div>
                    {selectedStrategy?.id === s.id && <span className="badge badge-blue" style={{ marginTop: 10 }}>Selected</span>}
                  </div>
                ))}
              </div>

              {selectedStrategy && (
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: "var(--text-secondary)" }}>PARAMETERS</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {Object.entries(selectedStrategy.parameters || {}).map(([key, meta]: any) => (
                      <div key={key}>
                        <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                          <span>{meta.label}</span>
                          <span style={{ color: "var(--accent-blue)", fontWeight: 700 }}>{params[key] ?? meta.default}</span>
                        </label>
                        <input type="range" min={meta.min} max={meta.max} step={1}
                          value={params[key] ?? meta.default}
                          onChange={e => setParams(p => ({ ...p, [key]: +e.target.value }))}
                          style={{ width: "100%", accentColor: "var(--accent-blue)" }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                <button className="btn-secondary" onClick={() => setStep("data")}>? Back</button>
                <button className="btn-primary" onClick={startRun} disabled={!selectedStrategy}>Run Backtest ?</button>
              </div>
            </div>
          )}

          {/* Step 3: Running */}
          {step === "run" && (
            <div className="glass-card fade-in" style={{ padding: 48, textAlign: "center" }}>
              <div className="spinner" style={{ margin: "0 auto 20px", width: 40, height: 40, borderWidth: 3 }} />
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Running Backtest�</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                {selectedStrategy?.name} on {selectedTicker} � Bias guard active ?
              </p>
              {error && <div style={{ marginTop: 20, color: "var(--accent-red)", background: "rgba(239,68,68,0.1)", padding: 14, borderRadius: 8 }}>{error}</div>}
            </div>
          )}

          {/* Step 4: Results */}
          {step === "results" && result && (
            <div className="fade-in">
              {/* Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "CAGR", value: fmt(result.metrics.cagr, "%"), good: result.metrics.cagr > 0 },
                  { label: "Sharpe Ratio", value: result.metrics.sharpe_ratio?.toFixed(2), good: result.metrics.sharpe_ratio > 1 },
                  { label: "Max Drawdown", value: fmt(result.metrics.max_drawdown, "%"), good: false },
                  { label: "Win Rate", value: fmt(result.metrics.win_rate, "%"), good: result.metrics.win_rate > 50 },
                ].map((m, i) => (
                  <div key={i} className="kpi-card">
                    <div className="kpi-value" style={{ fontSize: 22, color: m.good ? "var(--accent-green)" : m.label === "Max Drawdown" ? "var(--accent-red)" : "var(--text-primary)" }}>{m.value}</div>
                    <div className="kpi-label">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Bias badge */}
              <div className="glass-card" style={{ padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>{result.bias_check_passed ? "?" : "?"}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    Bias Check: {result.bias_check_passed ? "PASSED � No Look-Ahead Bias" : "FAILED � Bias Detected"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                    The engine used df[df.index = current_date] slicing at every tick � strategy never accessed future data.
                  </div>
                </div>
                <span className={`badge ${result.bias_check_passed ? "badge-green" : "badge-red"}`} style={{ marginLeft: "auto" }}>
                  {result.bias_check_passed ? "CLEAN" : "BIASED"}
                </span>
              </div>

              {/* Equity curve */}
              <div className="glass-card" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Equity Curve</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={result.equity_curve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={v => `?${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }}
                      formatter={(v: any) => [`?${Number(v).toLocaleString("en-IN")}`, "Equity"]} />
                    {dateRange.split && <ReferenceLine x={dateRange.split} stroke="var(--accent-amber)" strokeDasharray="4 4" label={{ value: "Split", fill: "var(--accent-amber)", fontSize: 11 }} />}
                    <Line type="monotone" dataKey="equity" stroke="#4f8ef7" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: history */}
        <div>
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Recent Runs</h3>
            {history.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No runs yet</div>
            ) : history.slice(0, 8).map(r => (
              <div key={r.run_id} style={{ marginBottom: 12, padding: 12, background: "var(--bg-card-hover)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{r.ticker}</span>
                  <span className={`badge ${r.bias_check_passed ? "badge-green" : "badge-red"}`} style={{ fontSize: 10 }}>
                    {r.bias_check_passed ? "?" : "?"}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{r.created_at?.slice(0, 10)}</div>
                {r.cagr != null && <div style={{ fontSize: 12, marginTop: 4, color: r.cagr > 0 ? "var(--accent-green)" : "var(--accent-red)" }}>CAGR: {r.cagr > 0 ? "+" : ""}{r.cagr.toFixed(2)}%</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
