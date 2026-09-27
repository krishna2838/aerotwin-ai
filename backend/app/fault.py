"""LightGBM fault classifier.

Discretizes remaining useful life into fault regimes and predicts them
from the current sensor snapshot + short-window features.

Regimes:
    0 HEALTHY               (RUL > 100)
    1 EARLY_WEAR            (60 < RUL <= 100)
    2 HOT_SECTION_DEGRAD    (20 < RUL <= 60)
    3 IMPENDING_FAILURE     (RUL <= 20)
"""
from __future__ import annotations
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
import lightgbm as lgb

from .config import MODEL_DIR, CMAPSS_SENSORS

MODEL_PATH = MODEL_DIR / "fault.joblib"

FAULT_LABELS = {
    0: "HEALTHY",
    1: "EARLY_WEAR",
    2: "HOT_SECTION_DEGRADATION",
    3: "IMPENDING_FAILURE",
}


def _to_regime(rul: np.ndarray) -> np.ndarray:
    y = np.zeros_like(rul, dtype=int)
    y[(rul > 60) & (rul <= 100)] = 1
    y[(rul > 20) & (rul <= 60)] = 2
    y[rul <= 20] = 3
    return y


class FaultModel:
    def __init__(self):
        self.model: lgb.LGBMClassifier | None = None
        self.features: list[str] = []

    def fit(self, df: pd.DataFrame) -> None:
        y = _to_regime(df["RUL"].values)
        X = df[CMAPSS_SENSORS].values
        self.features = list(CMAPSS_SENSORS)
        self.model = lgb.LGBMClassifier(
            n_estimators=250,
            learning_rate=0.05,
            num_leaves=31,
            objective="multiclass",
            num_class=4,
            random_state=42,
            verbose=-1,
        )
        self.model.fit(X, y)

    def predict(self, x: np.ndarray) -> dict:
        proba = self.model.predict_proba(x.reshape(1, -1))[0]
        cls = int(np.argmax(proba))
        return {
            "class_id": cls,
            "label": FAULT_LABELS[cls],
            "confidence": float(proba[cls]),
            "distribution": {FAULT_LABELS[i]: float(p) for i, p in enumerate(proba)},
        }

    def feature_importance(self) -> dict[str, float]:
        imp = self.model.feature_importances_
        total = imp.sum() or 1.0
        return {f: float(v / total) for f, v in zip(self.features, imp)}

    def save(self, path: Path = MODEL_PATH) -> None:
        joblib.dump({"model": self.model, "features": self.features}, path)

    @classmethod
    def load(cls, path: Path = MODEL_PATH) -> "FaultModel":
        d = joblib.load(path)
        m = cls()
        m.model = d["model"]
        m.features = d["features"]
        return m


def train_fault(train_df) -> FaultModel:
    m = FaultModel()
    m.fit(train_df)
    m.save()
    return m
