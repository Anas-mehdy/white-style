export type AgentMode = "observe" | "autopilot" | "paused";

export type ActionStatus = "executed" | "watching" | "protected";

export interface Metric {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  helper: string;
}

export interface AdAccount {
  id: string;
  name: string;
  spend: number;
  conversations: number;
  cpr: number;
  frequency: number | null;
  efficiency: number;
  status: "healthy" | "attention" | "critical";
}

export interface AgentAction {
  id: string;
  title: string;
  detail: string;
  account: string;
  amount: string;
  timestamp: string;
  status: ActionStatus;
  confidence: number;
}

export interface DashboardData {
  metrics: Metric[];
  accounts: AdAccount[];
  actions: AgentAction[];
  spendSeries: number[];
  conversationSeries: number[];
}

export interface DashboardApiResponse {
  accounts: {
    id: string;
    name: string;
    meta_account_id: string;
    currency: string;
    timezone_name: string;
    connection_status: string;
    last_synced_at: string | null;
    spend: number;
    conversations: number;
  }[];
  chart: {
    date: string;
    spend: number;
    conversations: number;
    impressions?: number;
    hasRealData?: boolean;
  }[];
  stats: {
    spend: number;
    conversations: number;
    cost: number | null;
    monitoredSpend: number;
    connected: number;
    decisions: number;
    alerts: number;
    lastSync: unknown;
    config: unknown;
  };
  syncStatus: {
    status: "fresh" | "stale" | "partial" | "failed" | "never_synced";
    lastSyncedAt: string | null;
    connectedAccounts: number;
    successfulAccounts: number;
    failedAccounts: number;
    message: string;
    limitations?: string;
  };
  range: {
    since: string;
    until: string;
    days: number;
  };
  daily: {
    date: string;
    spend: number;
    conversations: number;
    impressions?: number;
    hasRealData?: boolean;
  }[];
  dataSource: "database";
  isFallback: boolean;
  isPartial: boolean;
  perAccountStatus: Record<string, unknown>;
  debugCounts?: Record<string, number>;
  debugErrors?: Record<string, unknown>;
}

export function isDashboardApiResponse(value: unknown): value is DashboardApiResponse {
  if (typeof value !== "object" || value === null) return false;
  const val = value as Record<string, unknown>;
  
  if (!Array.isArray(val.accounts) || !Array.isArray(val.chart) || !Array.isArray(val.daily)) {
    return false;
  }
  
  if (typeof val.stats !== "object" || val.stats === null) return false;
  if (typeof val.syncStatus !== "object" || val.syncStatus === null) return false;
  if (typeof val.range !== "object" || val.range === null) return false;
  
  return true;
}
