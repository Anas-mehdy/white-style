import { Shell } from "@/components/dashboard";
import { ChatbotOffersClient } from "@/components/chatbot/offers";
import { getOffersAndShippingData } from "@/lib/chatbot-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { discountRules, shippingZones, shippingAliases } = await getOffersAndShippingData();

  return (
    <Shell>
      <ChatbotOffersClient
        initialRules={discountRules}
        initialZones={shippingZones}
        initialAliases={shippingAliases}
      />
    </Shell>
  );
}
