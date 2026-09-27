"""Isolation-Forest anomaly detector.

Trained on healthy early-life C-MAPSS cycles. Score in [0, 1] where 1 means
the observation is far from healthy behavior.
"""
from __future__ import annotations
import joblib
import numpy as np
from pathlib import Path
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from .config import MODEL_DIR, CMAPSS_SENSORS

MODEL_PATH = MODEL_DIR / "anomaly.joblib"


class AnomalyModel:
    def __init__(self):
        self.scaler = StandardScaler()
        self.iforest = IsolationForest(
            n_estimators=200, contamination=0.05, random_state=42
        )

    def fit(self, X: np.ndarray) -> None:
        self.scaler.fit(X)
        self.iforest.fit(self.scaler.transform(X))

    def score(self, X: np.ndarray) -> np.ndarray:
        """Return anomaly probability in [0, 1] (1 = highly anomalous)."""
        raw = -self.iforest.score_samples(self.scaler.transform(X))
        # Normalize: map raw scores to [0, 1] via a sigmoid around a threshold.
        s = 1.0 / (1.0 + np.exp(-4.0 * (raw - 0.55)))
        return s

    def contributions(self, x: np.ndarray, sensor_names: list[str]) -> dict[str, float]:
        """Approximate per-sensor contribution: standardized |z| after fit."""
        z = np.abs(self.scaler.transform(x.reshape(1, -1)))[0]
        total = z.sum() or 1.0
        return {name: float(v / total) for name, v in zip(sensor_names, z)}

    def save(self, path: Path = MODEL_PATH) -> None:
        joblib.dump({"scaler": self.scaler, "iforest": self.iforest}, path)

    @classmethod
    def load(cls, path: Path = MODEL_PATH) -> "AnomalyModel":
        d = joblib.load(path)
        m = cls()
        m.scaler = d["scaler"]
        m.iforest = d["iforest"]
        return m


def train_anomaly(train_df) -> AnomalyModel:
    """Train on first 30 cycles of each unit — treated as healthy baseline."""
    healthy = train_df[train_df["cycle"] <= 30]
    X = healthy[CMAPSS_SENSORS].values
    m = AnomalyModel()
    m.fit(X)
    m.save()
    return m
