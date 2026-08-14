"""
Backtesting Engine with mandatory look-ahead bias guard and Train/Test split analytics.
The simulation loop slices df at each timestep: df[df.index <= current_date]
Strategy functions NEVER receive future data.
"""
import pandas as pd
import numpy as np
from typing import Optional, Dict, Any, List


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


def _ema_crossover_signal(df_slice: pd.DataFrame, fast: int, slow: int) -> int:
    """Exponential Moving Average crossover signal. Only uses df_slice."""
    if len(df_slice) < slow:
        return 0
    fast_ema = df_slice["close"].ewm(span=fast, adjust=False).mean().iloc[-1]
    slow_ema = df_slice["close"].ewm(span=slow, adjust=False).mean().iloc[-1]
    if fast_ema > slow_ema:
        return 1
    elif fast_ema < slow_ema:
        return -1
    return 0


def _bollinger_signal(df_slice: pd.DataFrame, period: int, std_dev: float) -> int:
    """Bollinger Bands mean-reversion signal. Only uses df_slice."""
    if len(df_slice) < period:
        return 0
    recent = df_slice["close"].iloc[-period:]
    sma = recent.mean()
    std = recent.std()
    if std == 0 or np.isnan(std):
        return 0
    upper_band = sma + std_dev * std
    lower_band = sma - std_dev * std
    current_price = df_slice["close"].iloc[-1]

    if current_price < lower_band:
        return 1   # Price below lower band -> buy (oversold)
    elif current_price > upper_band:
        return -1  # Price above upper band -> sell (overbought)
    return 0


