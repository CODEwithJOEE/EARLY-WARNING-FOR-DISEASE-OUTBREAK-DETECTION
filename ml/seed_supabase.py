"""Load the SYNTHETIC demo data (ml/data/*.csv) into Supabase so the dashboard has something to show.

    python synthetic_data.py     # creates the CSVs
    python seed_supabase.py      # uploads them
    python pipeline.py           # computes forecasts, alerts and metrics

Do NOT use this with real data. For real records, enter them in the app or import a CSV.
"""
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv

import db

ROOT = Path(__file__).parent

if __name__ == "__main__":
    load_dotenv(ROOT / ".env")
    if not db.configured():
        raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in ml/.env first.")
    cases = pd.read_csv(ROOT / "data" / "monthly_cases.csv")
    weather = pd.read_csv(ROOT / "data" / "monthly_weather.csv")
    db.upsert("monthly_cases", cases.to_dict("records"), on_conflict="year,month")
    db.upsert("monthly_weather", weather.assign(source="synthetic-demo").to_dict("records"), on_conflict="year,month")
    print(f"Seeded {len(cases)} demo months of cases and weather.")
