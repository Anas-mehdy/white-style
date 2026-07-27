"use client";

import { X, Layers, Trash2 } from "lucide-react";
import type { AdSummary } from "@/types/ad-exceptions";

interface SelectedAdsListProps {
  selectedAds: AdSummary[];
  onRemove: (adId: string) => void;
  onClearAll: () => void;
  onOpenPicker: () => void;
}

export function SelectedAdsList({
  selectedAds,
  onRemove,
  onClearAll,
  onOpenPicker,
}: SelectedAdsListProps) {
  if (selectedAds.length === 0) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          background: "var(--surface-soft)",
          border: "1px dashed var(--border)",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <Layers size={28} style={{ color: "var(--muted)" }} />
        <span style={{ fontSize: "13.5px", color: "var(--muted)" }}>لم يتم اختيار أي إعلان بعد.</span>
        <button
          type="button"
          onClick={onOpenPicker}
          className="agent-control"
          style={{ padding: "8px 18px", fontSize: "12.5px" }}
        >
          اختيار الإعلانات...
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <strong style={{ fontSize: "13.5px", color: "var(--foreground)" }}>
            الإعلانات المختارة ({selectedAds.length})
          </strong>
          <span className="badge badge--info" style={{ fontSize: "11px" }}>
            {selectedAds.length === 1 ? "إعلان واحد" : `${selectedAds.length} إعلانات`}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={onOpenPicker}
            className="sync-button"
            style={{ padding: "5px 10px", fontSize: "12px" }}
          >
            تعديل الاختيار
          </button>
          <button
            type="button"
            onClick={onClearAll}
            style={{
              background: "none",
              border: 0,
              color: "var(--red)",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <Trash2 size={12} />
            <span>مسح الكل</span>
          </button>
        </div>
      </div>

      {/* Chips List */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          maxHeight: "180px",
          overflowY: "auto",
          padding: "8px",
          background: "var(--surface-soft)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
        }}
      >
        {selectedAds.map((ad) => (
          <div
            key={ad.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              padding: "6px 10px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "12.5px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
              <span style={{ fontWeight: "600", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {ad.name}
              </span>
              {ad.page_name && (
                <span style={{ fontSize: "11px", color: "var(--muted)", flexShrink: 0 }}>
                  ({ad.page_name})
                </span>
              )}
              <span className="ltr-val" style={{ fontSize: "10.5px", color: "var(--muted)", fontFamily: "monospace", flexShrink: 0 }}>
                ID: {ad.meta_ad_id}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onRemove(ad.id)}
              style={{
                background: "none",
                border: 0,
                color: "var(--muted)",
                cursor: "pointer",
                padding: "2px",
                borderRadius: "4px",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
              title="إزالة الإعلان"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
