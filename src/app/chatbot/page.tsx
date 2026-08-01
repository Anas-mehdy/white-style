import { Shell } from "@/components/dashboard";
import { ChatbotOverviewClient } from "@/components/chatbot/overview";
import { getChatbotOverviewData } from "@/lib/chatbot-data";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; adAccountId?: string }>;
}) {
  const params = await searchParams;
  const days = Number(params.days) || 30;
  const adAccountId = params.adAccountId || undefined;

  const { kpis, dailyTrends } = await getChatbotOverviewData(days, adAccountId);

  return (
    <Shell>
      <ChatbotOverviewClient
        initialKpis={kpis}
        initialTrends={dailyTrends}
        initialDays={days}
      />
    </Shell>
  );
}
