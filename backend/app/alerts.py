"""Explainable alert composition."""
from __future__ import annotations
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Deque, Dict, List
from collections import deque


@dataclass
class Alert:
    id: str
    ts: str
    severity: str          # INFO | CAUTION | CRITICAL
    title: str
    detail: str
    contributions: Dict[str, float]

    def to_dict(self) -> dict:
        return asdict(self)


class AlertBus:
    def __init__(self, maxlen: int = 100):
        self._alerts: Deque[Alert] = deque(maxlen=maxlen)
        self._seq = 0

    def _emit(self, severity: str, title: str, detail: str, contributions: dict) -> Alert:
        self._seq += 1
        a = Alert(
            id=f"A-{self._seq:05d}",
            ts=datetime.now(timezone.utc).isoformat(timespec="seconds"),
            severity=severity,
            title=title,
            detail=detail,
            contributions=contributions,
        )
        self._alerts.appendleft(a)
        return a

    def evaluate(
        self,
        health_score: float,
        anomaly_score: float,
        fault: dict,
        rul: dict,
        residuals: Dict[str, float],
        contributions: Dict[str, float],
    ) -> List[Alert]:
        emitted: List[Alert] = []

        # 1. Anomaly-triggered alert.
        if anomaly_score > 0.75:
            top = max(contributions.items(), key=lambda kv: kv[1])[0] if contributions else "unknown"
            emitted.append(self._emit(
                "CRITICAL" if anomaly_score > 0.9 else "CAUTION",
                f"Anomalous behavior detected (score {anomaly_score:.2f})",
                f"Top contributor: sensor {top}. Isolation-Forest divergence from healthy baseline.",
                contributions,
            ))

        # 2. Fault regime.
        if fault["label"] == "IMPENDING_FAILURE":
            emitted.append(self._emit(
                "CRITICAL",
                "Fault classifier: IMPENDING_FAILURE",
                f"Confidence {fault['confidence']:.2f}. Immediate inspection required.",
                contributions,
            ))
        elif fault["label"] == "HOT_SECTION_DEGRADATION":
            worst_egt = residuals.get("egt", 0.0)
            emitted.append(self._emit(
                "CAUTION",
                "Hot section degradation likely",
                (
                    f"EGT residual {worst_egt:+.1f}°C above physics-model expectation "
                    f"under current RPM. Fault probability {fault['confidence']:.2f}. "
                    f"Recommend borescope within next 20 cycles."
                ),
                contributions,
            ))

        # 3. RUL runway.
        if rul["p10"] < 25:
            emitted.append(self._emit(
                "CRITICAL",
                f"RUL P10 = {rul['p10']:.0f} cycles",
                "10th-percentile remaining life below 25 cycles — schedule teardown.",
                contributions,
            ))
        elif rul["p50"] < 40:
            emitted.append(self._emit(
                "CAUTION",
                f"RUL P50 = {rul['p50']:.0f} cycles",
                "Median remaining life falling. Plan replacement window.",
                contributions,
            ))

        # 4. Health drop.
        if health_score < 40:
            emitted.append(self._emit(
                "CRITICAL",
                f"Health index at {health_score:.0f}",
                "Composite score in critical band — ground the airframe until inspected.",
                contributions,
            ))
        return emitted

    def recent(self, n: int = 10) -> list[dict]:
        return [a.to_dict() for a in list(self._alerts)[:n]]

    def all(self) -> list[dict]:
        return [a.to_dict() for a in list(self._alerts)]


BUS = AlertBus()
