"""AEROTWIN-AI FastAPI entrypoint.

Endpoints
---------
GET  /                     API info
GET  /health               service + model metrics
WS   /telemetry/stream     real-time sensor stream
GET  /twin/state           digital-twin state JSON
GET  /anomaly              current anomaly score
GET  /fault                probable fault + confidence
GET  /rul                  P10/P50/P90 RUL estimate
POST /mission/assess       mission decision
POST /mission/fastforward  demo showstopper — burn N cycles
POST /mission/setunit      switch to a different C-MAPSS unit
GET  /health/index         overall health 0-100
GET  /alerts               recent explainable alerts
GET  /config               engine specs + thresholds
GET  /fleet                simulated 8-UAV fleet with status
"""
from __future__ import annotations
import asyncio
import json
import random
import time
from contextlib import asynccontextmanager
from typing import Optional
import numpy as np

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app import __version__
from app.config import ENGINE_SPEC, SENSORS, FLEET, CMAPSS_SENSORS
from app.data import load_train, get_facade_row
from app.telemetry import SIM, stream_loop
from app.twin import compute_twin_state, residual_magnitude
from app.anomaly import AnomalyModel
from app.fault import FaultModel, FAULT_LABELS
from app.rul import RULModel, load_metrics as load_rul_metrics
from app.health import compute_health
from app.mission import MissionInput, assess_mission
from app.alerts import BUS


# ---------------------------------------------------------------------------
# Model loading (auto-train on first boot if artifacts missing)
# ---------------------------------------------------------------------------

def _ensure_models():
    from app.anomaly import MODEL_PATH as A_PATH
    from app.fault import MODEL_PATH as F_PATH
    from app.rul import MODEL_PATH as R_PATH
    if A_PATH.exists() and F_PATH.exists() and R_PATH.exists():
        return
    print("[AEROTWIN] Model artifacts missing — training now...", flush=True)
    from train import main as train_main
    train_main()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ensure_models()
    app.state.anomaly = AnomalyModel.load()
    app.state.fault = FaultModel.load()
    app.state.rul = RULModel.load()
    yield


