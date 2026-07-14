"use client";

import { CampaignStrategy, CampaignCreationRequest } from "./types";
import { Loader2, Play } from "lucide-react";

interface BuildSummaryProps {
  request: CampaignCreationRequest;
  selectedStrategy: CampaignStrategy | null;
  onBuild: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export function BuildSummary({ request, selectedStrategy, onBuild, isLoading, disabled }: BuildSummaryProps) {
  if (!selectedStrategy) {
    return (
      <article className="panel" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "600", margin: 0 }}>مراجعة وتأكيد البناء</h2>
        <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>الرجاء اختيار أحد الخيارات الاستراتيجية لتأكيد تفاصيل البناء.</p>
      </article>
    );
  }

  // Parse arrays safely
  const countryCodes = Array.isArray(selectedStrategy.country_codes) ? selectedStrategy.country_codes : [];
  const placements = Array.isArray(selectedStrategy.placements) ? selectedStrategy.placements : [];

  // Parse strategy_payload values safely
  const payload = selectedStrategy.strategy_payload || {};
  const cpaEstimate = payload.cpa_estimate;
  const expectedConvs = payload.expected_conversations;

  return (
    <article className="panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2 style={{ fontSize: "15px", fontWeight: "600", margin: 0 }}>ملخص المراجعة والبناء</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
          <span style={{ color: "var(--muted)" }}>الاستراتيجية المختارة</span>
          <strong style={{ color: selectedStrategy.tier === "balanced" ? "var(--blue)" : selectedStrategy.tier === "aggressive" ? "var(--amber)" : "var(--green)" }}>
            {selectedStrategy.tier === "balanced" ? "متوازن" : selectedStrategy.tier === "aggressive" ? "هجومي" : "محافظ"}
          </strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
          <span style={{ color: "var(--muted)" }}>اسم الحملة المقترح</span>
          <strong>{selectedStrategy.campaign_name}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
          <span style={{ color: "var(--muted)" }}>الميزانية اليومية</span>
          <strong className="ltr-val">${selectedStrategy.daily_budget}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
          <span style={{ color: "var(--muted)" }}>وجهة الإرسال</span>
          <strong className="ltr-val">{selectedStrategy.destination_type.toUpperCase()}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
          <span style={{ color: "var(--muted)" }}>المواضع الإعلانية</span>
          <strong>{placements.join(", ") || "—"}</strong>
        </div>

        {cpaEstimate !== undefined && (
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
            <span style={{ color: "var(--muted)" }}>تكلفة المحادثة المتوقعة</span>
            <strong className="ltr-val" style={{ color: "var(--green)" }}>${cpaEstimate}</strong>
          </div>
        )}

        {expectedConvs !== undefined && (
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
            <span style={{ color: "var(--muted)" }}>المحادثات المتوقعة يومياً</span>
            <strong className="ltr-val">{expectedConvs}</strong>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "4px" }}>
          <span style={{ color: "var(--muted)" }}>مستوى ثقة الذكاء الاصطناعي</span>
          <strong className="ltr-val" style={{ color: "var(--green)" }}>{selectedStrategy.confidence}%</strong>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
        <button
          type="button"
          disabled={disabled || isLoading}
          onClick={onBuild}
          className="sync-button"
          style={{
            flex: 1,
            background: "var(--brand-gradient)",
            color: "white",
            border: 0,
            justifyContent: "center",
            fontWeight: "600",
            fontSize: "13.5px",
            height: "40px",
            boxShadow: "0 4px 12px var(--brand-shadow)",
            opacity: (disabled || isLoading) ? 0.6 : 1,
            cursor: (disabled || isLoading) ? "not-allowed" : "pointer"
          }}
        >
          {isLoading ? (
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Loader2 size={16} className="animate-spin" /> جاري بناء الحملة...
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Play size={16} /> بناء الحملة على Meta
            </span>
          )}
        </button>
      </div>
    </article>
  );
}
