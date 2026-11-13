"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runPipeline } from "@/app/(app)/run/actions";
import { Spinner } from "./Skeleton";

type Run = {
  status: string;
  conclusion: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
} | null;
type Status = { configured: boolean; run?: Run; error?: string } | null;

const ACTIVE = new Set([
  "queued",
  "in_progress",
  "waiting",
  "requested",
  "pending",
]);
const START_TIMEOUT_MS = 3 * 60 * 1000;

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

export default function PipelineCard({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(null);
  const [error, setError] = useState<string | null>(null);
  // Server time when the admin pressed the button; used to recognise the run it started.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const wasActive = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline", { cache: "no-store" });
      if (res.ok) setStatus(await res.json());
    } catch {
      /* keep the last known status */
    }
  }, []);

  // First load of the status.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/pipeline", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setStatus(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const run = status?.run ?? null;
  const runIsNew =
    !!run &&
    startedAt != null &&
    Date.parse(run.createdAt) >= startedAt - 15000;
  const running = !!run && ACTIVE.has(run.status);
  const starting = startedAt != null && !runIsNew; // button pressed, GitHub run not visible yet
  const busy = pending || running || starting;

  // Poll while something is happening.
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => {
      if (
        startedAt != null &&
        !runIsNew &&
        Date.now() - startedAt > START_TIMEOUT_MS
      ) {
        setStartedAt(null);
        setError("The run did not start. Check the Actions tab on GitHub.");
        return;
      }
      load();
    }, 4000);
    return () => clearInterval(t);
  }, [busy, startedAt, runIsNew, load]);

  // When a run finishes, reload the dashboard data.
  useEffect(() => {
    if (wasActive.current && run && run.status === "completed") {
      setStartedAt(null);
      if (run.conclusion === "success") router.refresh();
    }
    wasActive.current = running;
  }, [running, run, router]);

  function onRun() {
    setError(null);
    startTransition(async () => {
      const res = await runPipeline();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStartedAt(res.serverTime);
      load();
    });
  }

  let line: React.ReactNode = (
    <span className="text-muted">Checking status…</span>
  );
  if (status) {
    if (!status.configured)
      line = (
        <span className="text-muted">Manual runs are not set up yet.</span>
      );
    else if (busy)
      line = (
        <span className="inline-flex items-center gap-2">
          <Spinner /> Running… this usually takes 1–2 minutes.
        </span>
      );
    else if (status.error)
      line = <span className="text-red-700">{status.error}</span>;
    else if (!run) line = <span className="text-muted">No run yet.</span>;
    else if (run.conclusion === "success")
      line = <span>Last run: {fmt(run.updatedAt)} · Succeeded</span>;
    else
      line = (
        <span className="text-red-700">
          Last run: {fmt(run.updatedAt)} ·{" "}
          {run.conclusion === "cancelled" ? "Cancelled" : "Failed"}
          {isAdmin && (
            <>
              {" "}
              ·{" "}
              <a
                className="underline"
                href={run.url}
                target="_blank"
                rel="noreferrer"
              >
                View log
              </a>
            </>
          )}
        </span>
      );
  }

  return (
    <section
      aria-labelledby="pipe-h"
      className="card flex flex-wrap items-center justify-between gap-3 p-4"
    >
      <div>
        <h2 id="pipe-h" className="text-sm font-semibold">
          Prediction pipeline
        </h2>
        <p role="status" aria-live="polite" className="mt-0.5 text-sm">
          {line}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
      {isAdmin && (
        <button
          type="button"
          onClick={onRun}
          disabled={busy || (status !== null && !status.configured)}
          className="btn-primary"
        >
          {busy ? "Running…" : "Run prediction"}
        </button>
      )}
    </section>
  );
}
