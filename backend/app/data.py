"""C-MAPSS FD001-compatible dataset loader.

If real NASA C-MAPSS files (train_FD001.txt, test_FD001.txt, RUL_FD001.txt)
are present under data/cmapss/, use them. Otherwise, generate a synthetic
dataset with identical schema and degradation dynamics so the pipeline is
fully reproducible offline.

C-MAPSS FD001 schema (space-separated, no header):
    unit, cycle, setting1, setting2, setting3, s1..s21
"""
from __future__ import annotations
import numpy as np
import pandas as pd
from pathlib import Path
from .config import DATA_DIR, CMAPSS_SENSORS, CMAPSS_SETTINGS

COLUMNS = ["unit", "cycle"] + CMAPSS_SETTINGS + CMAPSS_SENSORS


def _read_cmapss(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, sep=r"\s+", header=None, engine="python")
    df = df.iloc[:, : len(COLUMNS)]
    df.columns = COLUMNS
    return df


def _generate_synthetic_fd001(
    n_units: int = 100, seed: int = 42, split: str = "train"
) -> pd.DataFrame:
    """Generate a C-MAPSS FD001-lookalike run-to-failure dataset.

    Sensor dynamics: each unit runs a random number of cycles. Sensors
    have healthy baselines and monotonic-ish degradation that accelerates
    near end-of-life. Non-informative sensors (as in FD001) stay flat.
    """
    rng = np.random.default_rng(seed if split == "train" else seed + 1)
    rows: list[list[float]] = []
    baselines = np.array([
        518.67, 641.82, 1589.7, 1400.6, 14.62, 21.61, 554.36, 2388.06,
        9046.19, 1.3, 47.47, 521.66, 2388.02, 8138.62, 8.4195, 0.03,
        392.0, 2388.0, 100.0, 39.06, 23.42,
    ])
    # Degradation slopes: positive for increasing (temps, pressures),
    # negative for decreasing (efficiency proxies).
    slopes = np.array([
        0.0, 0.15, 2.1, 1.9, 0.0, 0.0, -0.35, 2.0, 8.0, 0.0, 0.05, -0.4,
        1.8, 6.0, 0.006, 0.0, 0.5, 0.0, 0.0, -0.03, -0.02,
    ])
    noise = np.array([
        0.001, 0.5, 5.0, 6.0, 0.001, 0.001, 0.4, 8.0, 20.0, 0.001, 0.08,
        0.4, 8.0, 22.0, 0.02, 0.001, 0.5, 0.001, 0.01, 0.09, 0.08,
    ])

    for unit in range(1, n_units + 1):
        # C-MAPSS FD001 test lengths range roughly 128–303; train 128–362.
        if split == "train":
            life = int(rng.integers(128, 362))
        else:
            life = int(rng.integers(30, 300))
        # Degradation curve — slow then accelerating.
        for c in range(1, life + 1):
            frac = c / life
            accel = frac**1.6
            settings = [
                float(rng.normal(0.0, 0.002)),
                float(rng.normal(0.0, 0.0004)),
                100.0,
            ]
            sensors = baselines + slopes * accel * (life * 0.6) + rng.normal(0, noise)
            rows.append([unit, c, *settings, *sensors.tolist()])
    df = pd.DataFrame(rows, columns=COLUMNS)
    return df


def _generate_full_corpus(n_units: int = 200, seed: int = 42) -> pd.DataFrame:
    """Generate one shared corpus so train and test come from the same distribution."""
    return _generate_synthetic_fd001(n_units=n_units, seed=seed, split="train")


def load_train() -> pd.DataFrame:
    p = DATA_DIR / "train_FD001.txt"
    if p.exists():
        return _read_cmapss(p)
    corpus = _generate_full_corpus(n_units=200, seed=42)
    return corpus[corpus["unit"] <= 100].reset_index(drop=True)


def load_test() -> tuple[pd.DataFrame, pd.Series]:
    p_test = DATA_DIR / "test_FD001.txt"
    p_rul = DATA_DIR / "RUL_FD001.txt"
    if p_test.exists() and p_rul.exists():
        test = _read_cmapss(p_test)
        rul = pd.read_csv(p_rul, header=None).iloc[:, 0]
        return test, rul
    corpus = _generate_full_corpus(n_units=200, seed=42)
    truncated = []
    ruls = []
    rng = np.random.default_rng(7)
    for unit, grp in corpus[corpus["unit"] > 100].groupby("unit"):
        L = len(grp)
        cut = int(rng.integers(max(20, L // 4), L - 5))
        truncated.append(grp.iloc[:cut].copy())
        ruls.append(L - cut)
    return pd.concat(truncated).reset_index(drop=True), pd.Series(ruls)


def add_rul_column(df: pd.DataFrame, cap: int = 130) -> pd.DataFrame:
    """C-MAPSS convention: RUL = max_cycle - cycle for each unit, capped."""
    max_cycle = df.groupby("unit")["cycle"].transform("max")
    df = df.copy()
    df["RUL"] = (max_cycle - df["cycle"]).clip(upper=cap)
    return df


def get_facade_row(row: pd.Series) -> dict:
    """Project the 21-channel C-MAPSS row onto the 7 aero-piston sensors
    the frontend expects. Each channel is rescaled around its baseline so
    that a healthy early-life cycle produces mid-range physical readings,
    and end-of-life cycles push values into caution / critical bands.

    Baselines are the FD001 healthy means (see data generator).
    """
    from .config import FACADE_MAP
    s = {k: float(row[v]) for k, v in FACADE_MAP.items()}

    # (baseline, gain, target_center, allowed_span, floor, ceil)
    # gain is applied on (value - baseline) so a small drift maps to a
    # meaningful physical delta — degradation trends stay preserved.
    rpm = 4800 + (s["rpm"] - 554.36) * 3.0
    cht = 95.0 + (s["cht"] - 1589.7) * 0.06
    egt = 720.0 + (s["egt"] - 1400.6) * 0.35
    oil_temp = 90.0 + (s["oil_temp"] - 641.82) * 0.7
    # oil pressure ~ bypass ratio: healthy value ≈ 8.4, degradation increases it.
    oil_press = 4.5 - (s["oil_press"] - 8.4) * 4.0
    fuel_flow = 21.0 + (s["fuel_flow"] - 47.47) * 0.9
    # vibration: baseline ~23.42, small increases → g RMS.
    vib = 0.45 + max(0.0, (s["vibration"] - 23.42) * 1.2)

    return {
        "rpm": round(max(1000, min(6000, rpm)), 1),
        "cht": round(max(40, min(160, cht)), 1),
        "egt": round(max(200, min(950, egt)), 1),
        "oil_temp": round(max(30, min(150, oil_temp)), 1),
        "oil_press": round(max(0.5, min(6.5, oil_press)), 2),
        "fuel_flow": round(max(5, min(40, fuel_flow)), 1),
        "vibration": round(max(0.0, min(3.0, vib)), 3),
    }
