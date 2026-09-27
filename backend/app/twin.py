"""Digital Twin state estimator.

A lightweight physics-based model predicts expected sensor readings from
RPM and ambient conditions. Residuals (actual - expected) drive anomaly
detection and health scoring.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import Dict


@dataclass
class TwinState:
    expected: Dict[str, float]
    actual: Dict[str, float]
    residuals: Dict[str, float]
    ambient_c: float
    altitude_ft: float

    def to_dict(self) -> dict:
        return asdict(self)


def expected_readings(rpm: float, ambient_c: float, altitude_ft: float) -> Dict[str, float]:
    """Polynomial engine model — nominal-condition expected sensor readings."""
    r = rpm / 5000.0  # normalized RPM
    # Coefficients tuned so that at cruise RPM, ambient 25°C, sea level,
    # the outputs sit near the middle of each sensor's healthy band.
    cht = 55.0 + 45.0 * r + 0.6 * ambient_c - 0.0004 * altitude_ft
    egt = 380.0 + 380.0 * r + 0.7 * ambient_c - 0.005 * altitude_ft
    oil_temp = 50.0 + 40.0 * r + 0.4 * ambient_c
    oil_press = 5.5 - 1.2 * r  # falls with RPM under load
    fuel_flow = 8.0 + 16.0 * r
    vibration = 0.25 + 0.35 * r + 0.05 * (r**2)
    return {
        "cht": round(cht, 1),
        "egt": round(egt, 1),
        "oil_temp": round(oil_temp, 1),
        "oil_press": round(max(0.5, oil_press), 2),
        "fuel_flow": round(fuel_flow, 1),
        "vibration": round(vibration, 3),
    }


def compute_twin_state(actual: Dict[str, float], ambient_c: float = 25.0, altitude_ft: float = 15000.0) -> TwinState:
    exp = expected_readings(actual["rpm"], ambient_c, altitude_ft)
    residuals: Dict[str, float] = {}
    for k, v in exp.items():
        residuals[k] = round(actual.get(k, v) - v, 3)
    return TwinState(expected=exp, actual=actual, residuals=residuals, ambient_c=ambient_c, altitude_ft=altitude_ft)


def residual_magnitude(residuals: Dict[str, float]) -> float:
    """Weighted L2 norm of residuals in normalized units."""
    weights = {"cht": 0.02, "egt": 0.003, "oil_temp": 0.02, "oil_press": 0.3, "fuel_flow": 0.05, "vibration": 1.0}
    tot = 0.0
    for k, v in residuals.items():
        w = weights.get(k, 0.01)
        tot += (w * v) ** 2
    return float(tot**0.5)
