"""Engine specifications, sensor thresholds, and runtime config."""
from __future__ import annotations
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "cmapss"
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

ENGINE_SPEC = {
    "make": "Rotax 914 UL (reference)",
    "type": "4-cyl 4-stroke turbocharged aero piston",
    "displacement_cc": 1211,
    "max_power_hp": 115,
    "max_rpm": 5800,
    "cruise_rpm": 5000,
    "idle_rpm": 1400,
    "max_cht_c": 135,
    "max_egt_c": 880,
    "min_oil_press_bar": 1.5,
    "max_oil_temp_c": 130,
    "nominal_fuel_flow_lph": 22,
    "nominal_vibration_rms_g": 0.5,
}

SENSORS = [
    {"key": "rpm", "label": "RPM", "unit": "rpm", "min": 1000, "max": 6000, "warn": 5700, "crit": 5900},
    {"key": "cht", "label": "CHT", "unit": "°C", "min": 40, "max": 160, "warn": 125, "crit": 140},
    {"key": "egt", "label": "EGT", "unit": "°C", "min": 200, "max": 950, "warn": 830, "crit": 900},
    {"key": "oil_temp", "label": "Oil Temp", "unit": "°C", "min": 30, "max": 150, "warn": 120, "crit": 135},
    {"key": "oil_press", "label": "Oil Press", "unit": "bar", "min": 0.5, "max": 6.5, "warn": 2.0, "crit": 1.5, "reverse": True},
    {"key": "fuel_flow", "label": "Fuel Flow", "unit": "L/h", "min": 5, "max": 40, "warn": 32, "crit": 36},
    {"key": "vibration", "label": "Vibration", "unit": "g RMS", "min": 0.0, "max": 3.0, "warn": 1.2, "crit": 1.8},
]

# C-MAPSS FD001 has 21 sensor channels. We keep the full 21 for the ML models
# and expose the 7 aero-piston-relevant ones over telemetry.
CMAPSS_SENSORS = [f"s{i}" for i in range(1, 22)]
CMAPSS_SETTINGS = ["setting1", "setting2", "setting3"]

# Sensors selected for the piston-engine facade view.
FACADE_MAP = {
    "rpm": "s7",       # LPC outlet Total Pressure (proxy for shaft speed)
    "cht": "s3",       # HPC outlet temperature
    "egt": "s4",       # LPT outlet temperature
    "oil_temp": "s2",  # LPC outlet temperature
    "oil_press": "s15",  # Bypass ratio (inverted proxy)
    "fuel_flow": "s11",  # Static pressure at HPC
    "vibration": "s21",  # Bleed enthalpy
}

FLEET = [
    {"id": "UAV-01", "callsign": "Rustom-A", "base": "Chitradurga", "hours": 342},
    {"id": "UAV-02", "callsign": "Rustom-B", "base": "Chitradurga", "hours": 128},
    {"id": "UAV-03", "callsign": "Tapas-01", "base": "Bengaluru", "hours": 512},
    {"id": "UAV-04", "callsign": "Tapas-02", "base": "Bengaluru", "hours": 89},
    {"id": "UAV-05", "callsign": "Nishant-A", "base": "Pokhran", "hours": 634},
    {"id": "UAV-06", "callsign": "Nishant-B", "base": "Pokhran", "hours": 271},
    {"id": "UAV-07", "callsign": "Ghatak-X1", "base": "Kalaikunda", "hours": 44},
    {"id": "UAV-08", "callsign": "Ghatak-X2", "base": "Kalaikunda", "hours": 198},
]
