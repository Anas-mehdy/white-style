import { DashboardClient, Shell } from "@/components/dashboard"; import { getDashboardData } from "@/lib/dashboard-data";
export const dynamic="force-dynamic"; export default async function Page(){return <Shell><DashboardClient initial={await getDashboardData()}/></Shell>}
