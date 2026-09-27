"""LightGBM Quantile Regression for Remaining Useful Life.

Trains three separate boosters at quantiles 0.1, 0.5, 0.9 → P10 / P50 / P90.
Backtest R² and MAE on the P50 model are stored in models/rul_metrics.json.
Features include raw sensors + rolling-window mean/std/slope over the last
5 and 20 cycles per unit — the standard C-MAPSS feature-engineering recipe.
"""
from __future__ import annotations
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
import lightgbm as lgb
from sklearn.metrics import r2_score, mean_absolute_error

from .config import MODEL_DIR, CMAPSS_SENSORS

MODEL_PATH = MODEL_DIR / "rul.joblib"
METRICS_PATH = MODEL_DIR / "rul_metrics.json"


# Only the informative FD001 sensors (drop constant channels).
INFORMATIVE = ["s2", "s3", "s4", "s7", "s8", "s9", "s11", "s12", "s13", "s14",
               "s15", "s17", "s20", "s21"]


def add_rolling(df: pd.DataFrame) -> pd.DataFrame:
    """Add rolling mean and slope over 5-cycle and 20-cycle windows."""
    df = df.sort_values(["unit", "cycle"]).copy()
    grouped = df.groupby("unit")
    for w in (5, 20):
        rmean = grouped[INFORMATIVE].transform(
            lambda s: s.rolling(w, min_periods=1).mean()
        )
        rmean.columns = [f"{c}_m{w}" for c in INFORMATIVE]
        df = pd.concat([df, rmean], axis=1)
    # Simple slope = last - first over w=20 window (approximation).
    slope = grouped[INFORMATIVE].transform(
        lambda s: s.rolling(20, min_periods=2).apply(lambda x: x.iloc[-1] - x.iloc[0], raw=False)
    ).fillna(0.0)
    slope.columns = [f"{c}_slope" for c in INFORMATIVE]
    df = pd.concat([df, slope], axis=1)
    return df


def _feature_columns() -> list[str]:
    cols = list(INFORMATIVE)
    for w in (5, 20):
        cols += [f"{c}_m{w}" for c in INFORMATIVE]
    cols += [f"{c}_slope" for c in INFORMATIVE]
    return cols


class RULModel:
    def __init__(self):
        self.p10: lgb.LGBMRegressor | None = None
        self.p50: lgb.LGBMRegressor | None = None
        self.p90: lgb.LGBMRegressor | None = None
        self.features = _feature_columns()

    def _make(self, alpha: float) -> lgb.LGBMRegressor:
        return lgb.LGBMRegressor(
            objective="quantile",
            alpha=alpha,
            n_estimators=400,
            learning_rate=0.05,
            num_leaves=31,
            random_state=42,
            verbose=-1,
        )

    def fit(self, df: pd.DataFrame) -> None:
        df_feat = add_rolling(df)
        X = df_feat[self.features].values
        y = df_feat["RUL"].values
        self.p10 = self._make(0.1).fit(X, y)
        self.p50 = self._make(0.5).fit(X, y)
        self.p90 = self._make(0.9).fit(X, y)

    def _feature_vec(self, cmapss_row: np.ndarray) -> np.ndarray:
        """Build a feature vector at inference time from a single 21-channel row.

        Since we have no history at online-inference time, we set rolling
        means to the current values and slopes to 0 (worst-case for slope).
        """
        raw = {name: float(v) for name, v in zip(CMAPSS_SENSORS, cmapss_row)}
        vals = [raw[c] for c in INFORMATIVE]
        vec = list(vals)                       # raw informative sensors
        vec += list(vals)                      # rolling mean w=5
        vec += list(vals)                      # rolling mean w=20
        vec += [0.0] * len(INFORMATIVE)        # slope w=20
        return np.array(vec).reshape(1, -1)

    def predict(self, x: np.ndarray) -> dict:
        v = self._feature_vec(x)
        return {
            "p10": float(max(0.0, self.p10.predict(v)[0])),
            "p50": float(max(0.0, self.p50.predict(v)[0])),
            "p90": float(max(0.0, self.p90.predict(v)[0])),
        }

    def predict_batch(self, df_with_history: pd.DataFrame) -> np.ndarray:
        """Batch prediction from a DataFrame with per-unit cycle history."""
        df_feat = add_rolling(df_with_history)
        return self.p50.predict(df_feat[self.features].values)

    def save(self, path: Path = MODEL_PATH) -> None:
        joblib.dump({
            "p10": self.p10, "p50": self.p50, "p90": self.p90,
            "features": self.features,
        }, path)

    @classmethod
    def load(cls, path: Path = MODEL_PATH) -> "RULModel":
        d = joblib.load(path)
        m = cls()
        m.p10, m.p50, m.p90 = d["p10"], d["p50"], d["p90"]
        m.features = d["features"]
        return m


def train_rul(train_df: pd.DataFrame, test_df: pd.DataFrame, true_rul: pd.Series) -> RULModel:
    m = RULModel()
    m.fit(train_df)
    # Backtest: build features on the full test history, take last-cycle
    # per unit prediction and compare to true RUL.
    test_feat = add_rolling(test_df)
    last = test_feat.groupby("unit").tail(1).sort_values("unit")
    preds = m.p50.predict(last[m.features].values)
    yt = true_rul.values[: len(preds)]
    r2 = float(r2_score(yt, preds))
    mae = float(mean_absolute_error(yt, preds))
    m.save()
    METRICS_PATH.write_text(json.dumps({"r2": r2, "mae": mae, "n": int(len(yt))}, indent=2))
    return m


def load_metrics() -> dict:
    if METRICS_PATH.exists():
        return json.loads(METRICS_PATH.read_text())
    return {"r2": None, "mae": None, "n": 0}
