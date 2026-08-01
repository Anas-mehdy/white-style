import { Shell } from "@/components/dashboard";
import { ChatbotOrdersClient } from "@/components/chatbot/orders";
import { getOrdersList } from "@/lib/chatbot-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { orders, items } = await getOrdersList();

  return (
    <Shell>
      <ChatbotOrdersClient initialOrders={orders} initialItems={items} />
    </Shell>
  );
}
