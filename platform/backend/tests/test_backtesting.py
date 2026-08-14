import unittest
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient

from backtesting.engine import run_backtest
from backtesting.strategies import get_all_strategies, get_strategy
from main import app
from auth.routes import get_current_user
from shared.models import User


class TestBacktestingModule(unittest.TestCase):

    def setUp(self):
        dates = pd.date_range(start="2022-01-01", periods=200, freq="B")
        np.random.seed(42)
        close_prices = 100 + np.cumsum(np.random.randn(200) * 1.5)
        close_prices = np.maximum(close_prices, 10.0)

        self.df = pd.DataFrame({
            "open": close_prices - 0.5,
            "high": close_prices + 1.0,
            "low": close_prices - 1.0,
            "close": close_prices,
            "adj_close": close_prices,
            "volume": 10000
        }, index=dates)

        # Mock auth dependency for FastAPI TestClient
        mock_user = User(email="test@novaretail.com", role="analyst")
        app.dependency_overrides[get_current_user] = lambda: mock_user

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_preset_strategies_definition(self):
        strategies = get_all_strategies()
        self.assertGreaterEqual(len(strategies), 4)
        strategy_ids = [s["id"] for s in strategies]
        self.assertIn("sma_crossover", strategy_ids)
        self.assertIn("rsi_mean_reversion", strategy_ids)
        self.assertIn("ema_crossover", strategy_ids)
        self.assertIn("bollinger_bands", strategy_ids)

    def test_engine_bias_guard_and_strategies(self):
        for strat_id in ["sma_crossover", "rsi_mean_reversion", "ema_crossover", "bollinger_bands"]:
            result = run_backtest(
                df=self.df,
                strategy_type=strat_id,
                parameters={},
                start_date="2022-01-01",
                end_date="2022-09-01",
                initial_capital=100000.0
            )
            self.assertTrue(result["bias_check_passed"])
            self.assertIn("metrics", result)
            self.assertIn("cagr", result["metrics"])
            self.assertIn("sharpe_ratio", result["metrics"])
            self.assertIn("max_drawdown", result["metrics"])
            self.assertIn("win_rate", result["metrics"])
            self.assertGreater(len(result["equity_curve"]), 0)

    def test_train_test_split_analytics(self):
        result = run_backtest(
            df=self.df,
            strategy_type="sma_crossover",
            parameters={"fast_window": 5, "slow_window": 20},
            start_date="2022-01-01",
            end_date="2022-09-01",
            split_date="2022-05-01",
            initial_capital=100000.0
        )
        self.assertTrue(result["bias_check_passed"])
        self.assertIsNotNone(result["in_sample_metrics"])
        self.assertIsNotNone(result["out_of_sample_metrics"])
        self.assertEqual(result["split_date"], "2022-05-01")

        oos_points = [e for e in result["equity_curve"] if e["is_out_of_sample"]]
        is_points = [e for e in result["equity_curve"] if not e["is_out_of_sample"]]
        self.assertGreater(len(is_points), 0)
        self.assertGreater(len(oos_points), 0)

    def test_backtesting_api_routes(self):
        client = TestClient(app)

        res = client.get("/backtest/strategies")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 4)

        res = client.get("/backtest/tickers")
        self.assertEqual(res.status_code, 200)
        tickers = res.json()
        self.assertIn("preloaded", tickers)
        self.assertIn("AAPL", tickers["preloaded"])

    def test_ticker_info_route(self):
        client = TestClient(app)
        res = client.get("/backtest/ticker-info/AAPL")
        self.assertEqual(res.status_code, 200)
        info = res.json()
        self.assertEqual(info["ticker"], "AAPL")
        self.assertIn("start_date", info)
        self.assertIn("end_date", info)
        self.assertIn("row_count", info)

    def test_empty_date_range_error_format(self):
        with self.assertRaises(ValueError) as ctx:
            run_backtest(
                df=self.df,
                strategy_type="sma_crossover",
                parameters={},
                start_date="2030-01-01",
                end_date="2030-06-01"
            )
        self.assertIn("No data found in date range 2030-01-01 to 2030-06-01", str(ctx.exception))
        self.assertIn("Available date range for dataset is", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
