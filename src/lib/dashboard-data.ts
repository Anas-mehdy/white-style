import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AccountRow = { id: string; name: string; meta_account_id: string; currency: string; timezone_name: string; connection_status: string; last_synced_at: string | null; spend: number; conversations: number };
export type ChartPoint = { date: string; spend: number; conversations: number; impressions?: number; hasRealData?: boolean };

const number = (value: unknown) => Number(value ?? 0);
const since = (days: number) => new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);

export async function getDashboardData(days = 30) {
  const supabase = await createClient();
  const from = since(days);
  const [accountsResult, insightsResult, decisionsResult, runsResult, notificationsResult, configResult] = await Promise.all([
    supabase.from("meta_ad_accounts").select("id,name,meta_account_id,currency,timezone_name,connection_status,last_synced_at").order("name"),
    supabase.from("ad_insights_daily").select("ad_account_id,organization_id,insight_date,spend,messaging_conversations,cost_per_conversation,impressions").gte("insight_date", from).order("insight_date"),
    supabase.from("agent_decisions").select("id").gte("created_at", from),
    supabase.from("sync_runs").select("status,finished_at,started_at").order("started_at", { ascending: false }).limit(1),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    supabase.from("agent_configs").select("mode,kill_switch").order("updated_at", { ascending: false }).limit(1),
  ]);
  const error = [accountsResult, insightsResult, decisionsResult, runsResult, notificationsResult, configResult].find((r) => r.error)?.error;
  if (error) throw new Error(error.message);
  const totals = new Map<string, { spend: number; conversations: number }>();
  const chart = new Map<string, ChartPoint>();
  for (const row of insightsResult.data ?? []) {
    const current = totals.get(row.ad_account_id) ?? { spend: 0, conversations: 0 };
    current.spend += number(row.spend); current.conversations += number(row.messaging_conversations); totals.set(row.ad_account_id, current);
    const point = chart.get(row.insight_date) ?? { date: row.insight_date, spend: 0, conversations: 0, impressions: 0, hasRealData: false };
    point.spend += number(row.spend); point.conversations += number(row.messaging_conversations);
    if (point.impressions !== undefined) {
      point.impressions += number(row.impressions);
    }
    if (number(row.spend) > 0 || number(row.impressions) > 0 || number(row.messaging_conversations) > 0) {
      point.hasRealData = true;
    }
    chart.set(row.insight_date, point);
  }
  const accounts: AccountRow[] = (accountsResult.data ?? []).map((a) => ({ ...a, ...(totals.get(a.id) ?? { spend: 0, conversations: 0 }) }));
  const spend = accounts.reduce((sum, a) => sum + a.spend, 0);
  const conversations = accounts.reduce((sum, a) => sum + a.conversations, 0);
  const debugCounts = { accountsCount: accountsResult.data?.length ?? 0, insightsCount: insightsResult.data?.length ?? 0, syncRunsCount: runsResult.data?.length ?? 0, decisionsCount: decisionsResult.data?.length ?? 0, notificationsCount: notificationsResult.count ?? 0, configsCount: configResult.data?.length ?? 0 };
  const debugErrors = { meta_ad_accounts: accountsResult.error ? { code: accountsResult.error.code, message: accountsResult.error.message } : null, ad_insights_daily: insightsResult.error ? { code: insightsResult.error.code, message: insightsResult.error.message } : null, sync_runs: runsResult.error ? { code: runsResult.error.code, message: runsResult.error.message } : null, agent_decisions: decisionsResult.error ? { code: decisionsResult.error.code, message: decisionsResult.error.message } : null, notifications: notificationsResult.error ? { code: notificationsResult.error.code, message: notificationsResult.error.message } : null, agent_configs: configResult.error ? { code: configResult.error.code, message: configResult.error.message } : null };
  return { accounts, chart: [...chart.values()], stats: { spend, conversations, cost: conversations ? spend / conversations : null, monitoredSpend: spend, connected: accounts.filter((a) => a.connection_status === "connected").length, decisions: decisionsResult.data?.length ?? 0, alerts: notificationsResult.count ?? 0, lastSync: runsResult.data?.[0] ?? null, config: configResult.data?.[0] ?? null }, debugCounts, debugErrors };
}

export async function getPageData() {
  const supabase = await createClient();
  const [accounts, decisions, actions, runs, configs] = await Promise.all([
    getDashboardData(30),
    supabase.from("agent_decisions").select("id,decision,reason,confidence,created_at,ad_account_id,meta_ad_accounts(name),agent_actions(status,executed_at,error_message,verified_state)").order("created_at", { ascending: false }),
    supabase.from("agent_actions").select("id,status,action_type,meta_entity_type,meta_entity_id,executed_at,created_at,error_message,agent_decisions(reason),meta_ad_accounts:agent_decisions(meta_ad_accounts(name))").order("created_at", { ascending: false }),
    supabase.from("sync_runs").select("id,source,status,started_at,finished_at,records_processed,error_summary,cursor_state,meta_ad_accounts(name)").order("started_at", { ascending: false }),
    supabase.from("agent_configs").select("id,mode,kill_switch,max_budget_change_percent,daily_total_increase_percent,cooldown_hours,stale_data_minutes,no_result_pause_multiple,poor_cost_multiple,scale_cost_multiple,minimum_results_to_scale,meta_ad_accounts(name)").order("updated_at", { ascending: false }),
  ]);
  const error = [decisions, actions, runs, configs].find((r) => r.error)?.error;
  if (error) throw new Error(error.message);
  return { accounts: accounts.accounts, decisions: decisions.data ?? [], actions: actions.data ?? [], runs: runs.data ?? [], configs: configs.data ?? [] };
}
