import "server-only";
import { createClient } from "@/lib/supabase/server";

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
  data: any;
};

const memoryCache = new Map<string, CacheEntry>();

const getCacheKey = (days: number, since: string, until: string, accountIds: string[]) => {
  const sortedIds = [...accountIds].sort().join(",");
  return `${days}:${since}:${until}:${sortedIds}`;
};

const getSystemDateRange = (daysCount: number) => {
  const untilDate = new Date();
  // Align date using the timezone offset of the local system (which is July 12, 2026)
  const offset = untilDate.getTimezoneOffset();
  const localDate = new Date(untilDate.getTime() - (offset * 60 * 1000));
  const until = localDate.toISOString().split("T")[0];
  
  const sinceDate = new Date(untilDate.getTime() - (daysCount - 1) * 24 * 60 * 60 * 1000);
  const sinceLocal = new Date(sinceDate.getTime() - (offset * 60 * 1000));
  const since = sinceLocal.toISOString().split("T")[0];
  
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

const getMessagingConversations = (actions: any[] | undefined): number => {
  if (!actions || !Array.isArray(actions)) return 0;
  
  const priority = [
    "onsite_conversion.messaging_conversation_started_7d",
    "messaging_conversation_started_7d",
    "onsite_conversion.total_messaging_connection"
  ];
  
  for (const type of priority) {
    const action = actions.find((a) => a.action_type === type);
    if (action) {
      return Math.trunc(Number(action.value ?? 0));
    }
  }
  
  return 0;
};

const fetchMetaInsightsForAccount = async (
  metaAccountId: string,
  since: string,
  until: string,
  token: string,
  version: string
): Promise<any[]> => {
  const rows: any[] = [];
  let nextPageUrl = `https://graph.facebook.com/${version}/${metaAccountId}/insights?level=account&time_increment=1&fields=spend,actions,date_start,date_stop&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}&access_token=${token}`;

  let pageCount = 0;
  const maxPages = 50;

  while (nextPageUrl && pageCount < maxPages) {
    const res = await fetch(nextPageUrl, { cache: "no-store" });
    if (!res.ok) {
      const errorBody = await res.text();
      const sanitizedError = errorBody.replace(token, "[REDACTED]");
      throw new Error(`Meta API Error (${res.status}): ${sanitizedError}`);
    }
    const data = await res.json();
    if (data.error) {
      const sanitizedError = JSON.stringify(data.error).replace(token, "[REDACTED]");
      throw new Error(`Meta API Error: ${sanitizedError}`);
    }
    if (Array.isArray(data.data)) {
      rows.push(...data.data);
    }
    nextPageUrl = data.paging?.next || null;
    pageCount++;
  }
  return rows;
};

export async function getDashboardData(days = 30) {
  const supabase = await createClient();
  const { since, until } = getSystemDateRange(days);

  // Fetch accounts and metadata first
  const [accountsResult, decisionsResult, runsResult, notificationsResult, configResult] = await Promise.all([
    supabase.from("meta_ad_accounts").select("id,name,meta_account_id,currency,timezone_name,connection_status,last_synced_at").order("name"),
    supabase.from("agent_decisions").select("id").gte("created_at", since),
    supabase.from("sync_runs").select("status,finished_at,started_at").order("started_at", { ascending: false }).limit(1),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    supabase.from("agent_configs").select("mode,kill_switch").order("updated_at", { ascending: false }).limit(1),
  ]);

  const error = [accountsResult, decisionsResult, runsResult, notificationsResult, configResult].find((r) => r.error)?.error;
  if (error) throw new Error(error.message);

  const connectedAccounts = (accountsResult.data ?? []).filter(
    (a) => a.connection_status === "connected"
  );
  const connectedIds = connectedAccounts.map((a) => a.id);

  // Check Memory Cache
  const cacheKey = getCacheKey(days, since, until, connectedIds);
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 60000) {
    console.info("[dashboard-data] Returning cached dashboard data");
    return cached.data;
  }

  const token = process.env.META_ACCESS_TOKEN;
  const version = process.env.META_GRAPH_API_VERSION || "v25.0";
  const isTokenValid = token && token.trim() !== "" && token !== "PASTE_NEW_TOKEN_MANUALLY";

  let dataSource: "meta_api" | "database" = "meta_api";
  let isFallback = false;
  let isPartial = false;
  const perAccountStatus: Record<string, { status: "success" | "error"; error?: string }> = {};

  const allMetaRows: any[] = [];
  const accountTotals = new Map<string, { spend: number; conversations: number }>();

  if (!isTokenValid) {
    dataSource = "database";
    isFallback = true;
    console.info("[dashboard-data] No valid Meta access token. Falling back to database insights.");
  } else {
    for (const account of connectedAccounts) {
      try {
        console.info(`[dashboard-data] Fetching Meta insights for account ${account.name} (${account.meta_account_id})...`);
        const rows = await fetchMetaInsightsForAccount(
          account.meta_account_id,
          since,
          until,
          token,
          version
        );

        let accountSpendSum = 0;
        let accountConversationsSum = 0;

        for (const row of rows) {
          accountSpendSum += Number(row.spend ?? 0);
          accountConversationsSum += getMessagingConversations(row.actions);
        }

        console.info("[Meta Fetch Success]", {
          accountId: account.id,
          metaAccountId: account.meta_account_id,
          requestedRange: { since, until },
          rowsReturned: rows.length,
          firstDate: rows[0]?.date_start ?? "N/A",
          lastDate: rows[rows.length - 1]?.date_stop ?? "N/A",
          accountSpendTotal: accountSpendSum,
          accountConversationsTotal: accountConversationsSum
        });

        allMetaRows.push(...rows.map((r) => ({ ...r, ad_account_id: account.id })));
        accountTotals.set(account.id, { spend: accountSpendSum, conversations: accountConversationsSum });
        perAccountStatus[account.id] = { status: "success" };
      } catch (err: any) {
        console.error(`[dashboard-data] Failed to fetch Meta insights for account ${account.name}:`, err.message);
        perAccountStatus[account.id] = { status: "error", error: err.message };
        isPartial = true;
      }
    }

    const succeededCount = Object.values(perAccountStatus).filter(
      (s) => s.status === "success"
    ).length;

    if (succeededCount === 0) {
      dataSource = "database";
      isFallback = true;
      isPartial = false;
      console.warn("[dashboard-data] All Meta API fetches failed. Falling back to database insights.");
    } else if (succeededCount < connectedAccounts.length) {
      isPartial = true;
    }
  }

  if (isFallback) {
    allMetaRows.length = 0;
    accountTotals.clear();
    console.info(`[dashboard-data] Querying database insights for range: ${since} to ${until}`);

    let dbRows: any[] = [];
    let dbPage = 0;
    const dbPageSize = 1000;
    let hasMoreDb = true;

    while (hasMoreDb) {
      const rangeStart = dbPage * dbPageSize;
      const rangeEnd = rangeStart + dbPageSize - 1;
      const { data: pageData, error: dbError } = await supabase
        .from("ad_insights_daily")
        .select("ad_account_id,insight_date,spend,messaging_conversations")
        .gte("insight_date", since)
        .lte("insight_date", until)
        .range(rangeStart, rangeEnd);

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

    console.info(`[dashboard-data] Database returned ${dbRows.length} rows total.`);

    for (const row of dbRows) {
      const date = row.insight_date;
      const spend = Number(row.spend ?? 0);
      const conversations = Math.trunc(Number(row.messaging_conversations ?? 0));

      const accTotal = accountTotals.get(row.ad_account_id) ?? { spend: 0, conversations: 0 };
      accTotal.spend += spend;
      accTotal.conversations += conversations;
      accountTotals.set(row.ad_account_id, accTotal);

      allMetaRows.push({
        ad_account_id: row.ad_account_id,
        date_start: date,
        spend,
        actions: [{ action_type: "messaging_conversation_started_7d", value: conversations }]
      });
    }
  }

  const calendarDates = generateDateRange(since, until);
  const dailyMap = new Map<string, { spend: number; conversations: number }>();
  for (const date of calendarDates) {
    dailyMap.set(date, { spend: 0, conversations: 0 });
  }

  for (const row of allMetaRows) {
    const date = row.date_start;
    const spend = Number(row.spend ?? 0);
    const conversations = dataSource === "meta_api"
      ? getMessagingConversations(row.actions)
      : Math.trunc(Number(row.actions?.[0]?.value ?? 0));

    if (dailyMap.has(date)) {
      const current = dailyMap.get(date)!;
      current.spend += spend;
      current.conversations += conversations;
    }
  }

  const daily: ChartPoint[] = calendarDates.map((date) => {
    const val = dailyMap.get(date)!;
    return {
      date,
      spend: val.spend,
      conversations: val.conversations,
      hasRealData: val.spend > 0 || val.conversations > 0
    };
  });

  const spend = daily.reduce((sum, d) => sum + d.spend, 0);
  const conversations = daily.reduce((sum, d) => sum + d.conversations, 0);
  const cost = conversations ? spend / conversations : null;

  console.info("[Meta Aggregation Complete]", {
    range: { since, until, days },
    dataSource,
    isFallback,
    isPartial,
    combinedSpendTotal: spend,
    combinedConversationsTotal: conversations
  });

  const accounts: AccountRow[] = (accountsResult.data ?? []).map((a) => {
    const accTotal = accountTotals.get(a.id) ?? { spend: 0, conversations: 0 };
    return {
      ...a,
      spend: accTotal.spend,
      conversations: accTotal.conversations
    };
  });

  const debugCounts = {
    accountsCount: accountsResult.data?.length ?? 0,
    insightsCount: allMetaRows.length,
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
      spend,
      conversations,
      cost,
      monitoredSpend: spend,
      connected: accounts.filter((a) => a.connection_status === "connected").length,
      decisions: decisionsResult.data?.length ?? 0,
      alerts: notificationsResult.count ?? 0,
      lastSync: runsResult.data?.[0] ?? null,
      config: configResult.data?.[0] ?? null
    },
    range: { since, until, days },
    daily,
    dataSource,
    isFallback,
    isPartial,
    perAccountStatus,
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
    supabase.from("agent_decisions").select("id,decision,reason,confidence,created_at,ad_account_id,meta_ad_accounts(name,currency),meta_ads(name),meta_ad_sets(name,daily_budget),meta_campaigns(name,daily_budget),proposed_change,input_snapshot,agent_actions(id,status,executed_at,error_message,verified_state,created_at,before_state,requested_state,meta_entity_type,meta_entity_id,idempotency_key,error_code)").order("created_at", { ascending: false }),
    supabase.from("agent_actions").select("id,status,action_type,meta_entity_type,meta_entity_id,executed_at,created_at,error_message,before_state,requested_state,verified_state,idempotency_key,error_code,agent_decisions(id,decision,reason,confidence,created_at,meta_campaigns(name),meta_ad_sets(name),meta_ads(name),meta_ad_accounts(name,currency))").order("created_at", { ascending: false }),
    supabase.from("sync_runs").select("id,source,status,started_at,finished_at,records_processed,error_summary,cursor_state,meta_ad_accounts(name)").order("started_at", { ascending: false }),
    supabase.from("agent_configs").select("id,mode,kill_switch,max_budget_change_percent,daily_total_increase_percent,cooldown_hours,stale_data_minutes,no_result_pause_multiple,poor_cost_multiple,scale_cost_multiple,minimum_results_to_scale,meta_ad_accounts(name)").order("updated_at", { ascending: false }),
  ]);
  const error = [decisions, actions, runs, configs].find((r) => r.error)?.error;
  if (error) throw new Error(error.message);
  return { accounts: accounts.accounts, decisions: decisions.data ?? [], actions: actions.data ?? [], runs: runs.data ?? [], configs: configs.data ?? [] };
}
