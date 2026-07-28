import { Shell } from "@/components/dashboard";
import { ImageAgentPage } from "@/components/image-agent/image-agent-page";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Shell>
      <ImageAgentPage />
    </Shell>
  );
}
