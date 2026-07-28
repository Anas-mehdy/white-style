"use client";

import { useState } from "react";
import { Download, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import type { SignedImageItem } from "@/types/image-agent";

interface ImageItemCardProps {
  item: SignedImageItem;
  onRegenerate: (itemId: string) => Promise<void>;
  onRetry: (itemId: string) => Promise<void>;
  onOpenLightbox: (item: SignedImageItem) => void;
}

export function ImageItemCard({
  item,
  onRegenerate,
  onRetry,
  onOpenLightbox,
}: ImageItemCardProps) {
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [showRetryConfirm, setShowRetryConfirm] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const handleRegenerateClick = async () => {
    setShowRegenConfirm(false);
    setIsActionLoading(true);
    try {
      await onRegenerate(item.id);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRetryClick = async () => {
    setShowRetryConfirm(false);
    setIsActionLoading(true);
    try {
      await onRetry(item.id);
    } finally {
      setIsActionLoading(false);
    }
  };

  const formattedDate = new Date(item.created_at).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        position: "relative",
      }}
    >
      {/* Top Header: Source & Status */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "11px", color: "var(--muted)" }}>
          محاولة #{item.attempt_count ?? 0} • {formattedDate}
        </span>
        {/* Status Badge */}
        {item.status === "queued" && (
          <span
            style={{
              fontSize: "11px",
              padding: "4px 8px",
              borderRadius: "6px",
              background: "rgba(148, 163, 184, 0.12)",
              color: "var(--muted)",
              fontWeight: "500",
            }}
          >
            بانتظار التنفيذ
          </span>
        )}
        {item.status === "processing" && (
          <span
            style={{
              fontSize: "11px",
              padding: "4px 8px",
              borderRadius: "6px",
              background: "var(--blue-soft)",
              color: "#60a5fa",
              fontWeight: "500",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Loader2 size={12} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
            جاري إنشاء الصورة
          </span>
        )}
        {item.status === "completed" && (
          <span
            style={{
              fontSize: "11px",
              padding: "4px 8px",
              borderRadius: "6px",
              background: "var(--green-soft)",
              color: "#10b981",
              fontWeight: "500",
            }}
          >
            اكتملت
          </span>
        )}
        {item.status === "failed" && (
          <span
            style={{
              fontSize: "11px",
              padding: "4px 8px",
              borderRadius: "6px",
              background: "var(--red-soft)",
              color: "#ef4444",
              fontWeight: "500",
            }}
          >
            فشلت
          </span>
        )}
      </div>

      {/* Main Display: 1:1 Aspect Ratio Image Container */}
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: "10px",
          overflow: "hidden",
          background: "var(--surface-soft)",
          position: "relative",
          display: "grid",
          placeItems: "center",
          border: "1px solid var(--border)",
        }}
      >
        {item.status === "queued" && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              color: "var(--muted)",
            }}
          >
            {item.source_url ? (
              <img
                src={item.source_url}
                alt="Source product"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: 0.5,
                  filter: "blur(2px)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "rgba(255, 255, 255, 0.03)",
                }}
              />
            )}
            <span
              style={{
                position: "absolute",
                fontSize: "12px",
                fontWeight: "500",
                background: "rgba(0,0,0,0.6)",
                padding: "4px 10px",
                borderRadius: "6px",
                color: "#fff",
              }}
            >
              بانتظار البدء...
            </span>
          </div>
        )}

        {item.status === "processing" && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              color: "#60a5fa",
              position: "relative",
            }}
          >
            {item.source_url && (
              <img
                src={item.source_url}
                alt="Source product"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: 0.3,
                  position: "absolute",
                  inset: 0,
                }}
              />
            )}
            <div
              style={{
                zIndex: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                background: "rgba(15, 23, 42, 0.8)",
                padding: "16px",
                borderRadius: "12px",
                backdropFilter: "blur(4px)",
              }}
            >
              <Loader2 size={28} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "12px", fontWeight: "600" }}>
                جاري إنشاء الصورة...
              </span>
            </div>
          </div>
        )}

        {item.status === "completed" && item.result_url && (
          <div
            onClick={() => onOpenLightbox(item)}
            style={{
              width: "100%",
              height: "100%",
              cursor: "pointer",
              position: "relative",
            }}
            title="اضغط للتكبير والمقارنة"
          >
            <img
              src={item.result_url}
              alt="Generated result"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            {/* Small Source Badge Overlay */}
            {item.source_url && (
              <div
                style={{
                  position: "absolute",
                  bottom: "8px",
                  right: "8px",
                  width: "36px",
                  height: "36px",
                  borderRadius: "6px",
                  overflow: "hidden",
                  border: "2px solid #ffffff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                }}
                title="الصورة الأصلية"
              >
                <img
                  src={item.source_url}
                  alt="Source thumbnail"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}
          </div>
        )}

        {item.status === "failed" && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "16px",
              textAlign: "center",
              background: "rgba(239, 68, 68, 0.05)",
            }}
          >
            <AlertTriangle size={32} style={{ color: "#ef4444" }} />
            <span style={{ fontSize: "12px", color: "#f87171", fontWeight: "600" }}>
              تعذر إنشاء الصورة
            </span>
            <span style={{ fontSize: "11px", color: "var(--muted)", maxWidth: "180px" }}>
              {item.error_message || "حدث خطأ أثناء معالجة الطلب، يمكنك إعادة المحاولة."}
            </span>
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
        {item.status === "completed" && (
          <>
            <a
              href={`/api/image-agent/items/${item.id}/download`}
              target="_blank"
              rel="noopener noreferrer"
              download
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "8px",
                background: "var(--surface-soft)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                fontSize: "12px",
                fontWeight: "500",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                textDecoration: "none",
              }}
            >
              <Download size={14} />
              تنزيل
            </a>
            <button
              type="button"
              disabled={isActionLoading}
              onClick={() => setShowRegenConfirm(true)}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                color: "#60a5fa",
                fontSize: "12px",
                fontWeight: "500",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <RefreshCw size={14} className={isActionLoading ? "animate-spin" : ""} />
              إعادة التوليد
            </button>
          </>
        )}

        {item.status === "failed" && (
          <button
            type="button"
            disabled={isActionLoading}
            onClick={() => setShowRetryConfirm(true)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#f87171",
              fontSize: "12px",
              fontWeight: "600",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <RefreshCw size={14} className={isActionLoading ? "animate-spin" : ""} />
            إعادة المحاولة
          </button>
        )}
      </div>

      {/* Confirmation Modal for Regenerate */}
      {showRegenConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: "700", margin: "0 0 10px" }}>
              إعادة توليد الصورة
            </h3>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0 0 20px", lineHeight: "1.5" }}>
              ستستخدم هذه العملية محاولة إضافية من الرصيد التجريبي.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowRegenConfirm(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  fontSize: "13px",
                }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleRegenerateClick}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  background: "var(--brand-gradient)",
                  color: "#fff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                إعادة التوليد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Retry */}
      {showRetryConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: "700", margin: "0 0 10px" }}>
              إعادة محاولة إنشاء الصورة
            </h3>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0 0 20px", lineHeight: "1.5" }}>
              ستستخدم هذه العملية محاولة إضافية من الرصيد التجريبي.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowRetryConfirm(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  fontSize: "13px",
                }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleRetryClick}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  background: "var(--brand-gradient)",
                  color: "#fff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
