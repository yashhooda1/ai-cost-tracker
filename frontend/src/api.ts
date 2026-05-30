import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export interface Company {
  id: number;
  name: string;
  api_key: string;
  budget_usd: number;
  created_at: string;
}

export interface UsageRecord {
  id: number;
  company: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  cache_hit: boolean;
  routed_from: string | null;
  savings_usd: number;
  latency_ms: number;
  timestamp: string;
}

export interface DashboardSummary {
  total_cost_usd: number;
  total_savings_usd: number;
  savings_pct: number;
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  cache_hit_rate_pct: number;
  routed_requests: number;
  cache_entries: number;
  total_cache_hits: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  trend: { date: string; cost: number; savings: number }[];
  by_model: { model: string; cost: number }[];
  by_provider: { provider: string; cost: number }[];
  savings_breakdown: { name: string; value: number }[];
  top_companies: { company: string; cost: number }[];
}

export interface Alert {
  id: number;
  company_id: number;
  threshold_usd: number;
  period: string;
  triggered: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface PricingRow {
  provider: string;
  model: string;
  input_per_1m: number;
  output_per_1m: number;
}

export const getCompanies = () => api.get<Company[]>("/companies").then(r => r.data);
export const createCompany = (name: string, budget_usd: number) =>
  api.post<Company>("/companies", { name, budget_usd }).then(r => r.data);
export const deleteCompany = (id: number) => api.delete(`/companies/${id}`);

export const getAlerts = (company_id?: number) =>
  api.get<Alert[]>("/alerts", { params: company_id ? { company_id } : {} }).then(r => r.data);
export const createAlert = (company_id: number, threshold_usd: number, period: string) =>
  api.post<Alert>("/alerts", { company_id, threshold_usd, period }).then(r => r.data);
export const deleteAlert = (id: number) => api.delete(`/alerts/${id}`);

export const getDashboard = (company_id?: number, days = 30) =>
  api.get<DashboardData>("/dashboard", { params: { company_id, days } }).then(r => r.data);

export const getUsage = (params: { company_id?: number; provider?: string; limit?: number; offset?: number }) =>
  api.get<{ total: number; records: UsageRecord[] }>("/usage", { params }).then(r => r.data);

export const getPricing = () => api.get<PricingRow[]>("/pricing").then(r => r.data);

export const clearCache = () => api.delete("/cache").then(r => r.data);
