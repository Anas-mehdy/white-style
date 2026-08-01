import { notFound } from "next/navigation";
import { Shell } from "@/components/dashboard";
import { ChatbotProductDetailClient } from "@/components/chatbot/product-detail";
import { getProductDetail } from "@/lib/chatbot-data";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const productData = await getProductDetail(resolvedParams.id);

  if (!productData) {
    notFound();
  }

  return (
    <Shell>
      <ChatbotProductDetailClient initialData={productData} />
    </Shell>
  );
}
