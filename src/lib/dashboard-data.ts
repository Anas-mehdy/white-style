import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DashboardApiResponse } from "@/types/dashboard";

export type AccountRow = {
  id: string;
  name: string;
  meta_account_id: string;
  currency: string;
  timezone_name: string;
  connection_status: string;
  last_synced_at: string | null;
  spend: number;
  conversations: number;
};

export type ChartPoint = {
  date: string;
  spend: number;
  conversations: number;
  impressions?: number;
  hasRealData?: boolean;
};

type CacheEntry = {
  timestamp: number;
  data: unknown;
};

const memoryCache = new Map<string, CacheEntry>();

const getCacheKey = (days: number, since: string, until: string, accountIds: string[]) => {
  const sortedIds = [...accountIds].sort().join(",");
  return `${days}:${since}:${until}:${sortedIds}`;
};

const getSystemDateRange = (daysCount: number) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hebron",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  
  // Get Hebron local today date string
  const todayStr = formatter.format(new Date()); // YYYY-MM-DD
  const until = todayStr;

  // Subtract (daysCount - 1) days to get start date in Hebron local timezone
  const untilDate = new Date(`${until}T12:00:00`);
  const sinceDate = new Date(untilDate.getTime() - (daysCount - 1) * 24 * 60 * 60 * 1000);
  const since = formatter.format(sinceDate); // YYYY-MM-DD

  return { since, until };
};

