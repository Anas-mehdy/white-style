"use client";

import { Check, AlertTriangle, Lightbulb } from "lucide-react";
import { CampaignStrategy } from "./types";

interface StrategyCardProps {
  strategy: CampaignStrategy;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export function StrategyCard({ strategy, isSelected, onSelect, disabled }: StrategyCardProps) {
  const isRecommended = strategy.tier === "balanced";
  
  // Theme color mapping based on Tier
  let themeColor = "var(--green)";
  let themeBg = "rgba(16, 185, 129, 0.05)";
  let badgeText = "محافظ";
  
  if (strategy.tier === "balanced") {
    themeColor = "var(--blue)";
    themeBg = "rgba(59, 130, 246, 0.05)";
    badgeText = "متوازن";
  } else if (strategy.tier === "aggressive") {
    themeColor = "var(--amber)";
    themeBg = "rgba(245, 158, 11, 0.05)";
    badgeText = "هجومي";
  }

  // Parse arrays safely
  const reasons = Array.isArray(strategy.reasons) ? strategy.reasons : [];
  const warnings = Array.isArray(strategy.warnings) ? strategy.warnings : [];
  const countryCodes = Array.isArray(strategy.country_codes) ? strategy.country_codes : [];
  const placements = Array.isArray(strategy.placements) ? strategy.placements : [];
  const interestHints = Array.isArray(strategy.interest_hints) ? strategy.interest_hints : [];

  // Parse strategy_payload values (CPA, expected_conversations, advantages, risks)
  const payload = strategy.strategy_payload || {};
  const cpaEstimate = payload.cpa_estimate;
  const expectedConvs = payload.expected_conversations;

  return (
    <article
      className="panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        border: "2px solid " + (isSelected ? themeColor : "var(--border)"),
        background: themeBg,
        position: "relative",
        opacity: disabled ? 0.7 : 1,
        transition: "border 0.2s, background 0.2s",
      }}
    >
      {isRecommended && (
        <span
          className="badge badge--info"
          style={{
            position: "absolute",
            top: "-11px",
            left: "16px",
            fontSize: "10px",
            padding: "3px 8px",
            boxShadow: "0 4px 10px rgba(59, 130, 246, 0.2)",
          }}
        >
          موصى به
        </span>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "700" }}>الخيار {badgeText}</h3>
        <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: "var(--foreground)", fontSize: "11.5px" }}>
          الثقة: {strategy.confidence || 0}%
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
        <div>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>الميزانية اليومية</span>
          <strong className="ltr-val" style={{ display: "block", fontSize: "14px", marginTop: "2px" }}>
            ${strategy.daily_budget}
          </strong>
        </div>
        <div>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>الهدف الإعلاني</span>
          <strong style={{ display: "block", fontSize: "13px", marginTop: "2px" }}>
            {strategy.optimization_goal || "—"}
          </strong>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, fontSize: "12.5px" }}>
        {/* Render real CPA or Conversations if they exist */}
        {cpaEstimate !== undefined && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--muted)" }}>تكلفة الإجراء المتوقعة (CPA)</span>
            <strong className="ltr-val" style={{ color: themeColor }}>${cpaEstimate}</strong>
          </div>
        )}
        {expectedConvs !== undefined && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--muted)" }}>المحادثات المتوقعة</span>
            <strong className="ltr-val">{expectedConvs}</strong>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--muted)" }}>البلدان</span>
          <strong>{countryCodes.join(", ") || "—"}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--muted)" }}>العمر</span>
          <strong>{strategy.age_min} - {strategy.age_max}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--muted)" }}>الجنس</span>
          <strong>{strategy.gender === "all" ? "الكل" : strategy.gender === "female" ? "إناث" : "ذكور"}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--muted)" }}>المنصات</span>
          <strong style={{ fontSize: "11.5px" }}>{placements.join(", ") || "—"}</strong>
        </div>
        {interestHints.length > 0 && (
          <div>
            <span style={{ color: "var(--muted)", display: "block", marginBottom: "4px" }}>اهتمامات مستهدفة</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {interestHints.map((hint, i) => (
                <span key={i} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "4px", padding: "2px 6px", fontSize: "10.5px" }}>
                  {hint}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Real strategy reasons/advantages */}
        {reasons.length > 0 && (
          <div style={{ marginTop: "6px" }}>
            <span style={{ color: "var(--muted)", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
              <Lightbulb size={14} style={{ color: "var(--blue)" }} /> مبررات الخطة
            </span>
            <ul style={{ margin: 0, paddingRight: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {reasons.map((r, i) => (
                <li key={i} style={{ color: "var(--foreground)" }}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Real strategy warnings/risks */}
        {warnings.length > 0 && (
          <div style={{ marginTop: "6px" }}>
            <span style={{ color: "var(--muted)", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
              <AlertTriangle size={14} style={{ color: "var(--amber)" }} /> مخاطر / محاذير
            </span>
            <ul style={{ margin: 0, paddingRight: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {warnings.map((w, i) => (
                <li key={i} style={{ color: "var(--muted)" }}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className="sync-button"
        style={{
          width: "100%",
          justifyContent: "center",
          background: isSelected ? themeColor : "transparent",
          color: isSelected ? "white" : "var(--muted)",
          borderColor: isSelected ? themeColor : "var(--border)",
          fontWeight: "600",
          height: "38px"
        }}
      >
        {isSelected ? (
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Check size={16} /> تم اختيار الخيار
          </span>
        ) : "اختيار الاستراتيجية"}
      </button>
    </article>
  );
}
