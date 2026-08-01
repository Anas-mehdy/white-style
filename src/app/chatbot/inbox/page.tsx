import { Shell } from "@/components/dashboard";
import { ChatbotInboxClient } from "@/components/chatbot/inbox";
import { getInboxConversations } from "@/lib/chatbot-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { conversations, handoffs } = await getInboxConversations();

  return (
    <Shell>
      <ChatbotInboxClient
        initialConversations={conversations}
        initialHandoffs={handoffs}
      />
    </Shell>
  );
}
