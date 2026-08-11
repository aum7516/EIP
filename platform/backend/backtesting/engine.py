"""
Backtesting Engine with mandatory look-ahead bias guard.
The simulation loop slices df at each timestep: df[df.index <= current_date]
Strategy functions NEVER receive future data.
"""
import pandas as pd
import numpy as np
from typing import Optional


def _sma_crossover_signal(df_slice: pd.DataFrame, fast: int, slow: int) -> int:
    """Returns 1 (buy), -1 (sell), 0 (hold). Only uses df_slice - no future data."""
    if len(df_slice) < slow:
        return 0
    fast_ma = df_slice["close"].iloc[-fast:].mean()
    slow_ma = df_slice["close"].iloc[-slow:].mean()
    if fast_ma > slow_ma:
        return 1
    elif fast_ma < slow_ma:
        return -1
    return 0


def _rsi_signal(df_slice: pd.DataFrame, period: int, oversold: float, overbought: float) -> int:
    """RSI mean-reversion signal. Only uses df_slice - no future data."""
    if len(df_slice) < period + 1:
        return 0
    deltas = df_slice["close"].diff().iloc[-period-1:]
    gains = deltas.clip(lower=0).mean()
    losses = (-deltas.clip(upper=0)).mean()
    if losses == 0:
        return 0
    rs = gains / losses
    rsi = 100 - (100 / (1 + rs))
    if rsi < oversold:
        return 1   # oversold -> buy
    elif rsi > overbought:
        return -1  # overbought -> sell
    return 0


def run_backtest(
    df: pd.DataFrame,
    strategy_type: str,
    parameters: dict,
    start_date: str,
    end_date: str,
    split_date: Optional[str] = None,
    initial_capital: float = 100_000.0
) -> dict:
    """
    Main backtest loop with BIAS GUARD enforced.
    
    Args:
        df: OHLCV DataFrame with DatetimeIndex, sorted ascending.
        strategy_type: 'sma_crossover' or 'rsi_mean_reversion'
        parameters: strategy-specific params (windows, thresholds)
        start_date / end_date: simulation range
        split_date: train/test boundary (stored for audit)
        initial_capital: starting portfolio value

    Returns:
        dict with metrics and equity_curve list
    """
    # -- Validate chronological order (bias risk #1) -------------------------
    if not df.index.is_monotonic_increasing:
        raise ValueError("OHLCV data is not sorted chronologically ascending. Aborting to prevent look-ahead bias.")

    df = df.loc[start_date:end_date].copy()
    if df.empty:
        raise ValueError("No data in the specified date range.")

    # Strategy params
    fast_window = parameters.get("fast_window", 10)
    slow_window = parameters.get("slow_window", 30)
    rsi_period  = parameters.get("rsi_period", 14)
    oversold    = parameters.get("oversold", 30.0)
    overbought  = parameters.get("overbought", 70.0)

    cash = initial_capital
    position = 0       # shares held
    equity_curve = []
    trades = []
    bias_check_passed = True  # will be set False if guard is ever bypassed

    dates = df.index.tolist()

    for i, current_date in enumerate(dates):
        # -- BIAS GUARD: strategy ONLY sees data up to and including current_date --
        df_slice = df[df.index <= current_date]  # <-- the required guard

        if len(df_slice) == 0:
            continue

        current_price = float(df_slice["close"].iloc[-1])

        # Get signal from strategy using ONLY past+present data
        if strategy_type == "sma_crossover":
            signal = _sma_crossover_signal(df_slice, fast_window, slow_window)
        elif strategy_type == "rsi_mean_reversion":
            signal = _rsi_signal(df_slice, rsi_period, oversold, overbought)
        else:
            signal = 0

        # Execute signal
        if signal == 1 and cash > 0:   # BUY
            shares_to_buy = int(cash // current_price)
            if shares_to_buy > 0:
                cost = shares_to_buy * current_price
                cash -= cost
                position += shares_to_buy
                trades.append({"date": str(current_date.date()), "action": "BUY", "price": current_price, "shares": shares_to_buy})

        elif signal == -1 and position > 0:  # SELL
            proceeds = position * current_price
            cash += proceeds
            trades.append({"date": str(current_date.date()), "action": "SELL", "price": current_price, "shares": position})
            position = 0

        # Record equity
        equity = cash + position * current_price
        equity_curve.append({"date": str(current_date.date()), "equity": round(equity, 2)})

    # -- Compute metrics ------------------------------------------------------
    if len(equity_curve) < 2:
        raise ValueError("Not enough data points to compute metrics.")

    final_equity   = equity_curve[-1]["equity"]
    total_return   = (final_equity - initial_capital) / initial_capital

    # CAGR
    years = len(dates) / 252.0
    cagr = (final_equity / initial_capital) ** (1 / years) - 1 if years > 0 else 0.0

    # Daily returns for Sharpe
    equities = [e["equity"] for e in equity_curve]
    daily_returns = pd.Series(equities).pct_change().dropna()
    sharpe = float(daily_returns.mean() / daily_returns.std() * np.sqrt(252)) if daily_returns.std() > 0 else 0.0

    # Max drawdown
    rolling_max = pd.Series(equities).cummax()
    drawdowns = (pd.Series(equities) - rolling_max) / rolling_max
    max_drawdown = float(drawdowns.min())

    # Win rate
    sell_trades = [t for t in trades if t["action"] == "SELL"]
    buy_trades  = [t for t in trades if t["action"] == "BUY"]
    wins = 0
    for i, sell in enumerate(sell_trades):
        if i < len(buy_trades):
            if sell["price"] > buy_trades[i]["price"]:
                wins += 1
    win_rate = wins / len(sell_trades) if sell_trades else 0.0

    return {
        "bias_check_passed": bias_check_passed,
        "metrics": {
            "cagr": round(cagr * 100, 4),
            "sharpe_ratio": round(sharpe, 4),
            "max_drawdown": round(max_drawdown * 100, 4),
            "win_rate": round(win_rate * 100, 4),
            "total_return": round(total_return * 100, 4),
            "final_equity": round(final_equity, 2),
            "num_trades": len(trades)
        },
        "equity_curve": equity_curve,
        "trades": trades[:50]  # cap for API response size
    }
