"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine
} from "recharts";

type Step = "data" | "strategy" | "run" | "results";

const DEFAULT_STRATEGIES = [
  {
    id: "sma_crossover",
    name: "SMA Crossover",
    description: "Buy when fast Simple Moving Average crosses above slow SMA; sell when fast crosses below.",
    type: "preset",
    parameters: {
      fast_window: { default: 10, min: 2, max: 50, label: "Fast Window (days)" },
      slow_window: { default: 30, min: 5, max: 200, label: "Slow Window (days)" }
    }
  },
  {
    id: "rsi_mean_reversion",
    name: "RSI Mean-Reversion",
    description: "Buy when Relative Strength Index drops below oversold threshold; sell when it rises above overbought.",
    type: "preset",
    parameters: {
      rsi_period: { default: 14, min: 5, max: 50, label: "RSI Period (days)" },
      oversold: { default: 30, min: 10, max: 45, label: "Oversold Threshold" },
      overbought: { default: 70, min: 55, max: 90, label: "Overbought Threshold" }
    }
  },
  {
    id: "ema_crossover",
    name: "EMA Crossover",
    description: "Buy when fast Exponential Moving Average crosses above slow EMA; sell when fast crosses below.",
    type: "preset",
    parameters: {
      fast_window: { default: 12, min: 2, max: 50, label: "Fast EMA Window (days)" },
      slow_window: { default: 26, min: 5, max: 200, label: "Slow EMA Window (days)" }
    }
  },
  {
    id: "bollinger_bands",
    name: "Bollinger Bands Mean-Reversion",
    description: "Buy when price drops below lower Bollinger Band; sell when price exceeds upper band.",
    type: "preset",
    parameters: {
      bb_period: { default: 20, min: 5, max: 100, label: "Band Period (days)" },
      std_dev: { default: 2.0, min: 1.0, max: 4.0, label: "Standard Deviation Multiplier" }
    }
  }
];

