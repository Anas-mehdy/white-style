/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

export const getMessagingConversations = (actions: any[] | undefined): number => {
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

export const fetchMetaInsightsForAccount = async (
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
