"""Early Warning pipeline: load -> features -> evaluate -> forecast -> write results.

Run:
    python synthetic_data.py      # only for the prototype
    python pipeline.py            # reads data/*.csv, or Supabase if ml/.env is set
    python pipeline.py --csv      # force CSV even if Supabase is configured

Models compared (one-month-ahead forecast of "elevated" status, expanding-window validation):
    persistence_baseline : predict elevated if LAST month was elevated (simple statistical rule)
    rf_no_weather        : Random Forest on case lags + seasonality
    rf_with_weather      : Random Forest on case lags + seasonality + rainfall/temp/humidity lags
"""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score

import db
from features import DISEASES, FEATURE_LABELS, build_frame, make_dataset

ROOT = Path(__file__).parent
SETTINGS = {"sd_multiplier": 1.0, "moderate_score": 0.3, "high_score": 0.6}
MIN_TRAIN = 8  # labelled months required before the first validation step
SEED = 42


def new_rf() -> RandomForestClassifier:
    return RandomForestClassifier(
        n_estimators=300, max_depth=4, min_samples_leaf=2, random_state=SEED
    )


def level_for(score: float) -> str:
    if score >= SETTINGS["high_score"]:
        return "high"
    if score >= SETTINGS["moderate_score"]:
        return "moderate"
    return "low"


def fit_predict(X_tr, y_tr, X_te):
    """Fit RF; if training data has a single class, return that class as the score."""
    if y_tr.nunique() < 2:
        return np.full(len(X_te), float(y_tr.iloc[0])), None
    rf = new_rf().fit(X_tr, y_tr)
    return rf.predict_proba(X_te)[:, 1], rf


def metrics(y_true, y_pred) -> dict:
    y_true, y_pred = np.asarray(y_true, dtype=int), np.asarray(y_pred, dtype=int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 3),
        "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 3),
        "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 3),
        "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 3),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def run_disease(df: pd.DataFrame, disease: str) -> dict:
    k = SETTINGS["sd_multiplier"]
    cut = SETTINGS["moderate_score"]

    Xw, y, meta = make_dataset(df, disease, k, use_weather=True)
    Xn, _, _ = make_dataset(df, disease, k, use_weather=False)

    # rows that have a label AND complete features (lag3 needs 3 prior months)
    labelled = y.notna() & Xw.notna().all(axis=1) & ~meta["is_future"]
    idx = list(Xw.index[labelled])
    n = len(idx)
    if n <= MIN_TRAIN:
        raise SystemExit(f"{disease}: only {n} usable months; need more than {MIN_TRAIN}.")

    oof = {"rf_with_weather": [], "rf_no_weather": [], "persistence_baseline": []}
    truth, test_rows = [], []
    for pos in range(MIN_TRAIN, n):
        tr, te = idx[:pos], [idx[pos]]
        for name, X in (("rf_with_weather", Xw), ("rf_no_weather", Xn)):
            score, _ = fit_predict(X.loc[tr], y.loc[tr], X.loc[te])
            oof[name].append(float(score[0]))
        prev = idx[pos - 1]
        oof["persistence_baseline"].append(float(y.loc[prev]))
        truth.append(int(y.loc[te[0]]))
        test_rows.append(te[0])

    model_metrics = []
    for name, scores in oof.items():
        pred = (np.array(scores) >= cut).astype(int)
        m = metrics(truth, pred)
        m.update({"model": name, "n_train_min": MIN_TRAIN, "n_test": len(truth), "n_positive": int(sum(truth))})
        model_metrics.append(m)

    # ---- final model on all labelled data -> forecast next month ----
    final_score, rf = fit_predict(Xw.loc[idx], y.loc[idx], Xw.loc[[df.index[-1]]])
    score = float(final_score[0])
    factors = []
    if rf is not None:
        imp = pd.Series(rf.feature_importances_, index=Xw.columns).sort_values(ascending=False)
        factors = [
            {"feature": FEATURE_LABELS.get(f, f), "importance": round(float(v), 3)} for f, v in imp.head(4).items()
        ]

    nxt = df.iloc[-1]
    hist = df.iloc[:-1][disease]
    stat_thr_next = float(hist.mean() + k * hist.std(ddof=1))
    last = meta.iloc[-2]  # latest observed month
    stat_exceeded_latest = bool(pd.notna(last.threshold) and last.cases > last.threshold)

    history = []
    for r, s_nw, s_w, s_b in zip(
        test_rows, oof["rf_no_weather"], oof["rf_with_weather"], oof["persistence_baseline"]
    ):
        history.append(
            {
                "label": meta.loc[r, "label"],
                "actual_elevated": int(y.loc[r]),
                "rf_with_weather_score": round(s_w, 3),
                "rf_no_weather_score": round(s_nw, 3),
                "baseline": int(s_b),
            }
        )

    series = []
    for i, row in df.iloc[:-1].iterrows():
        t = meta.loc[i, "threshold"]
        series.append(
            {
                "label": row["label"],
                "year": int(row["year"]),
                "month": int(row["month"]),
                "cases": int(row[disease]),
                "threshold": None if pd.isna(t) else round(float(t), 1),
                "elevated": bool(pd.notna(t) and row[disease] > t),
            }
        )

    return {
        "disease": disease,
        "series": series,
        "metrics": model_metrics,
        "history": history,
        "forecast": {
            "label": nxt["label"],
            "year": int(nxt["year"]),
            "month": int(nxt["month"]),
            "risk_score": round(score, 3),
            "risk_level": level_for(score),
            "stat_threshold": round(stat_thr_next, 1),
            "top_factors": factors,
        },
        "latest_stat_exceeded": stat_exceeded_latest,
        "latest_label": last["label"],
    }


