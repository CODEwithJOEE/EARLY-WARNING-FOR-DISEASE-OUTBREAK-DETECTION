"""Fetch monthly weather for Katipunan, Zamboanga del Norte from Open-Meteo (free, no key).

Usage:  python weather.py 2025-01-01 2026-10-31
Writes data/monthly_weather.csv (and upserts to Supabase if configured).

NOTE: verify the coordinates with the RHU / a map before using real results.
"""
import sys
from pathlib import Path

import pandas as pd
import requests

LAT, LON = 8.5167, 123.2833  # Katipunan, Zamboanga del Norte (approx.)
URL = "https://archive-api.open-meteo.com/v1/archive"


def fetch_monthly(start: str, end: str) -> pd.DataFrame:
    r = requests.get(
        URL,
        params={
            "latitude": LAT,
            "longitude": LON,
            "start_date": start,
            "end_date": end,
            "daily": "precipitation_sum,temperature_2m_mean,relative_humidity_2m_mean",
            "timezone": "Asia/Manila",
        },
        timeout=60,
    )
    r.raise_for_status()
    d = pd.DataFrame(r.json()["daily"])
    d["time"] = pd.to_datetime(d["time"])
    d["year"], d["month"] = d["time"].dt.year, d["time"].dt.month
    out = d.groupby(["year", "month"]).agg(
        rainfall_mm=("precipitation_sum", "sum"),
        temperature_c=("temperature_2m_mean", "mean"),
        humidity_pct=("relative_humidity_2m_mean", "mean"),
    )
    return out.round(1).reset_index()


if __name__ == "__main__":
    import os

    import db
    from dotenv import load_dotenv

    load_dotenv()
    if os.getenv("GITHUB_ACTIONS") and not db.configured():
        raise SystemExit(
            "Supabase secrets are missing. In GitHub go to Settings -> Secrets and variables -> Actions and add "
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        )

    start, end = sys.argv[1], sys.argv[2]
    df = fetch_monthly(start, end)
    path = Path(__file__).parent / "data" / "monthly_weather.csv"
    path.parent.mkdir(exist_ok=True)
    df.to_csv(path, index=False)
    print(f"Wrote {len(df)} months to {path}")

    if db.configured():
        db.upsert("monthly_weather", df.assign(source="open-meteo").to_dict("records"), on_conflict="year,month")
        print("Upserted to Supabase.")