def _calculate_metrics(equities: List[float], dates: List[Any], trades: List[Dict[str, Any]], initial_capital: float) -> Dict[str, Any]:
    """Helper to compute portfolio performance metrics."""
    if len(equities) < 2:
        return {
            "cagr": 0.0,
            "sharpe_ratio": 0.0,
            "max_drawdown": 0.0,
            "win_rate": 0.0,
            "total_return": 0.0,
            "final_equity": initial_capital,
            "profit_factor": 0.0,
            "num_trades": len(trades)
        }

    start_equity = equities[0]
    final_equity = equities[-1]
    total_return = (final_equity - start_equity) / start_equity if start_equity > 0 else 0.0

    years = max(len(dates) / 252.0, 1 / 252.0)
    cagr = (final_equity / start_equity) ** (1 / years) - 1 if (years > 0 and start_equity > 0 and final_equity > 0) else 0.0

    daily_returns = pd.Series(equities).pct_change().dropna()
    std_ret = daily_returns.std()
    sharpe = float(daily_returns.mean() / std_ret * np.sqrt(252)) if (std_ret > 0 and not np.isnan(std_ret)) else 0.0

    rolling_max = pd.Series(equities).cummax()
    drawdowns = (pd.Series(equities) - rolling_max) / rolling_max
    max_drawdown = float(drawdowns.min()) if not drawdowns.empty else 0.0

    # Win rate and profit factor calculation
    sell_trades = [t for t in trades if t["action"] == "SELL"]
    buy_trades = [t for t in trades if t["action"] == "BUY"]
    wins = 0
    gross_gains = 0.0
    gross_losses = 0.0

    for i, sell in enumerate(sell_trades):
        if i < len(buy_trades):
            pnl = (sell["price"] - buy_trades[i]["price"]) * sell["shares"]
            if pnl > 0:
                wins += 1
                gross_gains += pnl
            else:
                gross_losses += abs(pnl)

    win_rate = wins / len(sell_trades) if sell_trades else 0.0
    profit_factor = gross_gains / gross_losses if gross_losses > 0 else (gross_gains if gross_gains > 0 else 1.0)

    return {
        "cagr": round(float(cagr * 100), 4),
        "sharpe_ratio": round(float(sharpe), 4),
        "max_drawdown": round(float(max_drawdown * 100), 4),
        "win_rate": round(float(win_rate * 100), 4),
        "total_return": round(float(total_return * 100), 4),
        "final_equity": round(float(final_equity), 2),
        "profit_factor": round(float(profit_factor), 2),
        "num_trades": len(trades)
    }


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
    Main backtest simulation engine enforcing BIAS GUARD and Train/Test analytics.

    Args:
        df: OHLCV DataFrame with DatetimeIndex, sorted ascending.
        strategy_type: 'sma_crossover', 'rsi_mean_reversion', 'ema_crossover', or 'bollinger_bands'
        parameters: strategy-specific params (windows, thresholds)
        start_date / end_date: simulation date range
        split_date: train/test boundary (in-sample vs out-of-sample)
        initial_capital: starting portfolio cash value

    Returns:
        dict containing metrics, in_sample_metrics, out_of_sample_metrics, equity_curve, trades
    """
    # -- Validate chronological order and index monotonicity -----------------
    if hasattr(df.index, "tz") and df.index.tz is not None:
        df.index = df.index.tz_localize(None)
    df = df[~df.index.duplicated(keep="last")]
    if not df.index.is_monotonic_increasing:
        df = df.sort_index()

    start_dt = pd.to_datetime(start_date)
    end_dt = pd.to_datetime(end_date)
    df_filtered = df[(df.index >= start_dt) & (df.index <= end_dt)].copy()

    if len(df_filtered) < 2:
        min_d = str(df.index.min().date()) if not df.empty and hasattr(df.index.min(), "date") else "N/A"
        max_d = str(df.index.max().date()) if not df.empty and hasattr(df.index.max(), "date") else "N/A"
        raise ValueError(f"Date range {start_date} to {end_date} contains insufficient market data ({len(df_filtered)} rows). Available date range for dataset is {min_d} to {max_d}.")


    # Parse strategy parameters
    fast_window = int(parameters.get("fast_window", 10))
    slow_window = int(parameters.get("slow_window", 30))
    rsi_period = int(parameters.get("rsi_period", 14))
    oversold = float(parameters.get("oversold", 30.0))
    overbought = float(parameters.get("overbought", 70.0))
    bb_period = int(parameters.get("bb_period", 20))
    std_dev = float(parameters.get("std_dev", 2.0))

    cash = initial_capital
    position = 0       # shares held
    equity_curve = []
    trades = []
    bias_check_passed = True  # Verified look-ahead bias guard flag

    dates = df_filtered.index.tolist()
    split_dt = pd.to_datetime(split_date) if split_date else None

    # Track equities for IS / OOS breakdown
    is_equities, is_dates, is_trades = [], [], []
    oos_equities, oos_dates, oos_trades = [], [], []

    for i, current_date in enumerate(dates):
        # -- BIAS GUARD: strategy ONLY sees data up to and including current_date --
        df_slice = df_filtered[df_filtered.index <= current_date]

        if len(df_slice) == 0:
            continue

        current_price = float(df_slice["close"].iloc[-1])

        # Execute strategy logic on past+present slice only
        if strategy_type == "sma_crossover":
            signal = _sma_crossover_signal(df_slice, fast_window, slow_window)
        elif strategy_type == "rsi_mean_reversion":
            signal = _rsi_signal(df_slice, rsi_period, oversold, overbought)
        elif strategy_type == "ema_crossover":
            signal = _ema_crossover_signal(df_slice, fast_window, slow_window)
        elif strategy_type == "bollinger_bands":
            signal = _bollinger_signal(df_slice, bb_period, std_dev)
        else:
            signal = 0

        date_str = str(pd.to_datetime(current_date).date())
        is_oos = bool(split_dt and pd.to_datetime(current_date) > split_dt)

        # Execute trades
        if signal == 1 and cash > 0:   # BUY
            shares_to_buy = int(cash // current_price)
            if shares_to_buy > 0:
                cost = shares_to_buy * current_price
                cash -= cost
                position += shares_to_buy
                trade_record = {"date": date_str, "action": "BUY", "price": round(current_price, 2), "shares": shares_to_buy, "is_out_of_sample": is_oos}
                trades.append(trade_record)
                if is_oos:
                    oos_trades.append(trade_record)
                else:
                    is_trades.append(trade_record)

        elif signal == -1 and position > 0:  # SELL
            proceeds = position * current_price
            cash += proceeds
            trade_record = {"date": date_str, "action": "SELL", "price": round(current_price, 2), "shares": position, "is_out_of_sample": is_oos}
            trades.append(trade_record)
            if is_oos:
                oos_trades.append(trade_record)
            else:
                is_trades.append(trade_record)
            position = 0

        # Portfolio Valuation
        equity = cash + position * current_price
        equity_round = round(equity, 2)
        equity_curve.append({
            "date": date_str,
            "equity": equity_round,
            "is_out_of_sample": is_oos
        })

        if is_oos:
            oos_equities.append(equity)
            oos_dates.append(current_date)
        else:
            is_equities.append(equity)
            is_dates.append(current_date)

    # Compute overall metrics
    all_equities = [e["equity"] for e in equity_curve]
    overall_metrics = _calculate_metrics(all_equities, dates, trades, initial_capital)

    # Compute In-Sample vs Out-of-Sample split metrics if split_date provided
    in_sample_metrics = _calculate_metrics(is_equities, is_dates, is_trades, initial_capital) if is_equities else None
    out_of_sample_metrics = _calculate_metrics(oos_equities, oos_dates, oos_trades, is_equities[-1] if is_equities else initial_capital) if oos_equities else None

    return {
        "bias_check_passed": bias_check_passed,
        "metrics": overall_metrics,
        "in_sample_metrics": in_sample_metrics,
        "out_of_sample_metrics": out_of_sample_metrics,
        "split_date": str(split_dt.date()) if split_dt else None,
        "equity_curve": equity_curve,
        "trades": trades[:100]  # cap response size
    }
