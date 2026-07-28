"use client";

import { useState } from "react";
import type { ImageAgentBatch } from "@/types/image-agent";
import { Clock, Eye, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface HistorySectionProps {
  batches: ImageAgentBatch[];
  activeBatchId: string | null;
  onSelectBatch: (batchId: string) => void;
}

const BATCHES_PER_PAGE = 10;

export function HistorySection({
  batches,
  activeBatchId,
  onSelectBatch,
}: HistorySectionProps) {
  const [visibleCount, setVisibleCount] = useState(BATCHES_PER_PAGE);

  const displayedBatches = batches.slice(0, visibleCount);

  const getStatusBadge = (status: ImageAgentBatch["status"]) => {
    switch (status) {
      case "queued":
        return (
          <span style={{ padding: "4px 10px", borderRadius: "6px", background: "rgba(148, 163, 184, 0.12)", color: "var(--muted)", fontSize: "11px", fontWeight: "500" }}>
            بانتظار التنفيذ
          </span>
        );
      case "processing":
        return (
          <span style={{ padding: "4px 10px", borderRadius: "6px", background: "var(--blue-soft)", color: "#60a5fa", fontSize: "11px", fontWeight: "500", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
            قيد المعالجة
          </span>
        );
      case "completed":
        return (
          <span style={{ padding: "4px 10px", borderRadius: "6px", background: "var(--green-soft)", color: "#10b981", fontSize: "11px", fontWeight: "500" }}>
            مكتمل
          </span>
        );
      case "partially_completed":
        return (
          <span style={{ padding: "4px 10px", borderRadius: "6px", background: "var(--amber-soft)", color: "#f59e0b", fontSize: "11px", fontWeight: "500" }}>
            مكتمل جزئيًا
          </span>
        );
      case "failed":
        return (
          <span style={{ padding: "4px 10px", borderRadius: "6px", background: "var(--red-soft)", color: "#ef4444", fontSize: "11px", fontWeight: "500" }}>
            فشل
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        background: "var(--surface-soft)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "24px",
        boxShadow: "var(--shadow)",
      }}
    >
      <div style={{ marginBottom: "18px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "700", margin: 0 }}>
          سجل الصور
        </h2>
      </div>

      {batches.length === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--muted)",
            fontSize: "13px",
          }}
        >
          لا يوجد سجل عمليات سابق بعد.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {displayedBatches.map((batch) => {
            const isCurrentActive = batch.id === activeBatchId;
            const dateStr = new Date(batch.created_at).toLocaleDateString("ar-EG", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={batch.id}
                style={{
                  background: isCurrentActive ? "rgba(59, 130, 246, 0.08)" : "var(--surface)",
                  border: isCurrentActive ? "1px solid rgba(59, 130, 246, 0.3)" : "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "rgba(148, 163, 184, 0.1)",
                      color: "var(--muted)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Clock size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600" }}>
                      دفعة صور ({batch.total_items} صور)
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                      {dateStr}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  {getStatusBadge(batch.status)}

                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    <span style={{ color: "#10b981", marginInlineEnd: "8px" }}>
                      نجح: {batch.completed_items ?? 0}
                    </span>
                    <span style={{ color: "#ef4444" }}>
                      فشل: {batch.failed_items ?? 0}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectBatch(batch.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: isCurrentActive ? "var(--brand-gradient)" : "var(--surface-soft)",
                      border: isCurrentActive ? "none" : "1px solid var(--border)",
                      color: isCurrentActive ? "#ffffff" : "var(--foreground)",
                      fontSize: "12px",
                      fontWeight: "500",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Eye size={14} />
                    {isCurrentActive ? "الدفعة المعروضة" : "عرض التفاصيل"}
                  </button>
                </div>
              </div>
            );
          })}

          {batches.length > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + BATCHES_PER_PAGE)}
              style={{
                margin: "12px auto 0",
                padding: "10px 24px",
                borderRadius: "10px",
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--muted)",
                fontSize: "13px",
                fontWeight: "500",
              }}
            >
              تحميل المزيد
            </button>
          )}
        </div>
      )}
    </div>
  );
}
