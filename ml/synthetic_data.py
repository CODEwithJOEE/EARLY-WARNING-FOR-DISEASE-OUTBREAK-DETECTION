"""Generate SYNTHETIC monthly data (Jan 2025 - Oct 2026) for prototyping.

NOT real RHU data. Replace data/monthly_cases.csv and data/monthly_weather.csv with
the real records (same columns) or load real rows into Supabase.

Run:  python synthetic_data.py
"""
from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).parent / "data"
RNG = np.random.default_rng(2026)


def generate() -> tuple[pd.DataFrame, pd.DataFrame]:
    months = pd.period_range("2025-01", "2026-10", freq="M")
    n = len(months)
    m = np.array([p.month for p in months])

    # --- weather (seasonal + noise) ---
    rain = 190 + 110 * np.sin(2 * np.pi * (m - 5) / 12) + RNG.normal(0, 35, n)
    rain = np.clip(rain, 40, None)
    temp = 27.6 + 1.1 * np.sin(2 * np.pi * (m - 3) / 12) + RNG.normal(0, 0.25, n)
    hum = 79 + 0.018 * (rain - 190) + RNG.normal(0, 1.2, n)

    weather = pd.DataFrame(
        {
            "year": [p.year for p in months],
            "month": m,
            "rainfall_mm": rain.round(1),
            "temperature_c": temp.round(1),
            "humidity_pct": hum.round(1),
        }
    )

    # --- cases: weather-lagged signal + noise + a few injected spikes ---
    rain_lag1 = np.r_[rain[0], rain[:-1]]
    temp_lag1 = np.r_[temp[0], temp[:-1]]

    diarrhea = 42 + 0.07 * (rain_lag1 - 190) + RNG.normal(0, 4, n)
    cough = 88 - 5.5 * (temp_lag1 - 27.6) + RNG.normal(0, 7, n)
    fever = 66 + 0.03 * (rain_lag1 - 190) + RNG.normal(0, 5, n)

    def spike(arr, label, factor):
        i = list(months.astype(str)).index(label)
        arr[i] *= factor

    spike(diarrhea, "2025-09", 1.65)
    spike(diarrhea, "2026-05", 1.55)
    spike(diarrhea, "2026-09", 1.7)
    spike(cough, "2026-01", 1.5)
    spike(cough, "2026-07", 1.45)
    spike(cough, "2026-10", 1.4)
    spike(fever, "2025-11", 1.5)
    spike(fever, "2026-06", 1.55)
    spike(fever, "2026-08", 1.45)

    cases = pd.DataFrame(
        {
            "year": [p.year for p in months],
            "month": m,
            "cough": np.round(cough).astype(int),
            "fever": np.round(fever).astype(int),
            "diarrhea": np.round(diarrhea).astype(int),
        }
    )
    return cases, weather


if __name__ == "__main__":
    DATA_DIR.mkdir(exist_ok=True)
    cases, weather = generate()
    cases.to_csv(DATA_DIR / "monthly_cases.csv", index=False)
    weather.to_csv(DATA_DIR / "monthly_weather.csv", index=False)
    print(f"Wrote {len(cases)} synthetic months to {DATA_DIR}")
