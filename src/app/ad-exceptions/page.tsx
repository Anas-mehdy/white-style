import { Shell } from "@/components/dashboard";
import { AdExceptionsPage } from "@/components/ad-exceptions/AdExceptionsPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Shell>
      <AdExceptionsPage />
    </Shell>
  );
}
