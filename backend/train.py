"""Train anomaly / fault / RUL models on the NASA C-MAPSS FD001 dataset.

Uses real train_FD001.txt / test_FD001.txt / RUL_FD001.txt if present under
backend/data/cmapss/. If files are absent, the synthetic FD001-shaped
generator in app/data.py takes over so training is always reproducible.

Usage:
    python train.py

Artifacts:
    models/anomaly.joblib
    models/fault.joblib
    models/rul.joblib
    models/rul_metrics.json
"""
from __future__ import annotations
import time
from app.data import load_train, load_test, add_rul_column
from app.anomaly import train_anomaly
from app.fault import train_fault
from app.rul import train_rul, load_metrics


def main() -> None:
    t0 = time.time()
    print("[train] loading C-MAPSS FD001 (real or synthetic)...", flush=True)
    train_df_raw = load_train()
    test_df_raw, true_rul = load_test()
    train_df = add_rul_column(train_df_raw)
    print(f"[train] train rows: {len(train_df)} | test rows: {len(test_df_raw)} | units: {train_df['unit'].nunique()}", flush=True)

    print("[train] fitting IsolationForest anomaly detector...", flush=True)
    train_anomaly(train_df)

    print("[train] fitting LightGBM fault classifier...", flush=True)
    train_fault(train_df)

    print("[train] fitting LightGBM quantile RUL regressor (P10/P50/P90)...", flush=True)
    train_rul(train_df, test_df_raw, true_rul)

    print(f"[train] done in {time.time() - t0:.1f}s. Backtest: {load_metrics()}", flush=True)


if __name__ == "__main__":
    main()
