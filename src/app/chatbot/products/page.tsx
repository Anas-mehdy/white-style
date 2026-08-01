import { Shell } from "@/components/dashboard";
import { ChatbotProductsClient } from "@/components/chatbot/products";
import { getProductsList } from "@/lib/chatbot-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { products, variants, media } = await getProductsList();

  return (
    <Shell>
      <ChatbotProductsClient
        initialProducts={products}
        initialVariants={variants}
        initialMedia={media}
      />
    </Shell>
  );
}
