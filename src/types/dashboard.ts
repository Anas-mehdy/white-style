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
