import { notFound } from "next/navigation";
import { Shell } from "@/components/dashboard";
import { ChatbotOrderDetailClient } from "@/components/chatbot/order-detail";
import { getOrderDetail } from "@/lib/chatbot-data";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const orderData = await getOrderDetail(resolvedParams.id);

  if (!orderData) {
    notFound();
  }

  return (
    <Shell>
      <ChatbotOrderDetailClient initialData={orderData} />
    </Shell>
  );
}