app = FastAPI(
    title="AEROTWIN-AI",
    version=__version__,
    description="AI-Powered Digital Twin for MALE UAV Aero Piston Engines (SIH26054)",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helper — compute the full state for the current live sample
# ---------------------------------------------------------------------------

def _current_state():
    """Snapshot: sample the sim once and run the entire inference stack."""
    sample = SIM.sample()  # advances the sim
    facade = sample["sensors"]
    twin = compute_twin_state(
        actual=facade,
        ambient_c=sample["ambient_c"],
        altitude_ft=sample["altitude_ft"],
    )
    res_mag = residual_magnitude(twin.residuals)

    cmapss_vec = np.array([sample["cmapss"][k] for k in CMAPSS_SENSORS])
    anomaly_score = float(app.state.anomaly.score(cmapss_vec.reshape(1, -1))[0])
    contributions = app.state.anomaly.contributions(cmapss_vec, CMAPSS_SENSORS)
    fault = app.state.fault.predict(cmapss_vec)
    rul = app.state.rul.predict(cmapss_vec)
    health = compute_health(anomaly_score, res_mag, rul["p50"], fault["confidence"] if fault["class_id"] > 0 else 0.0)

    BUS.evaluate(
        health_score=health["score"],
        anomaly_score=anomaly_score,
        fault=fault,
        rul=rul,
        residuals=twin.residuals,
        contributions=contributions,
    )
    return {
        "sample": sample,
        "twin": twin.to_dict(),
        "residual_magnitude": round(res_mag, 3),
        "anomaly": {"score": round(anomaly_score, 3), "contributions": contributions},
        "fault": fault,
        "rul": rul,
        "health": health,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {
        "name": "AEROTWIN-AI",
        "version": __version__,
        "problem_statement": "SIH26054",
        "team": "Ignite",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": __version__,
        "models_loaded": {
            "anomaly": app.state.anomaly is not None,
            "fault": app.state.fault is not None,
            "rul": app.state.rul is not None,
        },
        "rul_backtest": load_rul_metrics(),
    }


@app.get("/config")
def config():
    return {"engine": ENGINE_SPEC, "sensors": SENSORS}


@app.get("/twin/state")
def twin_state():
    return _current_state()["twin"]


@app.get("/anomaly")
def anomaly():
    st = _current_state()
    return {"score": st["anomaly"]["score"], "contributions": st["anomaly"]["contributions"]}


@app.get("/fault")
def fault():
    return _current_state()["fault"]


@app.get("/rul")
def rul():
    return _current_state()["rul"]


@app.get("/health/index")
def health_index():
    return _current_state()["health"]


@app.get("/alerts")
def alerts(limit: int = 20):
    _current_state()  # tick the sim so alerts stay fresh even without WS
    return {"alerts": BUS.recent(limit)}


@app.get("/fleet")
def fleet():
    """Simulate a fleet snapshot — each UAV gets a synthetic health signature."""
    rng = random.Random(int(time.time() // 10))  # stable within 10s window
    out = []
    for u in FLEET:
        base = rng.uniform(35, 98)
        rul_p50 = max(5, base * 1.5 + rng.uniform(-10, 10))
        band = "CRITICAL" if base < 40 else ("CAUTION" if base < 70 else "HEALTHY")
        out.append({
            **u,
            "health_score": round(base, 1),
            "band": band,
            "rul_p50": round(rul_p50, 1),
            "mission_ready": band != "CRITICAL",
            "last_seen": "just now",
        })
    return {"fleet": out}


class MissionRequest(BaseModel):
    duration_cycles: float = Field(..., ge=1, le=1000)
    criticality: str = Field("medium", pattern=r"^(low|medium|high)$")
    altitude_ft: float = Field(15000, ge=0, le=45000)


@app.post("/mission/assess")
def mission_assess(req: MissionRequest):
    st = _current_state()
    m = MissionInput(
        duration_cycles=req.duration_cycles,
        criticality=req.criticality,  # type: ignore[arg-type]
        altitude_ft=req.altitude_ft,
        health_score=st["health"]["score"],
        rul_p50=st["rul"]["p50"],
        rul_p10=st["rul"]["p10"],
        anomaly_score=st["anomaly"]["score"],
        fault_label=st["fault"]["label"],
    )
    return assess_mission(m)


class FastForwardRequest(BaseModel):
    cycles: int = Field(100, ge=1, le=500)


@app.post("/mission/fastforward")
def fast_forward(req: FastForwardRequest):
    SIM.fast_forward(req.cycles)
    return {"queued_cycles": req.cycles, "current_unit": SIM.state.unit_id}


class SetUnitRequest(BaseModel):
    unit_id: int


@app.post("/mission/setunit")
def set_unit(req: SetUnitRequest):
    SIM.set_unit(req.unit_id)
    return {"unit_id": SIM.state.unit_id, "life_length": len(SIM.state.unit_df or [])}


@app.websocket("/telemetry/stream")
async def telemetry_ws(ws: WebSocket):
    await ws.accept()
    stop = asyncio.Event()

    async def send_json(payload):
        # Compose the full state on each tick so the frontend gets one packet.
        try:
            facade = payload["sensors"]
            twin = compute_twin_state(
                actual=facade,
                ambient_c=payload["ambient_c"],
                altitude_ft=payload["altitude_ft"],
            )
            res_mag = residual_magnitude(twin.residuals)
            cmapss_vec = np.array([payload["cmapss"][k] for k in CMAPSS_SENSORS])
            anomaly_score = float(app.state.anomaly.score(cmapss_vec.reshape(1, -1))[0])
            contributions = app.state.anomaly.contributions(cmapss_vec, CMAPSS_SENSORS)
            fault = app.state.fault.predict(cmapss_vec)
            rul = app.state.rul.predict(cmapss_vec)
            health = compute_health(anomaly_score, res_mag, rul["p50"], fault["confidence"] if fault["class_id"] > 0 else 0.0)
            BUS.evaluate(
                health_score=health["score"],
                anomaly_score=anomaly_score,
                fault=fault,
                rul=rul,
                residuals=twin.residuals,
                contributions=contributions,
            )
            pkt = {
                "ts": time.time(),
                "unit_id": payload["unit_id"],
                "cycle": payload["cycle"],
                "life_length": payload["life_length"],
                "sensors": facade,
                "twin": twin.to_dict(),
                "residual_magnitude": round(res_mag, 3),
                "anomaly": {"score": round(anomaly_score, 3), "contributions": contributions},
                "fault": fault,
                "rul": rul,
                "health": health,
                "alerts": BUS.recent(5),
            }
            await ws.send_json(pkt)
        except WebSocketDisconnect:
            stop.set()

    try:
        await stream_loop(send_json, stop, hz=10)
    except WebSocketDisconnect:
        stop.set()
    except Exception as e:
        print(f"[telemetry_ws] error: {e}", flush=True)
