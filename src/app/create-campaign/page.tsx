"use client";

import { Shell } from "@/components/dashboard";
import { CampaignCenter } from "@/components/campaign-center/campaign-center";
import { useEffect, useState } from "react";
import { fetchRequests } from "@/components/campaign-center/api";

export default function Page() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch connected Meta ad accounts
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.accounts) {
          // Normalize accounts
          const mapped = data.accounts.map((acc: any) => ({
            id: acc.id,
            name: acc.name,
            meta_account_id: acc.meta_account_id,
          }));
          setAccounts(mapped);
        }
      })
      .catch((err) => console.error("Error loading accounts:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Shell>
      {loading ? (
        <div style={{ display: "grid", placeItems: "center", minHeight: "400px" }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <CampaignCenter accounts={accounts} />
      )}
    </Shell>
  );
}
