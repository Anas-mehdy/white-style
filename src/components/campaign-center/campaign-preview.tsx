"use client";

import { motion } from "framer-motion";
import { CampaignStrategy } from "./types";
import { Layers, Folder, Image, Target, AlertCircle } from "lucide-react";

interface CampaignPreviewProps {
  strategy: CampaignStrategy | null;
}

export function CampaignPreview({ strategy }: CampaignPreviewProps) {
  if (!strategy) {
    return (
      <article className="panel" style={{ background: "var(--surface)" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "16px" }}>معاينة الحملة الإعلانية على Meta</h2>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", color: "var(--muted)", fontSize: "13px", padding: "16px", background: "var(--surface-soft)", borderRadius: "8px", border: "1px dashed var(--border)" }}>
          <AlertCircle size={16} />
          <span>الرجاء اختيار استراتيجية لعرض المعاينة الهيكلية للحملة.</span>
        </div>
      </article>
    );
  }

  const placements = Array.isArray(strategy.placements) ? strategy.placements : [];

  return (
    <article className="panel" style={{ background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "600", margin: 0 }}>معاينة الحملة الإعلانية على Meta</h2>
        <span className="badge badge--warning" style={{ fontSize: "11px", fontWeight: "700" }}>
          PAUSED (متوقفة مؤقتًا)
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Campaign level */}
        <div style={{ display: "flex", gap: "10px", padding: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "8px" }}>
          <Folder size={18} style={{ color: "var(--blue)", marginTop: "2px", flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>مستوى الحملة (Campaign)</span>
            <strong style={{ fontSize: "13px" }}>{strategy.campaign_name || "حملة ذكية جديدة"}</strong>
            <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
              <span>الهدف: {strategy.objective || "محادثات"}</span>
              <span>الميزانية اليومية: ${strategy.daily_budget} (CBO)</span>
            </div>
          </div>
        </div>

        <div style={{ marginRight: "16px", borderRight: "2px dashed var(--border)", paddingRight: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Ad Set level */}
          <div style={{ display: "flex", gap: "10px", padding: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "8px" }}>
            <Layers size={18} style={{ color: "var(--green)", marginTop: "2px", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>المجموعة الإعلانية (Ad Set)</span>
              <strong style={{ fontSize: "13px" }}>Adset - {strategy.campaign_name || "مجموعة إعلانية ذكية"}</strong>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                <span>الوجهة: {strategy.destination_type === "whatsapp" ? "WhatsApp" : strategy.destination_type === "messenger" ? "Messenger" : "Website"}</span>
                <span>الجمهور المستهدف: {strategy.gender === "all" ? "الكل" : strategy.gender === "female" ? "إناث" : "ذكور"}، عمر {strategy.age_min}-{strategy.age_max}</span>
                <span>المواضع: {placements.join(", ") || "Advantage+"}</span>
              </div>
            </div>
          </div>

          <div style={{ marginRight: "16px", borderRight: "2px dashed var(--border)", paddingRight: "16px" }}>
            {/* Ad level */}
            <div style={{ display: "flex", gap: "10px", padding: "12px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--border)", borderRadius: "8px" }}>
              <Image size={18} style={{ color: "var(--amber)", marginTop: "2px", flexShrink: 0 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>الإعلان (Ad Creative)</span>
                <strong style={{ fontSize: "13px" }}>Ad - {strategy.campaign_name || "إعلان ذكي"}</strong>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>مبني على المنشور المرفق ورسالة الترحيب التلقائية</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
