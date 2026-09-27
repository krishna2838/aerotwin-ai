"""Real-time telemetry stream.

Replays a real C-MAPSS degradation trajectory (one unit's cycles), at 10 Hz
by default. Each cycle is expanded into 10 sub-samples with light noise so
the frontend animates smoothly.

Also exposes a "fast-forward" API for the demo where cycles are consumed
100× faster to show the whole degradation arc collapsing to CAUTION → INSPECTION
in a few seconds.
"""
from __future__ import annotations
import asyncio
import json
import random
from dataclasses import dataclass, field
from typing import Dict, Optional
import numpy as np
import pandas as pd

from .config import CMAPSS_SENSORS
from .data import load_train, get_facade_row


@dataclass
class StreamState:
    unit_id: int = 1
    cycle_idx: int = 0            # index within the unit's cycle list
    subsample_idx: int = 0        # 0..9 sub-samples per cycle
    fast_forward_cycles: int = 0  # remaining cycles to burn instantly
    speed: float = 1.0            # 1.0 = 10 Hz, 100.0 = fast-forward mode
    unit_df: Optional[pd.DataFrame] = None
    last_row: Optional[pd.Series] = field(default=None, repr=False)
    ambient_c: float = 25.0
    altitude_ft: float = 15000.0


class TelemetrySim:
    def __init__(self):
        self.train = load_train()
        self.units = sorted(self.train["unit"].unique().tolist())
        self.state = StreamState()
        self._load_unit(self.units[0])

    def _load_unit(self, unit_id: int) -> None:
        self.state.unit_id = int(unit_id)
        self.state.cycle_idx = 0
        self.state.subsample_idx = 0
        self.state.unit_df = self.train[self.train["unit"] == unit_id].reset_index(drop=True)

    def set_unit(self, unit_id: int) -> None:
        if unit_id in self.units:
            self._load_unit(unit_id)

    def fast_forward(self, cycles: int) -> None:
        self.state.fast_forward_cycles += max(0, int(cycles))

    def set_conditions(self, ambient_c: float | None = None, altitude_ft: float | None = None) -> None:
        if ambient_c is not None:
            self.state.ambient_c = float(ambient_c)
        if altitude_ft is not None:
            self.state.altitude_ft = float(altitude_ft)

    def _advance_cycle(self) -> None:
        self.state.cycle_idx += 1
        self.state.subsample_idx = 0
        if self.state.unit_df is None or self.state.cycle_idx >= len(self.state.unit_df):
            # Move to next unit or wrap.
            i = self.units.index(self.state.unit_id)
            nxt = self.units[(i + 1) % len(self.units)]
            self._load_unit(nxt)

    def sample(self) -> Dict:
        """Emit one 10 Hz sample. Advances subsample; every 10th advances cycle."""
        ff = self.state.fast_forward_cycles > 0
        if ff:
            # Burn a full cycle each tick.
            self.state.fast_forward_cycles -= 1
            self._advance_cycle()

        assert self.state.unit_df is not None
        row = self.state.unit_df.iloc[self.state.cycle_idx]
        self.state.last_row = row

        # Interpolate between this cycle and the next for sub-samples.
        if self.state.cycle_idx + 1 < len(self.state.unit_df):
            nxt = self.state.unit_df.iloc[self.state.cycle_idx + 1]
            alpha = self.state.subsample_idx / 10.0
            interp = row[CMAPSS_SENSORS] * (1 - alpha) + nxt[CMAPSS_SENSORS] * alpha
        else:
            interp = row[CMAPSS_SENSORS]

        # Small sensor noise for realism.
        interp = interp + np.random.normal(0, 0.002, size=len(interp)) * interp.abs()
        cmapss_row = row.copy()
        cmapss_row[CMAPSS_SENSORS] = interp.values

        facade = get_facade_row(cmapss_row)

        # Sub-sample bookkeeping.
        if not ff:
            self.state.subsample_idx += 1
            if self.state.subsample_idx >= 10:
                self._advance_cycle()

        return {
            "unit_id": self.state.unit_id,
            "cycle": int(row["cycle"]),
            "life_length": int(len(self.state.unit_df)),
            "ambient_c": self.state.ambient_c,
            "altitude_ft": self.state.altitude_ft,
            "sensors": facade,
            "cmapss": {k: float(cmapss_row[k]) for k in CMAPSS_SENSORS},
            "settings": {
                "setting1": float(row["setting1"]),
                "setting2": float(row["setting2"]),
                "setting3": float(row["setting3"]),
            },
        }


SIM = TelemetrySim()


async def stream_loop(send_json, stop_event: asyncio.Event, hz: int = 10):
    """Push samples at `hz` Hz over the given send_json coroutine."""
    interval = 1.0 / hz
    while not stop_event.is_set():
        sample = SIM.sample()
        try:
            await send_json(sample)
        except Exception:
            break
        await asyncio.sleep(interval)