export default function BacktestingPage() {
  const [step, setStep] = useState<Step>("data");
  const [strategies, setStrategies] = useState<any[]>(DEFAULT_STRATEGIES);
  const [tickers, setTickers] = useState<string[]>([
    "RELIANCE.NS",
    "TCS.NS",
    "HDFCBANK.NS",
    "INFY.NS",
    "ICICIBANK.NS",
    "SBIN.NS",
    "BHARTIARTL.NS",
    "AAPL",
    "TSLA"
  ]);
  const [selectedTicker, setSelectedTicker] = useState("RELIANCE.NS");


  const [customTicker, setCustomTicker] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const [selectedStrategy, setSelectedStrategy] = useState<any>(DEFAULT_STRATEGIES[0]);
  const [params, setParams] = useState<Record<string, number>>({ fast_window: 10, slow_window: 30 });
  const [dateRange, setDateRange] = useState({ start: "2020-01-01", end: "2024-12-31", split: "2022-12-31" });
  
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [tradeFilter, setTradeFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");

  const pollRef = useRef<any>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  function loadInitialData() {
    api.getStrategies().then(s => {
      if (Array.isArray(s) && s.length > 0) {
        setStrategies(s);
        if (!selectedStrategy || !s.find(item => item.id === selectedStrategy.id)) {
          setSelectedStrategy(s[0]);
          initParams(s[0]);
        }
      }
    }).catch(err => console.error(err));

    api.getTickers().then(t => {
      if (t && Array.isArray(t.preloaded) && t.preloaded.length > 0) {
        setTickers(t.preloaded);
      }
    }).catch(err => console.error(err));
    api.getBacktestHistory().then(setHistory).catch(() => {});
  }


  function initParams(strat: any) {
    const def: Record<string, number> = {};
    Object.entries(strat.parameters || {}).forEach(([k, v]: any) => {
      def[k] = v.default;
    });
    setParams(def);
  }

  const [tickerInfo, setTickerInfo] = useState<{ start_date?: string; end_date?: string; row_count?: number; is_preloaded?: boolean } | null>(null);

  const activeTicker = customTicker.trim() ? customTicker.trim().toUpperCase() : selectedTicker;

  useEffect(() => {
    if (!activeTicker) return;
    api.getTickerInfo(activeTicker).then(info => {
      setTickerInfo(info);
      if (info.start_date && info.end_date) {
        const startMs = new Date(info.start_date).getTime();
        const endMs = new Date(info.end_date).getTime();
        const splitMs = startMs + (endMs - startMs) * 0.7;
        const splitDateStr = new Date(splitMs).toISOString().split('T')[0];
        setDateRange({
          start: info.start_date,
          end: info.end_date,
          split: splitDateStr
        });
      }
    }).catch(() => {
      setTickerInfo(null);
    });
  }, [activeTicker]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    setError("");
    try {
      const res = await api.uploadBacktestCSV(file, customTicker.trim() || undefined);
      setUploadMsg(res.message);
      setSelectedTicker(res.ticker);
      setCustomTicker("");
      setDateRange(prev => ({
        ...prev,
        start: res.start_date || prev.start,
        end: res.end_date || prev.end
      }));
      api.getTickers().then(t => setTickers(t.preloaded));
    } catch (err: any) {
      setError(err.message || "Failed to upload CSV");
    } finally {
      setUploading(false);
    }
  }

  async function startRun() {
    if (!selectedStrategy) return;
    setRunning(true);
    setError("");
    setResult(null);

    try {
      const { run_id } = await api.runBacktest({
        ticker: activeTicker,
        strategy_id: selectedStrategy.id,
        start_date: dateRange.start,
        end_date: dateRange.end,
        split_date: dateRange.split || null,
        parameters: params
      });
      setRunId(run_id);
      setStep("run");

      pollRef.current = setInterval(async () => {
        const res = await api.getBacktestResults(run_id);
        if (res.status === "completed" || res.status === "failed") {
          clearInterval(pollRef.current);
          setRunning(false);
          if (res.status === "completed") {
            setResult(res);
            setStep("results");
            api.getBacktestHistory().then(setHistory);
          } else {
            setError(res.error || "Backtest run failed");
          }
        }
      }, 1500);
    } catch (e: any) {
      setError(e.message);
      setRunning(false);
    }
  }

  async function handleDeleteRun(id: string) {
    try {
      await api.deleteBacktestRun(id);
      setHistory(prev => prev.filter(h => h.run_id !== id));
      if (runId === id) {
        setResult(null);
        setStep("data");
      }
    } catch (e: any) {
      alert("Failed to delete run: " + e.message);
    }
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const filteredTrades = (result?.trades || []).filter((t: any) =>
    tradeFilter === "ALL" ? true : t.action === tradeFilter
  );

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px" }}>Strategy Backtesting Engine</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: 14 }}>
            Quantitative strategy simulation with guaranteed look-ahead bias prevention and Train/Test split analytics.
          </p>
        </div>
        <div style={{
          padding: "6px 14px",
          borderRadius: 20,
          background: "rgba(16, 185, 129, 0.12)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          color: "#10b981",
          fontSize: 12,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 6
        }}>
          <span>Bias Guard Active</span>
        </div>
      </div>

      {/* Step Indicator */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
        {[
          { id: "data", label: "1. Data Selection" },
          { id: "strategy", label: "2. Strategy Definition" },
          { id: "run", label: "3. Run Config" },
          { id: "results", label: "4. Results Dashboard" }
        ].map((s, i, arr) => {
          const isActive = step === s.id;
          const stepOrder = ["data", "strategy", "run", "results"];
          const isDone = stepOrder.indexOf(step) > i;

          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setStep(s.id as Step)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? "linear-gradient(135deg, #4f8ef7, #7c3aed)" : isDone ? "rgba(79, 142, 247, 0.15)" : "var(--bg-card)",
                  color: isActive ? "#ffffff" : isDone ? "#60a5fa" : "var(--text-secondary)",
                  border: `1px solid ${isActive ? "transparent" : "var(--border)"}`,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {s.label}
              </button>
              {i < arr.length - 1 && <span style={{ color: "var(--border)", fontSize: 16 }}>Next</span>}
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{
          padding: "12px 16px", borderRadius: 8, background: "rgba(239, 68, 68, 0.15)",
          border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", fontSize: 14, marginBottom: 20
        }}>
          Warning: {error}
        </div>
      )}

      {/* Step 1: Data Selection */}
      {step === "data" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Preloaded & Market Tickers</h3>
            
            <label style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              Select Preloaded Asset
            </label>
            <select
              value={selectedTicker}
              onChange={(e) => { setSelectedTicker(e.target.value); setCustomTicker(""); }}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 8,
                background: "var(--bg-input)", border: "1px solid var(--border)",
                color: "var(--text-primary)", fontSize: 14, marginBottom: 20
              }}
            >
              {tickers.map(t => (
                <option key={t} value={t} style={{ background: "#0f172a", color: "#f8fafc" }}>
                  {t}
                </option>
              ))}

            </select>

            <label style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              Or Enter Custom Market Ticker (Live yfinance pull)
            </label>
            <input
              type="text"
              placeholder="e.g. NVDA, MSFT, BTC-USD"
              value={customTicker}
              onChange={(e) => setCustomTicker(e.target.value)}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 8,
                background: "var(--bg-input)", border: "1px solid var(--border)",
                color: "var(--text-primary)", fontSize: 14
              }}
            />
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
              Active Asset Target: <strong style={{ color: "#60a5fa" }}>{activeTicker}</strong>
            </p>

            {tickerInfo && (
              <div style={{
                marginTop: 10, padding: "8px 12px", borderRadius: 8,
                background: "rgba(79, 142, 247, 0.1)", border: "1px solid rgba(79, 142, 247, 0.2)",
                fontSize: 12, color: "#60a5fa"
              }}>
                📅 Dataset Date Bounds: <strong>{tickerInfo.start_date}</strong> to <strong>{tickerInfo.end_date}</strong>
                <span style={{ color: "var(--text-muted)", display: "block", marginTop: 2 }}>
                  Live market data auto-downloaded for date ranges beyond local dataset.
                </span>
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={() => setStep("strategy")}
              style={{ marginTop: 24, width: "100%" }}
            >
              Continue to Strategy Definition
            </button>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Upload Custom OHLCV CSV</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Upload your proprietary historical price data. Validates columns (Date, Close, etc.), checks monotonic ordering, and saves to database.
            </p>

            <div style={{
              border: "2px dashed var(--border)", borderRadius: 12, padding: 30, textAlign: "center",
              background: "rgba(255, 255, 255, 0.02)"
            }}>
              <input
                type="file"
                accept=".csv"
                id="csv-upload"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              <label htmlFor="csv-upload" style={{ cursor: "pointer" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                  {uploading ? "Uploading & Validating..." : "Click to browse CSV file"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  Supports OHLCV CSV files up to 50MB
                </div>
              </label>
            </div>

            {uploadMsg && (
              <div style={{
                marginTop: 16, padding: "10px 14px", borderRadius: 8,
                background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#10b981", fontSize: 13
              }}>
                Success: {uploadMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Strategy Definition */}
      {step === "strategy" && (
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Select Trading Strategy Preset</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 24 }}>
            {strategies.map((strat) => {
              const isSelected = selectedStrategy?.id === strat.id;
              return (
                <div
                  key={strat.id}
                  onClick={() => { setSelectedStrategy(strat); initParams(strat); }}
                  className="card"
                  style={{
                    padding: 20, cursor: "pointer",
                    border: `2px solid ${isSelected ? "#4f8ef7" : "var(--border)"}`,
                    background: isSelected ? "rgba(79, 142, 247, 0.08)" : "var(--bg-card)",
                    transition: "all 0.2s"
                  }}
                >
                  <h4 style={{ fontSize: 16, fontWeight: 700, color: isSelected ? "#60a5fa" : "var(--text-primary)" }}>
                    {strat.name}
                  </h4>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.4 }}>
                    {strat.description}
                  </p>
                </div>
              );
            })}
          </div>

          {selectedStrategy && (
            <div className="card" style={{ padding: 24, maxWidth: 600 }}>
              <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                Tune Strategy Parameters — {selectedStrategy.name}
              </h4>
              {Object.entries(selectedStrategy.parameters || {}).map(([key, config]: any) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{config.label || key}</span>
                    <span style={{ color: "#60a5fa", fontWeight: 700 }}>{params[key]}</span>
                  </div>
                  <input
                    type="range"
                    min={config.min}
                    max={config.max}
                    value={params[key] ?? config.default}
                    onChange={(e) => setParams({ ...params, [key]: Number(e.target.value) })}
                    style={{ width: "100%" }}
                  />
                </div>
              ))}

              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                <button className="btn btn-secondary" onClick={() => setStep("data")}>Back</button>
                <button className="btn btn-primary" onClick={() => setStep("run")}>Set Date Range & Run</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Run Config */}
      {step === "run" && (
        <div className="card" style={{ padding: 24, maxWidth: 600 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Simulation Window & Train/Test Split</h3>

          {tickerInfo && (
            <div style={{
              marginBottom: 16, padding: "8px 14px", borderRadius: 8,
              background: "rgba(79, 142, 247, 0.1)", border: "1px solid rgba(79, 142, 247, 0.2)",
              fontSize: 12, color: "#60a5fa", display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <span>Target: <strong>{activeTicker}</strong> (Seed: {tickerInfo.start_date} → {tickerInfo.end_date})</span>
              <span style={{ color: "#10b981", fontWeight: 600 }}>Live Pull Enabled</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              Train/Test Split Date (In-Sample vs Out-of-Sample Boundary)
            </label>
            <input
              type="date"
              value={dateRange.split}
              onChange={(e) => setDateRange({ ...dateRange, split: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
              Separates training performance evaluation from out-of-sample forward testing.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => setStep("strategy")}>Back</button>
            <button
              className="btn btn-primary"
              disabled={running}
              onClick={startRun}
              style={{ flex: 1 }}
            >
              {running ? "Simulating Backtest..." : "Launch Backtest Simulation"}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Results Dashboard */}
      {step === "results" && result && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
          {/* Top Status & Bias Guard Confirmation */}
          <div className="card" style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>
                Run Target: {activeTicker} | Strategy: {selectedStrategy?.name}
              </span>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
                Backtest Results Dashboard
              </h3>
            </div>
            <div style={{
              padding: "10px 18px", borderRadius: 10,
              background: result.bias_check_passed ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
              border: `1px solid ${result.bias_check_passed ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
              color: result.bias_check_passed ? "#10b981" : "#f87171",
              fontWeight: 700, fontSize: 13
            }}>
              {result.bias_check_passed ? "BIAS-GUARD VERIFIED — 0 Look-Ahead Bias" : "Look-Ahead Bias Risk Detected"}
            </div>
          </div>

          {/* Metric Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
            <MetricCard label="CAGR" value={`${result.metrics.cagr}%`} positive={result.metrics.cagr > 0} />
            <MetricCard label="Sharpe Ratio" value={result.metrics.sharpe_ratio.toFixed(2)} positive={result.metrics.sharpe_ratio >= 1.0} />
            <MetricCard label="Max Drawdown" value={`${result.metrics.max_drawdown}%`} positive={result.metrics.max_drawdown > -20} />
            <MetricCard label="Win Rate" value={`${result.metrics.win_rate}%`} positive={result.metrics.win_rate >= 50} />
            <MetricCard label="Total Return" value={`${result.metrics.total_return}%`} positive={result.metrics.total_return > 0} />
            <MetricCard label="Profit Factor" value={result.metrics.profit_factor ?? "N/A"} positive={(result.metrics.profit_factor || 0) >= 1.0} />
          </div>

          {/* In-Sample vs Out-of-Sample Split Comparison */}
          {result.in_sample_metrics && result.out_of_sample_metrics && (
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
                Split Analytics — In-Sample (Train) vs Out-of-Sample (Test)
              </h4>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", textAlign: "left", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                      <th style={{ padding: 10 }}>Period</th>
                      <th style={{ padding: 10 }}>CAGR</th>
                      <th style={{ padding: 10 }}>Sharpe</th>
                      <th style={{ padding: 10 }}>Max Drawdown</th>
                      <th style={{ padding: 10 }}>Win Rate</th>
                      <th style={{ padding: 10 }}>Total Return</th>
                      <th style={{ padding: 10 }}>Trades</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: 10, fontWeight: 700, color: "#60a5fa" }}>In-Sample (Train)</td>
                      <td style={{ padding: 10 }}>{result.in_sample_metrics.cagr}%</td>
                      <td style={{ padding: 10 }}>{result.in_sample_metrics.sharpe_ratio}</td>
                      <td style={{ padding: 10 }}>{result.in_sample_metrics.max_drawdown}%</td>
                      <td style={{ padding: 10 }}>{result.in_sample_metrics.win_rate}%</td>
                      <td style={{ padding: 10 }}>{result.in_sample_metrics.total_return}%</td>
                      <td style={{ padding: 10 }}>{result.in_sample_metrics.num_trades}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: 10, fontWeight: 700, color: "#a855f7" }}>Out-of-Sample (Test)</td>
                      <td style={{ padding: 10 }}>{result.out_of_sample_metrics.cagr}%</td>
                      <td style={{ padding: 10 }}>{result.out_of_sample_metrics.sharpe_ratio}</td>
                      <td style={{ padding: 10 }}>{result.out_of_sample_metrics.max_drawdown}%</td>
                      <td style={{ padding: 10 }}>{result.out_of_sample_metrics.win_rate}%</td>
                      <td style={{ padding: 10 }}>{result.out_of_sample_metrics.total_return}%</td>
                      <td style={{ padding: 10 }}>{result.out_of_sample_metrics.num_trades}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Equity Curve Chart */}
          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Portfolio Equity Curve ($)</h4>
            <div style={{ width: "100%", height: 350 }}>
              <ResponsiveContainer>
                <LineChart data={result.equity_curve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }}
                    formatter={(val: any) => [`$${Number(val).toLocaleString()}`, "Equity"]}
                  />
                  {result.split_date && (
                    <ReferenceLine
                      x={result.split_date}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{ value: `Split: ${result.split_date}`, fill: "#ef4444", fontSize: 12, position: "top" }}
                    />
                  )}
                  <Line type="monotone" dataKey="equity" stroke="#4f8ef7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trade Log */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h4 style={{ fontSize: 16, fontWeight: 700 }}>Execution Trade Log ({filteredTrades.length})</h4>
              <div style={{ display: "flex", gap: 8 }}>
                {(["ALL", "BUY", "SELL"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTradeFilter(f)}
                    style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: tradeFilter === f ? "var(--border)" : "transparent",
                      color: tradeFilter === f ? "var(--text-primary)" : "var(--text-muted)",
                      border: "1px solid var(--border)", cursor: "pointer"
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: "auto", maxHeight: 300, overflowY: "auto" }}>
              <table style={{ width: "100%", textAlign: "left", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                    <th style={{ padding: 8 }}>Date</th>
                    <th style={{ padding: 8 }}>Action</th>
                    <th style={{ padding: 8 }}>Price ($)</th>
                    <th style={{ padding: 8 }}>Shares</th>
                    <th style={{ padding: 8 }}>Phase</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((t: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: 8 }}>{t.date}</td>
                      <td style={{ padding: 8, fontWeight: 700, color: t.action === "BUY" ? "#10b981" : "#ef4444" }}>
                        {t.action}
                      </td>
                      <td style={{ padding: 8 }}>${t.price}</td>
                      <td style={{ padding: 8 }}>{t.shares}</td>
                      <td style={{ padding: 8, color: t.is_out_of_sample ? "#a855f7" : "#60a5fa" }}>
                        {t.is_out_of_sample ? "Out-of-Sample" : "In-Sample"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* History & Previous Runs Section */}
      <div className="card" style={{ padding: 24, marginTop: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Past Backtest Runs History</h3>
        {history.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No past backtest runs found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  <th style={{ padding: 10 }}>Ticker</th>
                  <th style={{ padding: 10 }}>Strategy</th>
                  <th style={{ padding: 10 }}>Status</th>
                  <th style={{ padding: 10 }}>Bias Guard</th>
                  <th style={{ padding: 10 }}>CAGR</th>
                  <th style={{ padding: 10 }}>Sharpe</th>
                  <th style={{ padding: 10 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.run_id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: 10, fontWeight: 700 }}>{h.ticker}</td>
                    <td style={{ padding: 10 }}>{h.strategy_name}</td>
                    <td style={{ padding: 10 }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                        background: h.status === "completed" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                        color: h.status === "completed" ? "#10b981" : "#ef4444"
                      }}>
                        {h.status}
                      </span>
                    </td>
                    <td style={{ padding: 10, color: h.bias_check_passed ? "#10b981" : "#ef4444" }}>
                      {h.bias_check_passed ? "Passed" : "Failed"}
                    </td>
                    <td style={{ padding: 10 }}>{h.cagr != null ? `${h.cagr}%` : "-"}</td>
                    <td style={{ padding: 10 }}>{h.sharpe_ratio != null ? h.sharpe_ratio : "-"}</td>
                    <td style={{ padding: 10 }}>
                      <button
                        onClick={() => handleDeleteRun(h.run_id)}
                        style={{
                          background: "transparent", border: "none", color: "#ef4444",
                          cursor: "pointer", fontSize: 13
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="card" style={{ padding: 16, textAlign: "center" }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>{label}</div>
      <div style={{
        fontSize: 22, fontWeight: 800, marginTop: 4,
        color: positive === undefined ? "var(--text-primary)" : positive ? "#10b981" : "#ef4444"
      }}>
        {value}
      </div>
    </div>
  );
}

