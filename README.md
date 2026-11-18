# Early Warning for Disease Outbreak Detection

Decision-support system for the Rural Health Unit of Katipunan, Zamboanga del Norte.
It tracks monthly cough, fever and diarrhea cases, forecasts next-month risk, and raises alerts.
It does **not** diagnose disease. Only aggregated monthly counts are stored (no patient data).

## How the pieces fit

```
Next.js website  ──writes cases──▶  Supabase (Postgres + Auth)  ◀──reads/writes──  Python pipeline (ml/)
      ▲                                      │
      └──────────── reads forecasts, alerts, metrics ──────────────┘
```

- **Next.js** (this folder): login, monthly case entry / CSV import, dashboard, alerts, model evaluation.
- **Python** (`ml/`): loads cases and weather from Supabase, compares a statistical baseline with Random Forest
  (with and without weather), forecasts next month, writes `predictions`, `alerts`, `model_metrics`.
- **Supabase**: the only thing the two share.

## Setup

1. **Database.** In Supabase, open SQL Editor and run `supabase/schema.sql`.
2. **First admin.** Authentication → Users → add a user. Then Table Editor → `profiles` → set that user's `role` to `admin`.
3. **Website keys.** Copy `.env.example` to `.env.local` and fill in the project URL and anon/publishable key.
4. **Python keys.** Copy `ml/.env.example` to `ml/.env` and fill in the URL and the **service role** key.
   Never put the service role key in `.env.local`, in the frontend, or in Git.
5. **Supabase Auth settings.** Authentication → Sign In / Providers → turn **off** "Allow new users to sign up"
   (the admin creates every account). Authentication → URL Configuration → set **Site URL** to the live website address.
6. **GitHub Secrets.** In the repository: Settings → Secrets and variables → Actions → **Repository secrets** → add
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The workflow needs them to read and write the database.
7. Install and run the website:
   ```bash
   npm install
   npm run dev          # http://localhost:3000
   ```
8. Install the Python side:
   ```bash
   cd ml
   python -m venv .venv
   .venv\Scripts\activate          # Windows  (Mac/Linux: source .venv/bin/activate)
   pip install -r requirements.txt
   ```

## Try it with demo data (synthetic, not real)

```bash
cd ml
python synthetic_data.py     # makes data/monthly_cases.csv and data/monthly_weather.csv
python seed_supabase.py      # uploads them to Supabase
python pipeline.py           # forecasts + alerts + metrics -> Supabase
```

Refresh the dashboard to see it.

## With real data

1. **Remove all demo and test data first.** In Supabase SQL Editor run:
   ```sql
   delete from alerts; delete from predictions; delete from model_metrics;
   delete from monthly_cases; delete from monthly_weather;
   ```
   This also removes any test weather rows (source `test` or `synthetic-demo`).
2. Enter the RHU's monthly counts in the app (Monthly cases page) or import a CSV with the columns
   `year,month,cough,fever,diarrhea`. Every month must be present, with no gaps.
3. Fetch weather for the same months (needs internet), from the first month of your case data to the last:
   `python weather.py 2023-01-01 2026-10-31` (the daily workflow keeps it up to date from 2023-01-01). The weather comes from Open-Meteo, which is **gridded reanalysis data,
   not a weather station**. Coordinates are in `weather.py` (Katipunan town center, 8.5128 N, 123.2847 E);
   check them against a map, and compare the monthly rainfall with any local records the RHU or the LGU has.
4. Run `python pipeline.py`, or press **Run prediction** on the dashboard.

## Monthly update (automatic)

Monthly routine:

1. **Days 1–5:** the RHU enters last month's totals (Monthly cases page or CSV import).
2. **Days 7–14:** `.github/workflows/run-pipeline.yml` runs automatically every day at 9:00 AM Philippine time.
   Running several days in a row is safe: results for the same month are replaced, and alerts that were already
   acknowledged or resolved keep their status. If the data was entered late, the next daily run picks it up.
3. **Any time:** an admin can press **Run prediction** on the dashboard (or start the workflow from the Actions tab).
   Before the 5th, the weather source may not yet have the last days of last month, so run again after the 5th
   for a final result.

Safeguards:

- The dashboard shows a **Data is behind** banner when the latest month entered is older than the previous calendar month.
- The pipeline stops with `Missing month: YYYY-MM. Add it before running.` if the case series skips a month
  (a gap would silently misalign the lag features).

Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` under Settings → Secrets and variables → Actions.

## "Run prediction" button (admin only)

The dashboard has a **Run prediction** button that starts the same GitHub workflow, so nobody has to open GitHub.
It shows the last run time and whether it succeeded, and refreshes the dashboard when a run finishes.

Set these in Vercel (Settings -> Environment Variables), then redeploy:

| Name                | Value                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------- |
| `GH_DISPATCH_TOKEN` | Fine-grained GitHub token: this repository only, permission **Actions: Read and write** |
| `GITHUB_REPO`       | `owner/repository-name`                                                                 |
| `GITHUB_BRANCH`     | optional, defaults to `master`                                                          |

Notes: the token expires (the current one expires around **Feb 11, 2027**). Before then, create a new token on GitHub,
replace `GH_DISPATCH_TOKEN` in Vercel and redeploy. If it expires, the button stops working but the automatic monthly
run and the rest of the app keep working. Without these variables the button is disabled
and the rest of the app works as before. Only users with the `admin` role can start a run; this is checked on the server.

## Deploying the website

Deploy to Vercel (import the repository, Application Preset **Next.js**). Vercel ignores `ml/`.

Environment variables (Project → Settings → Environment Variables):

| Name                                                      | Needed for                                  |
| --------------------------------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                | website (required)                          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon or publishable key) | website (required)                          |
| `GH_DISPATCH_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH`       | Run prediction button (optional, see above) |

**Redeploy after changing any environment variable**; a running deployment does not pick up new values.
Never add the Supabase service role key to Vercel.

## Things to decide with the RHU

- **What counts as "elevated"?** Currently: cases above the mean + 1.0 SD of all previous months
  (`SETTINGS` in `ml/pipeline.py`; alert cut-offs 0.3 moderate / 0.6 high). These demo values were tuned
  on synthetic data. Replace them with the RHU's own definition or an agreed epidemic threshold.
- **Suggested actions** shown with alerts are generic (`lib/recommendations.ts`). The RHU should review and edit them.

## Known limits (state these in the thesis)

- The demo data is synthetic (22 months). Never report numbers from it. Report only results from a run on the
  RHU's real data.
- Even with the 46 months requested from the RHU (Jan 2023 to Oct 2026), this is one municipality's monthly totals,
  so the test period is short and has few elevated months. Accuracy, precision, recall and F1 can still be unstable.
- If the RHU can give less than two full years, the model cannot learn a reliable yearly pattern.
- The model compares favourably or unfavourably with the simple baseline depending on the data; report what you
  actually find. It should improve as more months are added.
- Validation is time-ordered (train on earlier months, test on the next one), never a random split.
- Weather is gridded reanalysis data (Open-Meteo), not a weather station, and may differ from local rainfall.
- Only municipality-level monthly totals are used, so the system cannot show which barangay is affected.
- The forecast looks one month ahead only.
- The risk score is a model score, not a calibrated probability.
- "Main factors" are feature importances of the model. They show what the model used, not what caused the cases.
- The cut-offs (mean + 1.0 SD for "elevated"; 0.3 moderate, 0.6 high) were tuned on synthetic data and must be
  validated with the RHU's real data.
