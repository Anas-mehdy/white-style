"use client";

import { useState } from "react";

interface Account {
  id: string;
  name: string;
  meta_account_id: string;
}

interface RequestFormProps {
  accounts: Account[];
  onSubmit: (data: {
    target_ad_account_id: string;
    source_post_url: string;
    destination_type: 'whatsapp' | 'messenger' | 'website';
    requested_daily_budget: number | null;
    execution_mode: 'dry_run' | 'live';
    placements: 'advantage_plus' | 'facebook_only' | 'instagram_only';
  }) => void;
  isLoading: boolean;
}

export function RequestForm({ accounts, onSubmit, isLoading }: RequestFormProps) {
  const [adAccountId, setAdAccountId] = useState(accounts[0]?.id || "");
  const [postUrl, setPostUrl] = useState("");
  const [destination, setDestination] = useState<'whatsapp' | 'messenger' | 'website'>("whatsapp");
  const [budgetType, setBudgetType] = useState<"none" | "custom">("none");
  const [customBudget, setCustomBudget] = useState<number>(15);
  const [placements, setPlacements] = useState<'advantage_plus' | 'facebook_only' | 'instagram_only'>("advantage_plus");
  const [executionMode, setExecutionMode] = useState<'dry_run' | 'live'>("dry_run");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postUrl.trim()) return;

    onSubmit({
      target_ad_account_id: adAccountId,
      source_post_url: postUrl.trim(),
      destination_type: destination,
      requested_daily_budget: budgetType === "custom" ? customBudget : null,
      execution_mode: executionMode,
      placements: placements,
    });
  };

  return (
    <article className="panel">
      <div className="panel-heading" style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "600" }}>إنشاء حملة جديدة</h2>
      </div>
      <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "20px", lineHeight: "1.6" }}>
        ألصق رابط منشور Facebook أو Instagram وسيقوم الذكاء الاصطناعي بتحليل المحتوى وإنشاء حملة احترافية.
      </p>

      <form onSubmit={handleSubmit} className="filters" style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "stretch", margin: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--foreground)" }}>Meta Ad Account</label>
            <select
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
              disabled={isLoading}
              style={{ width: "100%", height: "42px" }}
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--foreground)" }}>Destination</label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value as any)}
              disabled={isLoading}
              style={{ width: "100%", height: "42px" }}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="messenger">Messenger</option>
              <option value="website">Website</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--foreground)" }}>رابط منشور Facebook أو Instagram</label>
          <input
            type="url"
            required
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            placeholder="https://facebook.com/permalink.php?story_fbid=... أو https://instagram.com/p/..."
            disabled={isLoading}
            style={{ width: "100%", height: "42px" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--foreground)" }}>توزيع الإعلانات (Placements)</label>
            <select
              value={placements}
              onChange={(e) => setPlacements(e.target.value as any)}
              disabled={isLoading}
              style={{ width: "100%", height: "42px" }}
            >
              <option value="advantage_plus">Advantage+ automatic (تلقائي)</option>
              <option value="facebook_only">Facebook only (فيسبوك فقط)</option>
              <option value="instagram_only">Instagram only (إنستغرام فقط)</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--foreground)" }}>الميزانية اليومية المطلوبة (اختياري)</label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <select
                value={budgetType}
                onChange={(e) => setBudgetType(e.target.value as any)}
                disabled={isLoading}
                style={{ width: "110px", height: "42px" }}
              >
                <option value="none">تلقائي</option>
                <option value="custom">مخصصة</option>
              </select>
              {budgetType === "custom" && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                  <input
                    type="number"
                    min={5}
                    max={25}
                    required
                    value={customBudget}
                    onChange={(e) => setCustomBudget(Number(e.target.value))}
                    disabled={isLoading}
                    style={{ flex: 1, height: "42px", textAlign: "center" }}
                  />
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>$</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--foreground)" }}>وضع التنفيذ:</span>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12.5px", cursor: "pointer" }}>
              <input
                type="radio"
                name="execution_mode"
                checked={executionMode === "dry_run"}
                onChange={() => setExecutionMode("dry_run")}
                disabled={isLoading}
              />
              مسودة تجريبية (Dry Run)
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12.5px", cursor: "pointer", marginRight: "12px" }}>
              <input
                type="radio"
                name="execution_mode"
                checked={executionMode === "live"}
                onChange={() => setExecutionMode("live")}
                disabled={isLoading}
              />
              حقيقي (Live)
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || !postUrl.trim()}
            className="sync-button"
            style={{
              background: "var(--brand-gradient)",
              color: "white",
              padding: "10px 24px",
              fontSize: "14px",
              fontWeight: "600",
              border: 0,
              boxShadow: "0 4px 12px var(--brand-shadow)",
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? "wait" : "pointer"
            }}
          >
            {isLoading ? "جاري المعالجة..." : "تحليل المنشور وبناء الحملة"}
          </button>
        </div>
      </form>
    </article>
  );
}
