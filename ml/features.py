"""Feature engineering and labelling.

Design:
- Target for month t: is cases(t) "elevated"?  elevated = cases(t) > mean + k*SD of all
  PREVIOUS months (expanding window, at least MIN_HISTORY months of history).
  Replace this rule with the RHU's own definition if they have one.
- Features for month t only use information available BEFORE month t
  (lags of cases and weather), so the model is a true one-month-ahead forecast.
"""
import numpy as np
import pandas as pd

DISEASES = ["cough", "fever", "diarrhea"]
MIN_HISTORY = 4  # months of history needed before a label can be computed

FEATURE_LABELS = {
    "cases_lag1": "Cases last month",
    "cases_lag2": "Cases 2 months ago",
    "cases_lag3": "Cases 3 months ago",
    "rain_lag1": "Rainfall last month",
    "rain_lag2": "Rainfall 2 months ago",
    "temp_lag1": "Temperature last month",
    "hum_lag1": "Humidity last month",
    "month_sin": "Seasonality (month of year)",
    "month_cos": "Seasonality (month of year, cos)",
}


def build_frame(cases: pd.DataFrame, weather: pd.DataFrame) -> pd.DataFrame:
    """Merge cases + weather, sort by time, append one empty row for the next month."""
    df = cases.merge(weather, on=["year", "month"], how="left").sort_values(["year", "month"])
    df = df.reset_index(drop=True)
    last = df.iloc[-1]
    ny, nm = (int(last.year) + 1, 1) if int(last.month) == 12 else (int(last.year), int(last.month) + 1)
    nxt = {c: np.nan for c in df.columns}
    nxt.update({"year": ny, "month": nm})
    df = pd.concat([df, pd.DataFrame([nxt])], ignore_index=True)
    df["is_future"] = False
    df.loc[df.index[-1], "is_future"] = True
    df["label"] = df["year"].astype(int).astype(str) + "-" + df["month"].astype(int).astype(str).str.zfill(2)
    return df


def thresholds(series: pd.Series, k: float) -> pd.Series:
    """Expanding-window threshold using only previous months. NaN until MIN_HISTORY."""
    prev = series.shift(1)
    mean = prev.expanding(min_periods=MIN_HISTORY).mean()
    sd = prev.expanding(min_periods=MIN_HISTORY).std(ddof=1)
    return mean + k * sd


def make_dataset(df: pd.DataFrame, disease: str, k: float, use_weather: bool):
    """Return (X, y, meta) where meta carries labels/future flag for each row."""
    s = df[disease]
    thr = thresholds(s, k)
    y = (s > thr).astype(float)
    y[thr.isna() | s.isna()] = np.nan

    X = pd.DataFrame(index=df.index)
    for lag in (1, 2, 3):
        X[f"cases_lag{lag}"] = s.shift(lag)
    if use_weather:
        X["rain_lag1"] = df["rainfall_mm"].shift(1)
        X["rain_lag2"] = df["rainfall_mm"].shift(2)
        X["temp_lag1"] = df["temperature_c"].shift(1)
        X["hum_lag1"] = df["humidity_pct"].shift(1)
    X["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    X["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

    meta = df[["year", "month", "label", "is_future"]].copy()
    meta["threshold"] = thr
    meta["cases"] = s
    return X, y, meta
