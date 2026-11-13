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
5. Install and run the website:
   ```bash
   npm install
   npm run dev          # http://localhost:3000
   ```
6. Install the Python side:
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

1. Enter the RHU's monthly counts in the app (Monthly cases page) or import a CSV with the columns
   `year,month,cough,fever,diarrhea`.
2. Fetch weather for the same months (needs internet): `python weather.py 2025-01-01 2026-10-31`
   (uses Open-Meteo; check the coordinates in `weather.py` against a map).
3. Run `python pipeline.py`.

## Monthly update (automatic)

`.github/workflows/run-pipeline.yml` runs the pipeline on the 1st of every month and can be started by hand
from the GitHub Actions tab. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` under
Settings → Secrets and variables → Actions.

## "Run prediction" button (admin only)

The dashboard has a **Run prediction** button that starts the same GitHub workflow, so nobody has to open GitHub.
It shows the last run time and whether it succeeded, and refreshes the dashboard when a run finishes.

Set these in Vercel (Settings -> Environment Variables), then redeploy:

| Name                | Value                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------- |
| `GH_DISPATCH_TOKEN` | Fine-grained GitHub token: this repository only, permission **Actions: Read and write** |
| `GITHUB_REPO`       | `owner/repository-name`                                                                 |
| `GITHUB_BRANCH`     | optional, defaults to `master`                                                          |

Notes: the token expires (pick a date and note who renews it). Without these variables the button is disabled
and the rest of the app works as before. Only users with the `admin` role can start a run; this is checked on the server.

## Deploying the website

Deploy to Vercel (import the repository, add the two `NEXT_PUBLIC_` variables). Vercel ignores `ml/`.

## Things to decide with the RHU

- **What counts as "elevated"?** Currently: cases above the mean + 1.0 SD of all previous months
  (`SETTINGS` in `ml/pipeline.py`; alert cut-offs 0.3 moderate / 0.6 high). These demo values were tuned
  on synthetic data. Replace them with the RHU's own definition or an agreed epidemic threshold.
- **Suggested actions** shown with alerts are generic (`lib/recommendations.ts`). The RHU should review and edit them.

## Known limits (state these in the thesis)

- Roughly 22 months of municipality-level data is very small. The held-out test period is ~10 months with
  very few elevated months, so accuracy, precision, recall and F1 are unstable.
- With under two full years, the model cannot learn a reliable yearly pattern.
- The model compares favourably or unfavourably with the simple baseline depending on the data; report what you
  actually find. It should improve as more months are added.
- Validation is time-ordered (train on earlier months, test on the next one), never a random split.
