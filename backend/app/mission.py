"""Mission assessment — rules-based GO / CAUTION / INSPECTION engine."""
from __future__ import annotations
from dataclasses import dataclass
from typing import Literal

Criticality = Literal["low", "medium", "high"]
Verdict = Literal["GO", "CAUTION", "INSPECTION"]


@dataclass
class MissionInput:
    duration_cycles: float
    criticality: Criticality
    altitude_ft: float = 15000
    health_score: float = 100.0
    rul_p50: float = 100.0
    rul_p10: float = 100.0
    anomaly_score: float = 0.0
    fault_label: str = "HEALTHY"


def assess_mission(m: MissionInput) -> dict:
    reasons: list[str] = []
    verdict: Verdict = "GO"

    crit_margin = {"low": 1.0, "medium": 1.5, "high": 2.0}[m.criticality]
    safety_reserve = m.duration_cycles * crit_margin

    # Rule 1: RUL P10 must cover mission with criticality margin.
    if m.rul_p10 < safety_reserve:
        verdict = "INSPECTION"
        reasons.append(
            f"RUL P10 ({m.rul_p10:.1f} cycles) below required reserve "
            f"({safety_reserve:.1f} cycles = {m.duration_cycles:.0f} × {crit_margin}× margin)."
        )
    elif m.rul_p50 < m.duration_cycles * 2.0:
        if verdict == "GO":
            verdict = "CAUTION"
        reasons.append(
            f"RUL P50 ({m.rul_p50:.1f}) leaves thin margin over mission "
            f"duration ({m.duration_cycles:.0f} cycles)."
        )

    # Rule 2: Health index thresholds.
    if m.health_score < 40:
        verdict = "INSPECTION"
        reasons.append(f"Health index {m.health_score:.1f}/100 in CRITICAL band.")
    elif m.health_score < 70:
        if verdict == "GO":
            verdict = "CAUTION"
        reasons.append(f"Health index {m.health_score:.1f}/100 in CAUTION band.")

    # Rule 3: Anomaly score.
    if m.anomaly_score > 0.85:
        verdict = "INSPECTION"
        reasons.append(f"Anomaly score {m.anomaly_score:.2f} exceeds INSPECTION threshold (0.85).")
    elif m.anomaly_score > 0.6:
        if verdict == "GO":
            verdict = "CAUTION"
        reasons.append(f"Anomaly score {m.anomaly_score:.2f} above nominal (0.60).")

    # Rule 4: Fault regime.
    if m.fault_label == "IMPENDING_FAILURE":
        verdict = "INSPECTION"
        reasons.append("Fault classifier reports IMPENDING_FAILURE regime.")
    elif m.fault_label == "HOT_SECTION_DEGRADATION" and m.criticality == "high":
        if verdict == "GO":
            verdict = "CAUTION"
        reasons.append("Hot-section degradation detected on high-criticality mission.")

    # Rule 5: Altitude — piston engines lose margin above 20 kft.
    if m.altitude_ft > 22000 and m.criticality != "low":
        if verdict == "GO":
            verdict = "CAUTION"
        reasons.append(
            f"Altitude profile ({m.altitude_ft:.0f} ft) above turbo-normalization limit."
        )

    if not reasons:
        reasons.append("All health indicators nominal for planned mission profile.")

    return {
        "verdict": verdict,
        "reasons": reasons,
        "safety_reserve_cycles": round(safety_reserve, 1),
        "inputs": {
            "duration_cycles": m.duration_cycles,
            "criticality": m.criticality,
            "altitude_ft": m.altitude_ft,
            "health_score": m.health_score,
            "rul_p10": m.rul_p10,
            "rul_p50": m.rul_p50,
            "anomaly_score": m.anomaly_score,
            "fault_label": m.fault_label,
        },
    }
