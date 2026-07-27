"use client";

import { useState } from "react";
import { Copy, Check, Image as ImageIcon, Tag, Calendar, Globe, Camera } from "lucide-react";
import type { AdSummary } from "@/types/ad-exceptions";
import { AdExceptionBadge } from "./AdExceptionBadge";

interface AdPickerResultRowProps {
  ad: AdSummary;
  isSelected: boolean;
  onToggleSelect: (ad: AdSummary) => void;
}

export function AdPickerResultRow({ ad, isSelected, onToggleSelect }: AdPickerResultRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyMetaAdId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ad.meta_ad_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isActive = ad.effective_status === "ACTIVE";

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      const minutesAgo = Math.floor((Date.now() - d.getTime()) / 60000);
      if (minutesAgo < 60) return `منذ ${minutesAgo} دقيقة`;
      const hoursAgo = Math.floor(minutesAgo / 60);
      if (hoursAgo < 24) return `منذ ${hoursAgo} ساعة`;
      return d.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <article
      onClick={() => onToggleSelect(ad)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "14px",
        borderRadius: "12px",
        border: `1.5px solid ${isSelected ? "var(--blue)" : "var(--border)"}`,
        background: isSelected ? "var(--blue-soft)" : "var(--surface)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: "var(--shadow)",
      }}
    >
      {/* Checkbox */}
      <div style={{ paddingTop: "2px", flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(ad)}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "18px",
            height: "18px",
            accentColor: "var(--blue)",
            cursor: "pointer",
          }}
        />
      </div>

      {/* Thumbnail */}
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "10px",
          background: "var(--surface-soft)",
          border: "1px solid var(--border)",
          overflow: "hidden",
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          color: "var(--muted)",
        }}
      >
        {ad.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ad.thumbnail_url}
            alt={ad.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <ImageIcon size={22} />
        )}
      </div>

      {/* Main Details */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
        {/* Title & Status Row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
          <strong
            style={{
              fontSize: "14px",
              fontWeight: "700",
              color: "var(--foreground)",
              wordBreak: "break-word",
              lineHeight: "1.4",
            }}
          >
            {ad.name}
          </strong>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {/* Status Badge */}
            <span
              className={`badge ${isActive ? "badge--connected" : "badge--neutral"}`}
              style={{ fontSize: "11px", padding: "3px 8px" }}
            >
              {ad.effective_status || "UNKNOWN"}
            </span>

            {/* Existing Exception Badge */}
            {ad.existing_exception && ad.existing_exception.is_active && (
              <AdExceptionBadge
                mode={ad.existing_exception.exception_mode}
                customLimit={ad.existing_exception.custom_cost_per_conversation}
              />
            )}
          </div>
        </div>

        {/* Page / Instagram & Metadata Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "11.5px" }}>
          {/* Page badge */}
          {ad.page_name && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 7px",
                borderRadius: "6px",
                background: "rgba(59, 130, 246, 0.08)",
                color: "#60a5fa",
                fontWeight: "500",
              }}
            >
              <Globe size={12} />
              <span>{ad.page_name}</span>
            </span>
          )}

          {/* Instagram badge */}
          {ad.instagram_name && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 7px",
                borderRadius: "6px",
                background: "rgba(236, 72, 153, 0.08)",
                color: "#f472b6",
                fontWeight: "500",
              }}
            >
              <Camera size={12} />
              <span>{ad.instagram_name}</span>
            </span>
          )}

          {/* Campaign & AdSet info */}
          {ad.campaign_name && (
            <span style={{ color: "var(--muted)" }}>
              حملة: <strong style={{ color: "var(--foreground)" }}>{ad.campaign_name}</strong>
            </span>
          )}
          {ad.ad_set_name && (
            <span style={{ color: "var(--muted)" }}>
              مجموعة: <strong style={{ color: "var(--foreground)" }}>{ad.ad_set_name}</strong>
            </span>
          )}
        </div>

        {/* Bottom Row: IDs & Last Synced */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            flexWrap: "wrap",
            paddingTop: "4px",
            fontSize: "11px",
            color: "var(--muted)",
            borderTop: "1px solid var(--border)",
            marginTop: "2px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Meta Ad ID */}
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span>ID:</span>
              <span className="ltr-val" style={{ fontFamily: "monospace", color: "var(--foreground)" }}>
                {ad.meta_ad_id}
              </span>
              <button
                type="button"
                onClick={handleCopyMetaAdId}
                title="نسخ Meta Ad ID"
                style={{
                  background: "none",
                  border: 0,
                  color: copied ? "var(--green)" : "var(--muted)",
                  cursor: "pointer",
                  padding: "0 2px",
                }}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
              </button>
            </span>

            {/* Creative ID */}
            {ad.creative_id && (
              <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <Tag size={10} />
                <span>Creative:</span>
                <span className="ltr-val" style={{ fontFamily: "monospace" }}>
                  {ad.creative_id}
                </span>
              </span>
            )}
          </div>

          {/* Synced at */}
          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <Calendar size={10} />
            <span>آخر مزامنة: {formatDate(ad.synced_at)}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
