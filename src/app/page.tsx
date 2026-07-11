import { Dashboard } from "@/components/dashboard";
import { dashboardData } from "@/lib/mock-data";

export default function Home() {
  return <Dashboard initialData={dashboardData} />;
}
