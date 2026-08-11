"""Preset strategy definitions with default parameters."""

STRATEGIES = {
    "sma_crossover": {
        "name": "SMA Crossover",
        "description": "Buy when fast MA crosses above slow MA; sell when it crosses below.",
        "type": "preset",
        "parameters": {
            "fast_window": {"default": 10, "min": 2, "max": 50, "label": "Fast Window (days)"},
            "slow_window": {"default": 30, "min": 5, "max": 200, "label": "Slow Window (days)"}
        }
    },
    "rsi_mean_reversion": {
        "name": "RSI Mean-Reversion",
        "description": "Buy when RSI drops below oversold threshold; sell when it rises above overbought.",
        "type": "preset",
        "parameters": {
            "rsi_period":  {"default": 14, "min": 5, "max": 50,  "label": "RSI Period (days)"},
            "oversold":    {"default": 30, "min": 10, "max": 45, "label": "Oversold Threshold"},
            "overbought":  {"default": 70, "min": 55, "max": 90, "label": "Overbought Threshold"}
        }
    }
}

def get_all_strategies() -> list:
    return [
        {"id": k, **{kk: vv for kk, vv in v.items() if kk != "parameters"}, "parameters": v["parameters"]}
        for k, v in STRATEGIES.items()
    ]

def get_strategy(strategy_id: str) -> dict:
    return STRATEGIES.get(strategy_id, {})
