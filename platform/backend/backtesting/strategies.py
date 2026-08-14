"""Preset strategy definitions with default parameters."""

STRATEGIES = {
    "sma_crossover": {
        "name": "SMA Crossover",
        "description": "Buy when fast Simple Moving Average crosses above slow SMA; sell when fast crosses below.",
        "type": "preset",
        "parameters": {
            "fast_window": {"default": 10, "min": 2, "max": 50, "label": "Fast Window (days)"},
            "slow_window": {"default": 30, "min": 5, "max": 200, "label": "Slow Window (days)"}
        }
    },
    "rsi_mean_reversion": {
        "name": "RSI Mean-Reversion",
        "description": "Buy when Relative Strength Index drops below oversold threshold; sell when it rises above overbought.",
        "type": "preset",
        "parameters": {
            "rsi_period":  {"default": 14, "min": 5, "max": 50,  "label": "RSI Period (days)"},
            "oversold":    {"default": 30, "min": 10, "max": 45, "label": "Oversold Threshold"},
            "overbought":  {"default": 70, "min": 55, "max": 90, "label": "Overbought Threshold"}
        }
    },
    "ema_crossover": {
        "name": "EMA Crossover",
        "description": "Buy when fast Exponential Moving Average crosses above slow EMA; sell when fast crosses below.",
        "type": "preset",
        "parameters": {
            "fast_window": {"default": 12, "min": 2, "max": 50, "label": "Fast EMA Window (days)"},
            "slow_window": {"default": 26, "min": 5, "max": 200, "label": "Slow EMA Window (days)"}
        }
    },
    "bollinger_bands": {
        "name": "Bollinger Bands Mean-Reversion",
        "description": "Buy when price drops below lower Bollinger Band; sell when price exceeds upper band.",
        "type": "preset",
        "parameters": {
            "bb_period":   {"default": 20, "min": 5, "max": 100, "label": "Band Period (days)"},
            "std_dev":     {"default": 2.0, "min": 1.0, "max": 4.0, "label": "Standard Deviation Multiplier"}
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
