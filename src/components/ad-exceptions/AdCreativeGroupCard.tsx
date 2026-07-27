"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Layers, CheckSquare, Image as ImageIcon } from "lucide-react";
import type { AdCreativeGroup, AdSummary } from "@/types/ad-exceptions";
import { AdPickerResultRow } from "./AdPickerResultRow";

interface AdCreativeGroupCardProps {
  group: AdCreativeGroup;
  selectedAdIds: Set<string>;
  onToggleAdSelect: (ad: AdSummary) => void;
  onSelectAllActiveInGroup: (group: AdCreativeGroup) => void;
}

export function AdCreativeGroupCard({
  group,
  selectedAdIds,
  onToggleAdSelect,
  onSelectAllActiveInGroup,
}: AdCreativeGroupCardProps) {
  const [expanded, setExpanded] = useState(false);

  const allActiveSelected = group.ads
    .filter((a) => a.effective_status === "ACTIVE")
    .every((a) => selectedAdIds.has(a.id));

  return (
    <article
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "var(--shadow)",
        transition: "border-color 0.2s ease",
      }}
    >
      {/* Group Header */}
      <div
        style={{
          padding: "14px 16px",
          background: "var(--surface-soft)",
          borderBottom: expanded ? "1px solid var(--border)" : 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        {/* Left Representative Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
              flexShrink: 0,
              color: "var(--muted)",
            }}
          >
            {group.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={group.thumbnail_url}
                alt={group.representative_name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <ImageIcon size={18} />
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 }}>
            <strong style={{ fontSize: "14px", fontWeight: "700", color: "var(--foreground)" }}>
              {group.representative_name}
            </strong>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "11.5px" }}>
              <span className="badge badge--info" style={{ fontSize: "10.5px", padding: "2px 6px" }}>
                <Layers size={11} style={{ marginLeft: "3px" }} />
                Creative ID: {group.creative_id || "منفرد"}
              </span>

              <span style={{ color: "var(--muted)" }}>
                إجمالي الإعلانات: <strong style={{ color: "var(--foreground)" }}>{group.total_ads}</strong>
              </span>

              <span style={{ color: "var(--green)" }}>
                الفعالة: <strong>{group.active_ads}</strong>
              </span>

              <span style={{ color: "var(--muted)" }}>
                الصفحات: <strong style={{ color: "var(--foreground)" }}>{group.page_count}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => onSelectAllActiveInGroup(group)}
            className="sync-button"
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: "600",
              background: allActiveSelected ? "var(--green-soft)" : "var(--surface)",
              color: allActiveSelected ? "var(--green-dark)" : "var(--foreground)",
              borderColor: allActiveSelected ? "var(--green)" : "var(--border)",
            }}
          >
            <CheckSquare size={13} />
            <span>{allActiveSelected ? "تم اختيار الفعالة بالكامل" : "اختيار جميع الإعلانات الفعالة"}</span>
          </button>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              borderRadius: "8px",
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>{expanded ? "إخفاء التفاصيل" : "عرض الإعلانات"}</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded Ads List */}
      {expanded && (
        <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {group.ads.map((ad) => (
            <AdPickerResultRow
              key={ad.id}
              ad={ad}
              isSelected={selectedAdIds.has(ad.id)}
              onToggleSelect={onToggleAdSelect}
            />
          ))}
        </div>
      )}
    </article>
  );
}
