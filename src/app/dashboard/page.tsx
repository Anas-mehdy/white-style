import { DashboardClient, Shell } from "@/components/dashboard";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; range?: string; adAccountId?: string }>;
}) {
  const params = await searchParams;
  const requestedDays = Number(params.days || params.range?.replace("d", ""));
  const days = [7, 14, 30].includes(requestedDays) ? requestedDays : 30;
  const adAccountId = params.adAccountId || null;

  let initialData;
  try {
    initialData = await getDashboardData(days, false, adAccountId);
  } catch {
    initialData = await getDashboardData(days, false, null);
  }

  return (
    <Shell>
      <DashboardClient
        initial={initialData}
        initialDays={days}
        initialAdAccountId={adAccountId}
      />
    </Shell>
  );
}

