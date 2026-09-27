"""Composite Health Index (0-100).

Weighted combination of:
    * anomaly score          (30%)
    * residual magnitude     (25%)
    * RUL fraction remaining (25%)
    * fault probability      (20%)
"""
from __future__ import annotations


def normalize_residual(mag: float) -> float:
    """Squash residual L2 into [0, 1] where 1 = high divergence from twin."""
    # Empirically: mag < 3.0 healthy, > 12.0 severe.
    return float(min(1.0, max(0.0, (mag - 3.0) / 9.0)))


def rul_fraction(p50: float, life_expectancy: float = 130.0) -> float:
    return float(min(1.0, max(0.0, p50 / life_expectancy)))


def compute_health(anomaly_score: float, residual_mag: float, rul_p50: float, fault_prob: float) -> dict:
    r_norm = normalize_residual(residual_mag)
    rul_frac = rul_fraction(rul_p50)
    # Higher anomaly / residual / fault_prob HURT the score.
    # Higher rul_frac HELPS.
    penalty = 0.30 * anomaly_score + 0.25 * r_norm + 0.20 * fault_prob
    reward = 0.25 * rul_frac
    raw = 100.0 * (1.0 - penalty + reward - 0.25)  # -0.25 baselines reward at 0
    score = max(0.0, min(100.0, raw))
    band = "CRITICAL" if score < 40 else ("CAUTION" if score < 70 else "HEALTHY")
    return {
        "score": round(score, 1),
        "band": band,
        "components": {
            "anomaly": round(anomaly_score, 3),
            "residual": round(r_norm, 3),
            "rul_fraction": round(rul_frac, 3),
            "fault_probability": round(fault_prob, 3),
        },
    }
