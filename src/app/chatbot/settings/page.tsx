import { Shell } from "@/components/dashboard";
import { ChatbotSettingsClient } from "@/components/chatbot/settings";
import { getSettingsAndHealthData } from "@/lib/chatbot-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { channel, healthCards } = await getSettingsAndHealthData();

  return (
    <Shell>
      <ChatbotSettingsClient initialChannel={channel} healthCards={healthCards} />
    </Shell>
  );
}
