"use client";

import { ImageAgentBatch, SignedImageItem } from "@/types/image-agent";
import { ImageItemCard } from "./image-item-card";
import { Loader2 } from "lucide-react";

interface ActiveBatchSectionProps {
  batch: ImageAgentBatch;
  items: SignedImageItem[];
  warning?: string | null;
  onRegenerate: (itemId: string) => Promise<void>;
  onRetry: (itemId: string) => Promise<void>;
  onOpenLightbox: (item: SignedImageItem) => void;
}

export function ActiveBatchSection({
  batch,
  items,
  warning,
  onRegenerate,
  onRetry,
  onOpenLightbox,
}: ActiveBatchSectionProps) {
  const completedCount = items.filter((i) => i.status === "completed").length;
  const processingCount = items.filter((i) => i.status === "processing").length;
  const failedCount = items.filter((i) => i.status === "failed").length;
  const totalCount = items.length || batch.total_items || 1;

  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const isActive = batch.status === "queued" || batch.status === "processing";

  return (
    <div
      style={{
        background: "var(--surface-soft)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "24px",
        marginBottom: "28px",
        boxShadow: "var(--shadow)",
      }}
    >
      {/* Header & Progress Bar */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", margin: 0 }}>
              جاري إنشاء الصور
            </h2>
            {isActive && (
              <span
                style={{
                  fontSize: "11px",
                  color: "#60a5fa",
                  background: "var(--blue-soft)",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                مباشر
              </span>
            )}
          </div>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--muted)" }}>
            تم إنشاء {completedCount} من أصل {totalCount} صور
          </span>
        </div>

        {/* Progress Bar Container */}
        <div
          style={{
            width: "100%",
            height: "8px",
            background: "var(--surface)",
            borderRadius: "4px",
            overflow: "hidden",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: "var(--brand-gradient)",
              transition: "width 0.4s ease",
            }}
          />
        </div>

        {/* Counts details */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            fontSize: "12px",
            color: "var(--muted)",
            marginTop: "8px",
          }}
        >
          <span>قيد المعالجة: <strong style={{ color: "#60a5fa" }}>{processingCount}</strong></span>
          <span>فشلت: <strong style={{ color: "#ef4444" }}>{failedCount}</strong></span>
        </div>

        {warning && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "var(--amber-soft)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              color: "#f59e0b",
              fontSize: "12px",
            }}
          >
            {warning}
          </div>
        )}
      </div>

      {/* Grid of Items */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        {items.map((item) => (
          <ImageItemCard
            key={item.id}
            item={item}
            onRegenerate={onRegenerate}
            onRetry={onRetry}
            onOpenLightbox={onOpenLightbox}
          />
        ))}
      </div>
    </div>
  );
}
