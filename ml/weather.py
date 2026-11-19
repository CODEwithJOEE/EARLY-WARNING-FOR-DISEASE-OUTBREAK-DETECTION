"""Fetch monthly weather for Katipunan, Zamboanga del Norte from Open-Meteo (free, no key).

Usage:  python weather.py 2025-01-01 2026-10-31
Writes data/monthly_weather.csv (and upserts to Supabase if configured).

NOTE: verify the coordinates with the RHU / a map before using real results.
"""
import os
import sys
from pathlib import Path

import pandas as pd
import requests

# Katipunan town center, Zamboanga del Norte (PhilAtlas: 8.5128 N, 123.2847 E).
# Checked on a map: the point is on land in the poblacion, not offshore.
LAT, LON = 8.5128, 123.2847
URL = "https://archive-api.open-meteo.com/v1/archive"


def monthly_from_daily(d: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Aggregate daily weather to months. Also report months with missing days.

    The weather source can lag by a few days, so the last days of a month fetched right after it
    ends may be empty. A month with missing days gets an under-counted rainfall total.
    """
    d = d.copy()
    d["time"] = pd.to_datetime(d["time"])
    d["year"], d["month"] = d["time"].dt.year, d["time"].dt.month
    out = d.groupby(["year", "month"]).agg(
        rainfall_mm=("precipitation_sum", "sum"),
        temperature_c=("temperature_2m_mean", "mean"),
        humidity_pct=("relative_humidity_2m_mean", "mean"),
    )
    days_with_data = d.dropna(subset=["precipitation_sum"]).groupby(["year", "month"]).size()
    warnings = []
    for (y, m), _ in out.iterrows():
        have = int(days_with_data.get((y, m), 0))
        expected = pd.Period(f"{y}-{m:02d}").days_in_month
        if have < expected:
            warnings.append(f"{y}-{m:02d} has weather for only {have} of {expected} days; its rainfall total may be too low.")
    return out.round(1).reset_index(), warnings


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
    out, warnings = monthly_from_daily(pd.DataFrame(r.json()["daily"]))
    prefix = "::warning::" if os.getenv("GITHUB_ACTIONS") else "WARNING: "
    for w in warnings:
        print(prefix + w)
    return out


if __name__ == "__main__":
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
