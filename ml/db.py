"""Minimal Supabase (PostgREST) helpers using the SERVICE ROLE key.

Set in ml/.env (never commit it, never expose it to the frontend):
    SUPABASE_URL=https://xxxx.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=...
"""
import os

import pandas as pd
import requests


def configured() -> bool:
    return bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_ROLE_KEY"))


def _headers(extra: dict | None = None) -> dict:
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    h = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    h.update(extra or {})
    return h


def _url(table: str) -> str:
    return f"{os.environ['SUPABASE_URL'].rstrip('/')}/rest/v1/{table}"


def fetch(table: str, order: str = "year.asc,month.asc") -> pd.DataFrame:
    r = requests.get(_url(table), headers=_headers(), params={"select": "*", "order": order}, timeout=30)
    r.raise_for_status()
    return pd.DataFrame(r.json())


def upsert(table: str, rows: list[dict], on_conflict: str | None = None) -> None:
    if not rows:
        return
    params = {"on_conflict": on_conflict} if on_conflict else {}
    r = requests.post(
        _url(table),
        headers=_headers({"Prefer": "resolution=merge-duplicates,return=minimal"}),
        params=params,
        json=rows,
        timeout=30,
    )
    r.raise_for_status()


def insert(table: str, rows: list[dict]) -> None:
    if not rows:
        return
    r = requests.post(_url(table), headers=_headers({"Prefer": "return=minimal"}), json=rows, timeout=30)
    r.raise_for_status()
