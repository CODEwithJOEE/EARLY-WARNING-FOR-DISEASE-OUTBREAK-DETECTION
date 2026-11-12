"use client";

import { useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DISEASES,
  DISEASE_LABEL,
  MONTHS,
  monthLabel,
  type CaseRow,
  type Disease,
  type WeatherRow,
} from "@/lib/types";

const YEAR_COLORS = ["#0f766e", "#d97706", "#7c3aed", "#2563eb"];
const GRID = "rgba(85,101,95,0.2)";
const AXIS = { fontSize: 12, fill: "#55655f" };

export default function DiseaseCharts({
  cases,
  weather,
  thresholds,
}: {
  cases: CaseRow[];
  weather: WeatherRow[];
  thresholds: Partial<Record<Disease, number>>;
}) {
  const [disease, setDisease] = useState<Disease>("diarrhea");
  const years = [...new Set(cases.map((c) => c.year))].sort();

  const trend = cases.map((c) => ({
    label: monthLabel(c.year, c.month),
    cases: c[disease],
  }));

  const yoy = MONTHS.map((m, i) => {
    const row: Record<string, string | number | null> = { month: m };
    for (const y of years) {
      const hit = cases.find((c) => c.year === y && c.month === i + 1);
      row[String(y)] = hit ? hit[disease] : null;
    }
    return row;
  });

  const wx = cases.map((c) => {
    const w = weather.find((x) => x.year === c.year && x.month === c.month);
    return {
      label: monthLabel(c.year, c.month),
      cases: c[disease],
      rainfall: w ? Number(w.rainfall_mm) : null,
    };
  });

  const thr = thresholds[disease];

  return (
    <section aria-labelledby="charts-h" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="charts-h" className="text-lg font-semibold">
          Trends
        </h2>
        <div role="tablist" aria-label="Disease" className="flex gap-1">
          {DISEASES.map((d) => (
            <button
              key={d}
              role="tab"
              aria-selected={d === disease}
              onClick={() => setDisease(d)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                d === disease
                  ? "bg-accent text-[var(--accent-fg)]"
                  : "btn-ghost"
              }`}
            >
              {DISEASE_LABEL[d]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title={`${DISEASE_LABEL[disease]} cases per month`}
          note={thr ? `Dashed line: statistical threshold (${thr})` : undefined}
        >
          <LineChart
            data={trend}
            margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
          >
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="label"
              tick={AXIS}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis tick={AXIS} />
            <Tooltip />
            {thr && (
              <ReferenceLine y={thr} stroke="#dc2626" strokeDasharray="5 4" />
            )}
            <Line
              type="monotone"
              dataKey="cases"
              name="Cases"
              stroke="#0f766e"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ChartCard>

        <ChartCard
          title="Year-over-year, same month"
          note="Each line is one year. A line fills in as new months are entered."
        >
          <LineChart
            data={yoy}
            margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
          >
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="month" tick={AXIS} />
            <YAxis tick={AXIS} />
            <Tooltip />
            <Legend />
            {years.map((y, i) => (
              <Line
                key={y}
                type="monotone"
                dataKey={String(y)}
                stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ChartCard>
      </div>

      <ChartCard
        title={`${DISEASE_LABEL[disease]} cases and rainfall`}
        note={
          weather.length
            ? "Bars: rainfall (mm). Line: cases."
            : "No weather data yet. Run ml/weather.py or seed the demo data."
        }
      >
        <ComposedChart
          data={wx}
          margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
        >
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis yAxisId="l" tick={AXIS} />
          <YAxis yAxisId="r" orientation="right" tick={AXIS} />
          <Tooltip />
          <Legend />
          <Bar
            yAxisId="r"
            dataKey="rainfall"
            name="Rainfall (mm)"
            fill="#93c5fd"
            radius={[3, 3, 0, 0]}
          />
          <Line
            yAxisId="l"
            type="monotone"
            dataKey="cases"
            name="Cases"
            stroke="#0f766e"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ChartCard>
    </section>
  );
}

function ChartCard({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactElement;
}) {
  return (
    <figure className="card p-4">
      <figcaption className="mb-2">
        <span className="text-sm font-semibold">{title}</span>
        {note && (
          <span className="mt-0.5 block text-xs text-muted">{note}</span>
        )}
      </figcaption>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