def build_alerts(per_disease: list[dict]) -> list[dict]:
    alerts = []
    for d in per_disease:
        f = d["forecast"]
        if f["risk_level"] in ("moderate", "high"):
            top = f["top_factors"][0]["feature"] if f["top_factors"] else "recent trend"
            alerts.append(
                {
                    "disease": d["disease"], "year": f["year"], "month": f["month"], "label": f["label"],
                    "level": f["risk_level"], "source": "ml_forecast",
                    "message": f"Forecast risk {f['risk_score']:.0%} for {f['label']}. Main factor: {top}.",
                }
            )
        if d["latest_stat_exceeded"]:
            last = d["series"][-1]
            alerts.append(
                {
                    "disease": d["disease"], "year": last["year"], "month": last["month"], "label": last["label"],
                    "level": "moderate", "source": "statistical",
                    "message": f"{last['cases']} cases in {last['label']} exceeded the statistical threshold ({last['threshold']}).",
                }
            )
    return alerts


def load_inputs(force_csv: bool):
    if db.configured() and not force_csv:
        cases, weather = db.fetch("monthly_cases"), db.fetch("monthly_weather")
        src = "supabase"
    else:
        cases = pd.read_csv(ROOT / "data" / "monthly_cases.csv")
        weather = pd.read_csv(ROOT / "data" / "monthly_weather.csv")
        src = "csv"
    return cases, weather, src


def write_supabase(result: dict) -> None:
    pred_rows, metric_rows = [], []
    for d in result["diseases"]:
        f = d["forecast"]
        pred_rows.append(
            {
                "year": f["year"], "month": f["month"], "disease": d["disease"],
                "risk_score": f["risk_score"], "risk_level": f["risk_level"],
                "stat_threshold": f["stat_threshold"], "stat_exceeded": d["latest_stat_exceeded"],
                "top_factors": f["top_factors"],
            }
        )
        for m in d["metrics"]:
            metric_rows.append(
                {
                    "disease": d["disease"], "model_name": m["model"], "accuracy": m["accuracy"],
                    "precision_score": m["precision"], "recall": m["recall"], "f1": m["f1"],
                    "confusion_matrix": m["confusion_matrix"], "n_train": m["n_train_min"], "n_test": m["n_test"],
                }
            )
    db.upsert("predictions", pred_rows, on_conflict="year,month,disease")
    db.upsert(
        "alerts",
        [
            {"year": a["year"], "month": a["month"], "disease": a["disease"], "level": a["level"], "message": a["message"]}
            for a in result["alerts"]
        ],
        on_conflict="year,month,disease",
    )
    db.insert("model_metrics", metric_rows)
    db.upsert("settings", [{"key": "alert_threshold", "value": SETTINGS}], on_conflict="key")


def main() -> None:
    load_dotenv(ROOT / ".env")
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", action="store_true", help="read data/*.csv even if Supabase is configured")
    ap.add_argument("--no-write", action="store_true", help="do not write results to Supabase")
    args = ap.parse_args()

    cases, weather, src = load_inputs(args.csv)
    df = build_frame(cases, weather)
    if df[["rainfall_mm", "temperature_c", "humidity_pct"]].iloc[:-1].isna().any().any():
        raise SystemExit("Missing weather for some case months. Run weather.py first.")

    per_disease = [run_disease(df, d) for d in DISEASES]
    result = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "data_source": src,
        "settings": SETTINGS,
        "n_months": int(len(df) - 1),
        "weather": [
            {"label": r["label"], "rainfall_mm": r["rainfall_mm"], "temperature_c": r["temperature_c"], "humidity_pct": r["humidity_pct"]}
            for _, r in df.iloc[:-1].iterrows()
        ],
        "diseases": per_disease,
        "alerts": build_alerts(per_disease),
    }

    out = ROOT / "output" / "results.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(result, indent=2))
    print(f"[{src}] {result['n_months']} months -> {out}")

    for d in per_disease:
        f = d["forecast"]
        print(f"  {d['disease']:9s} forecast {f['label']}: {f['risk_score']:.2f} ({f['risk_level']})")
        for m in d["metrics"]:
            print(f"      {m['model']:21s} acc={m['accuracy']:.2f} P={m['precision']:.2f} R={m['recall']:.2f} F1={m['f1']:.2f} (test={m['n_test']}, pos={m['n_positive']})")

    if db.configured() and not args.no_write and src == "supabase":
        write_supabase(result)
        print("Wrote predictions, alerts and metrics to Supabase.")


if __name__ == "__main__":
    main()
