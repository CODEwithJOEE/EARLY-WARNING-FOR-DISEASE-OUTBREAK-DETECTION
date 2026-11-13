// Talks to the GitHub API to start and watch the "Run prediction pipeline" workflow.
// Server-only: the token must never reach the browser.
//
// Environment variables (set in Vercel, never in the repo):
//   GH_DISPATCH_TOKEN  fine-grained token, this repository only, permission "Actions: Read and write"
//   GITHUB_REPO        "owner/repository"
//   GITHUB_BRANCH      optional, defaults to "master"

const API = process.env.GITHUB_API_URL ?? "https://api.github.com";
const WORKFLOW = "run-pipeline.yml";

function config() {
  const token = process.env.GH_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return null;
  return { token, repo, ref: process.env.GITHUB_BRANCH || "master" };
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "rhu-early-warning",
  };
}

function explain(status: number): string {
  switch (status) {
    case 401:
      return "GitHub rejected the token. It may be wrong or expired.";
    case 403:
      return "The token does not have permission. It needs “Actions: Read and write” on this repository.";
    case 404:
      return "Repository or workflow not found. Check GITHUB_REPO and that the token can access the repository.";
    case 422:
      return "GitHub could not start the workflow. Check GITHUB_BRANCH and that the workflow allows manual runs.";
    default:
      return `GitHub returned an error (${status}).`;
  }
}

export type RunInfo = {
  status: string; // queued | in_progress | completed | ...
  conclusion: string | null; // success | failure | cancelled | ...
  createdAt: string;
  updatedAt: string;
  url: string;
};

export type PipelineStatus =
  | { configured: false }
  | { configured: true; run: RunInfo | null; error?: string };

export async function latestRun(): Promise<PipelineStatus> {
  const c = config();
  if (!c) return { configured: false };
  try {
    const res = await fetch(`${API}/repos/${c.repo}/actions/workflows/${WORKFLOW}/runs?per_page=1`, {
      headers: headers(c.token),
      cache: "no-store",
    });
    if (!res.ok) return { configured: true, run: null, error: explain(res.status) };
    const data = (await res.json()) as {
      workflow_runs?: { status: string; conclusion: string | null; created_at: string; updated_at: string; html_url: string }[];
    };
    const r = data.workflow_runs?.[0];
    return {
      configured: true,
      run: r ? { status: r.status, conclusion: r.conclusion, createdAt: r.created_at, updatedAt: r.updated_at, url: r.html_url } : null,
    };
  } catch {
    return { configured: true, run: null, error: "Could not reach GitHub." };
  }
}

export async function dispatchPipeline(): Promise<{ ok: true } | { ok: false; error: string }> {
  const c = config();
  if (!c) return { ok: false, error: "Not set up. Add GH_DISPATCH_TOKEN and GITHUB_REPO in the hosting settings." };
  try {
    const res = await fetch(`${API}/repos/${c.repo}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: "POST",
      headers: { ...headers(c.token), "Content-Type": "application/json" },
      body: JSON.stringify({ ref: c.ref }),
      cache: "no-store",
    });
    if (res.status === 204) return { ok: true };
    return { ok: false, error: explain(res.status) };
  } catch {
    return { ok: false, error: "Could not reach GitHub." };
  }
}
