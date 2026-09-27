# AEROTWIN-AI

> **SIH26054 · DRDO / Ministry of Defence**
> AI-Powered Digital Twin for Predictive Health Monitoring, Fault Prediction, and Mission Reliability of MALE UAV Aero Piston Engines
> **Team Ignite**

AEROTWIN-AI ingests engine telemetry from a MALE UAV aero-piston power plant, mirrors the engine as a live physics-based digital twin, and layers three learned models on top:

1. **Isolation-Forest anomaly detector** — flags divergence from healthy-baseline behaviour
2. **LightGBM fault classifier** — resolves the divergence into a fault regime (EARLY_WEAR / HOT_SECTION_DEGRADATION / IMPENDING_FAILURE)
3. **LightGBM quantile RUL regressor** — P10 / P50 / P90 remaining-useful-life bands

A rules-based mission engine turns those numbers into a **GO / CAUTION / INSPECTION** verdict, with every prediction backed by an explainable trace — physics residuals, per-sensor contributions, feature importances.

Everything is trained on the **NASA C-MAPSS Turbofan Engine Degradation Dataset (FD001)** — a real, public, open aero-engine degradation corpus. Backend auto-falls-back to a C-MAPSS-identical synthetic corpus if the real files are absent, so the pipeline is 100% reproducible offline.

---

## Screens

| Page | What it shows |
| --- | --- |
| **/** Dashboard | Live sensor gauges (RPM, CHT, EGT, Oil T/P, Fuel, Vibration) · engine cutaway with residual heat-map · Health Index dial · RUL P10/P50/P90 band · Mission Decision · Alert Console · 6 time-series charts (actual vs expected) |
| **/twin** Digital Twin Viewer | Clickable engine parts, sensor picker, physics-vs-actual overlay, residual chart, scrub slider |
| **/mission** Mission Planner | Duration, criticality, altitude sliders · live GO/CAUTION/INSPECTION with reasoning tree · What-If shortcuts |
| **/fleet** Fleet Overview | Grid of 8 UAVs (Rustom, Tapas, Nishant, Ghatak callsigns) — sortable by health / RUL / readiness |
| **/alerts** Alert History | Filterable log · click to expand → contributing sensors + attribution bars |

**Showstopper demo:** click **▶▶ Fast-forward 100 cycles** on the dashboard. The engine ages a hundred cycles in three seconds — you watch health drop, EGT residual climb, an anomaly get raised, a hot-section-degradation alert appear, and the mission verdict flip GO → CAUTION → INSPECTION with a full reasoning trace.

---

## Architecture

```
frontend  (Next.js 14 App Router · Tailwind · Recharts)
   │  REST  →  GET  /twin/state /anomaly /fault /rul /health/index /alerts /fleet /config
   │          POST /mission/assess /mission/fastforward /mission/setunit
   │  WS    →  /telemetry/stream   (10 Hz composite live packet)
   ▼
backend   (FastAPI · Uvicorn/Gunicorn · Python 3.11)
   ├── app/telemetry.py   ── replays a real C-MAPSS unit at 10 Hz
   ├── app/twin.py        ── polynomial physics model → expected readings → residuals
   ├── app/anomaly.py     ── IsolationForest on healthy cycles
   ├── app/fault.py       ── LightGBM multiclass on RUL-bucketed regimes
   ├── app/rul.py         ── LightGBM quantile regression (P10/P50/P90)
   ├── app/health.py      ── composite Health Index [0..100]
   ├── app/mission.py     ── rules-based GO/CAUTION/INSPECTION engine
   └── app/alerts.py      ── explainable alert composer with attribution
```

## Model performance

Backtest metrics from the RUL P50 model on 100 held-out FD001 test units (last-cycle prediction vs true remaining life):

| Metric | Value |
| --- | --- |
| R² | **0.63** |
| MAE | **28.7 cycles** |
| N | 100 units |

These live at `GET /health` — nothing hidden.

## Explainability

Every number the frontend shows can be traced back:

* Anomaly → per-sensor **standardized-|z| contributions** (top-4 shown in the expandable alert card)
* Fault → LightGBM **feature importances** + per-class **posterior probability distribution**
* RUL → **quantile band** (P10..P90) makes uncertainty a first-class signal
* Mission verdict → **rules with named thresholds**, each failing rule listed as a reason
* Twin residuals → **actual − expected** per sensor, with the physics model source in `app/twin.py`

No ₹, %, or cycle count in the UI is not traceable to a specific model, feature, or rule.

---

## Local development

```bash
# Everything, dockerized:
docker compose up --build

# Or in two terminals:
# 1) Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python train.py          # trains all three models (~15s)
uvicorn main:app --reload --port 8000

# 2) Frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev              # http://localhost:3000
```

## Environment variables

| Name | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | REST base URL |
| `NEXT_PUBLIC_WS_URL` | derived from `NEXT_PUBLIC_API_URL` | telemetry WebSocket base URL |

## Deployment

### Frontend → Vercel

1. `cd frontend`
2. `vercel --prod` (or import the repo in the Vercel dashboard)
3. Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` in the Vercel project's env vars to your Render backend URL (`https://…` / `wss://…`).

`vercel.json` is committed.

### Backend → Render

* Render → **New Web Service** → Docker → point to `backend/`
* Free tier (512 MB) is sufficient — models are pre-trained at Docker build time so cold-start is only Python import.
* Port `8000`. Health check: `GET /health`.

### Dataset

The real NASA C-MAPSS FD001 dataset is publicly available from:

* NASA Prognostics Data Repository — https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/
* Kaggle mirror — https://www.kaggle.com/datasets/behrad3d/nasa-cmaps

To use the real data instead of the built-in synthetic fallback, drop the three files into `backend/data/cmapss/`:

```
train_FD001.txt
test_FD001.txt
RUL_FD001.txt
```

then rerun `python train.py`.

## Model training

`python train.py` fits all three artifacts and writes them to `backend/models/`:

* `anomaly.joblib`  — Isolation Forest + StandardScaler
* `fault.joblib`    — LightGBM multiclass (4 fault regimes)
* `rul.joblib`      — LightGBM Quantile Regressor × 3 (P10 / P50 / P90)
* `rul_metrics.json` — backtest R² / MAE

Committed artifacts mean **Render never trains on boot** — no 512 MB memory pressure spike.

---

## Attribution

Dataset — **A. Saxena, K. Goebel, D. Simon, N. Eklund**, "Damage Propagation Modeling for Aircraft Engine Run-to-Failure Simulation", *International Conference on Prognostics and Health Management*, 2008. NASA Ames Prognostics Data Repository.

---

**Prototype built for SIH26054 by Team Ignite.**
