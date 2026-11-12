export const DISEASES = ["cough", "fever", "diarrhea"] as const;
export type Disease = (typeof DISEASES)[number];
export type RiskLevel = "low" | "moderate" | "high";
export type Role = "admin" | "health_officer" | "viewer";

export const DISEASE_LABEL: Record<Disease, string> = {
  cough: "Cough",
  fever: "Fever",
  diarrhea: "Diarrhea",
};

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type CaseRow = { id: string; year: number; month: number; cough: number; fever: number; diarrhea: number };
export type WeatherRow = { year: number; month: number; rainfall_mm: number; temperature_c: number; humidity_pct: number };
export type Factor = { feature: string; importance: number };
export type Prediction = {
  year: number;
  month: number;
  disease: Disease;
  risk_score: number;
  risk_level: RiskLevel;
  stat_threshold: number | null;
  stat_exceeded: boolean | null;
  top_factors: Factor[] | null;
  created_at: string;
};
export type AlertRow = {
  id: string;
  year: number;
  month: number;
  disease: Disease;
  level: RiskLevel;
  message: string | null;
  status: "open" | "acknowledged" | "resolved";
  created_at: string;
};
export type ModelMetric = {
  disease: Disease;
  model_name: string;
  accuracy: number | null;
  precision_score: number | null;
  recall: number | null;
  f1: number | null;
  confusion_matrix: { tn: number; fp: number; fn: number; tp: number } | null;
  n_train: number | null;
  n_test: number | null;
  trained_at: string;
};

export const monthLabel = (year: number, month: number) => `${MONTHS[month - 1]} ${year}`;