const generateDateRange = (since: string, until: string): string[] => {
  const dates: string[] = [];
  const curr = new Date(since);
  const end = new Date(until);
  curr.setHours(12, 0, 0, 0);
  end.setHours(12, 0, 0, 0);
  
  while (curr <= end) {
    dates.push(curr.toISOString().split("T")[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

interface DbInsightRow {
  ad_account_id: string;
  insight_date: string;
  spend: number | null;
  messaging_conversations: number | null;
}

export async function getDashboardData(days = 30, bypassCache = false): Promise<DashboardApiResponse> {
  const supabase = await createClient();
  const { since, until } = getSystemDateRange(days);

  // Fetch accounts, decisions, sync runs, notifications, config in parallel from Supabase
  const [accountsResult, decisionsResult, runsResult, notificationsResult, configResult] = await Promise.all([
    supabase.from("meta_ad_accounts").select("id,name,meta_account_id,currency,timezone_name,connection_status,last_synced_at").order("name"),
    supabase.from("agent_decisions_final_status").select("id").gte("created_at", since),
    supabase.from("sync_runs").select("status,started_at,finished_at,error_summary,cursor_state").eq("source", "meta_api").order("started_at", { ascending: false }),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    supabase.from("agent_configs").select("mode,kill_switch").order("updated_at", { ascending: false }).limit(1),
  ]);

  const error = [accountsResult, decisionsResult, runsResult, notificationsResult, configResult].find((r) => r.error)?.error;
  if (error) throw new Error(error.message);

  const allAccounts = accountsResult.data ?? [];
  const connectedAccounts = allAccounts.filter((a) => a.connection_status === "connected");
  const connectedIds = connectedAccounts.map((a) => a.id);

  // Check Memory Cache unless bypassed
  const cacheKey = getCacheKey(days, since, until, connectedIds);
  if (!bypassCache) {
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) {
      console.info("[dashboard-data] Returning cached dashboard data");
      return cached.data as DashboardApiResponse;
    }
  }

  // Fetch daily insights using paginated range queries to prevent row truncation
  console.info(`[dashboard-data] Querying database insights for range: ${since} to ${until} for connected accounts only.`);
  
  const dbRows: DbInsightRow[] = [];
  
  if (connectedIds.length > 0) {
    let dbPage = 0;
    const dbPageSize = 1000;
    let hasMoreDb = true;

    while (hasMoreDb) {
      const rangeStart = dbPage * dbPageSize;
      const rangeEnd = rangeStart + dbPageSize - 1;
      const { data: pageData, error: dbError } = (await supabase
        .from("ad_insights_daily")
        .select("ad_account_id,insight_date,spend,messaging_conversations")
        .in("ad_account_id", connectedIds)
        .gte("insight_date", since)
        .lte("insight_date", until)
        .range(rangeStart, rangeEnd)) as { data: DbInsightRow[] | null; error: { message: string } | null };

      if (dbError) {
        throw new Error(`Database query error: ${dbError.message}`);
      }
      if (!pageData || pageData.length === 0) {
        hasMoreDb = false;
      } else {
        dbRows.push(...pageData);
        if (pageData.length < dbPageSize) {
          hasMoreDb = false;
        } else {
          dbPage++;
        }
      }
    }
  }

  console.info(`[dashboard-data] Database returned ${dbRows.length} rows total.`);

  // Initialize totals map per account
  const accountTotals = new Map<string, { spend: number; conversations: number }>();
  for (const account of allAccounts) {
    accountTotals.set(account.id, { spend: 0, conversations: 0 });
  }

  const calendarDates = generateDateRange(since, until);
  const dailyMap = new Map<string, { spend: number; conversations: number }>();
  for (const date of calendarDates) {
    dailyMap.set(date, { spend: 0, conversations: 0 });
  }

  // Aggregate insights
  for (const row of dbRows) {
    const date = row.insight_date;
    const spend = Number(row.spend ?? 0);
    const conversations = Math.trunc(Number(row.messaging_conversations ?? 0));

    // Update account totals
    const accTotal = accountTotals.get(row.ad_account_id) ?? { spend: 0, conversations: 0 };
    accTotal.spend += spend;
    accTotal.conversations += conversations;
    accountTotals.set(row.ad_account_id, accTotal);

    // Update daily map
    if (dailyMap.has(date)) {
      const current = dailyMap.get(date)!;
      current.spend += spend;
      current.conversations += conversations;
    }
  }

  // Generate chart data
  const daily: ChartPoint[] = calendarDates.map((date) => {
    const val = dailyMap.get(date)!;
    return {
      date,
      spend: val.spend,
      conversations: val.conversations,
      hasRealData: val.spend > 0 || val.conversations > 0
    };
  });

  const totalSpend = daily.reduce((sum, d) => sum + d.spend, 0);
  const totalConversations = daily.reduce((sum, d) => sum + d.conversations, 0);
  const costPerConversation = totalConversations ? totalSpend / totalConversations : null;

  // Determine sync status safely from stored database sync runs
  const totalConnected = connectedAccounts.length;
  let syncStatus: "fresh" | "stale" | "partial" | "failed" | "never_synced" = "never_synced";
  let lastSyncedAt: string | null = null;
  let successfulAccounts = 0;
  let failedAccounts = 0;
  let syncMessage = "";

  const latestFinishedRun = (runsResult.data ?? []).find(r => 
    ["succeeded", "failed", "partial"].includes(r.status)
  );

  if (totalConnected === 0) {
    syncStatus = "never_synced";
    syncMessage = "لم تتم مزامنة بيانات الحسابات بعد";
  } else {
    // Determine lastSyncedAt based on connected accounts last_synced_at timestamps
    const syncDates = connectedAccounts
      .map(a => a.last_synced_at ? new Date(a.last_synced_at).getTime() : 0)
      .filter(t => t > 0);
    
    const latestAccountSync = syncDates.length > 0 ? Math.max(...syncDates) : 0;

    if (latestAccountSync > 0) {
      lastSyncedAt = new Date(latestAccountSync).toISOString();
      const ageHours = (Date.now() - latestAccountSync) / (3600 * 1000);

      if (ageHours > 2) {
        syncStatus = "stale";
        syncMessage = "البيانات لم تُحدّث منذ أكثر من ساعتين";
      } else {
        // Look at the latest finished sync run to check for partial failures
        if (latestFinishedRun && latestFinishedRun.status === "partial") {
          syncStatus = "partial";
          
          // Count based on the last run cursor state or default to safe estimation
          const cursor = latestFinishedRun.cursor_state as Record<string, unknown> | null;
          if (cursor && typeof cursor === "object" && typeof cursor.succeeded_accounts === "number") {
            successfulAccounts = cursor.succeeded_accounts;
            failedAccounts = Math.max(0, totalConnected - successfulAccounts);
          } else {
            successfulAccounts = connectedAccounts.filter(a => a.last_synced_at && (Date.now() - new Date(a.last_synced_at).getTime()) < 2 * 3600 * 1000).length;
            failedAccounts = Math.max(0, totalConnected - successfulAccounts);
          }
          syncMessage = `تم تحديث ${successfulAccounts} حسابات من أصل ${totalConnected} — تعذر تحديث ${failedAccounts} حسابات`;
        } else if (latestFinishedRun && latestFinishedRun.status === "failed") {
          syncStatus = "failed";
          syncMessage = "تعذر تحديث الحسابات — يتم عرض آخر بيانات محفوظة";
        } else {
          syncStatus = "fresh";
          const minutes = Math.floor((Date.now() - latestAccountSync) / 60000);
          if (minutes <= 1) {
            syncMessage = "آخر تحديث: منذ أقل من دقيقة";
          } else if (minutes === 2) {
            syncMessage = "آخر تحديث: منذ دقيقتين";
          } else if (minutes >= 3 && minutes <= 10) {
            syncMessage = `آخر تحديث: منذ ${minutes} دقائق`;
          } else {
            syncMessage = `آخر تحديث: منذ ${minutes} دقيقة`;
          }
        }
      }
    } else {
      if (latestFinishedRun && latestFinishedRun.status === "failed") {
        syncStatus = "failed";
        syncMessage = "تعذر تحديث الحسابات — يتم عرض آخر بيانات محفوظة";
      } else {
        syncStatus = "never_synced";
        syncMessage = "لم تتم مزامنة بيانات الحسابات بعد";
      }
    }
  }

  const accounts: AccountRow[] = allAccounts.map((a) => {
    const accTotal = accountTotals.get(a.id) ?? { spend: 0, conversations: 0 };
    return {
      ...a,
      spend: accTotal.spend,
      conversations: accTotal.conversations
    };
  });

  const debugCounts = {
    accountsCount: allAccounts.length,
    insightsCount: dbRows.length,
    syncRunsCount: runsResult.data?.length ?? 0,
    decisionsCount: decisionsResult.data?.length ?? 0,
    notificationsCount: notificationsResult.count ?? 0,
    configsCount: configResult.data?.length ?? 0
  };

  const debugErrors = {
    meta_ad_accounts: accountsResult.error ? { code: accountsResult.error.code, message: accountsResult.error.message } : null,
    sync_runs: runsResult.error ? { code: runsResult.error.code, message: runsResult.error.message } : null,
    agent_decisions: decisionsResult.error ? { code: decisionsResult.error.code, message: decisionsResult.error.message } : null,
    notifications: notificationsResult.error ? { code: notificationsResult.error.code, message: notificationsResult.error.message } : null,
    agent_configs: configResult.error ? { code: configResult.error.code, message: configResult.error.message } : null
  };

  const responsePayload = {
    accounts,
    chart: daily,
    stats: {
      spend: totalSpend,
      conversations: totalConversations,
      cost: costPerConversation,
      monitoredSpend: totalSpend,
      connected: totalConnected,
      decisions: decisionsResult.data?.length ?? 0,
      alerts: notificationsResult.count ?? 0,
      lastSync: runsResult.data?.[0] ?? null,
      config: configResult.data?.[0] ?? null
    },
    syncStatus: {
      status: syncStatus,
      lastSyncedAt,
      connectedAccounts: totalConnected,
      successfulAccounts,
      failedAccounts,
      message: syncMessage,
      limitations: "تعتمد دقة حالة المزامنة على أحدث سجلات المزامنة العامة وتواريخ آخر تحديث للحسابات النشطة المسجلة في جدول sync_runs لضمان الموثوقية."
    },
    range: { since, until, days },
    daily,
    dataSource: "database" as const,
    isFallback: false,
    isPartial: false,
    perAccountStatus: {},
    debugCounts,
    debugErrors
  };

  memoryCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });

  return responsePayload;
}

export async function getPageData() {
  const supabase = await createClient();
  const [accounts, decisions, actions, runs, configs] = await Promise.all([
    getDashboardData(30),
    supabase.from("agent_decisions_final_status").select("id,decision,reason,confidence,created_at,ad_account_id,proposed_change,input_snapshot,final_execution_status,final_status_at,latest_status,latest_error_code,latest_error_message,verified_action_at,failed_action_at,skipped_action_at,in_progress_action_at,ad_account_name,currency,meta_account_id,campaign_name,meta_campaign_id,ad_set_name,ad_set_daily_budget,meta_adset_id,ad_name,meta_ad_id").order("created_at", { ascending: false }),
    supabase.from("agent_actions").select("id,status,action_type,meta_entity_type,meta_entity_id,executed_at,created_at,error_message,before_state,requested_state,verified_state,idempotency_key,error_code,agent_decisions(id,decision,reason,confidence,created_at,meta_campaigns(name),meta_ad_sets(name),meta_ads(name),meta_ad_accounts(name,currency))").order("created_at", { ascending: false }),
    supabase.from("sync_runs").select("id,source,status,started_at,finished_at,records_processed,error_summary,cursor_state,meta_ad_accounts(name)").order("started_at", { ascending: false }),
    supabase.from("agent_configs").select("id,mode,kill_switch,max_budget_change_percent,daily_total_increase_percent,cooldown_hours,stale_data_minutes,no_result_pause_multiple,poor_cost_multiple,scale_cost_multiple,minimum_results_to_scale,meta_ad_accounts(name)").order("updated_at", { ascending: false }),
  ]);
  const error = [decisions, actions, runs, configs].find((r) => r.error)?.error;
  if (error) throw new Error(error.message);
  return { accounts: accounts.accounts, decisions: decisions.data ?? [], actions: actions.data ?? [], runs: runs.data ?? [], configs: configs.data ?? [] };
}
