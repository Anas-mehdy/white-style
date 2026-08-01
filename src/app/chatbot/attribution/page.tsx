import { Shell } from "@/components/dashboard";
import { ChatbotAttributionClient } from "@/components/chatbot/attribution";
import { getAttributionAndProfitabilityData } from "@/lib/chatbot-data";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const params = await searchParams;
  const days = Number(params.days) || 30;

  const { adMappings, unmappedAdsCount, profitability } = await getAttributionAndProfitabilityData(days);

  return (
    <Shell>
      <ChatbotAttributionClient
        initialMappings={adMappings}
        unmappedAdsCount={unmappedAdsCount}
        initialProfitability={profitability}
      />
    </Shell>
  );
}
