"use client";

import { X, ExternalLink, Calendar, MessageSquare, ThumbsUp, Share2, Layers, Tag, Eye, Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { ContentLibraryItem } from "./types";
import { AnimatePresence, motion } from "framer-motion";

interface ContentDetailsProps {
  item: ContentLibraryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ContentDetails({ item, isOpen, onClose }: ContentDetailsProps) {
  const [imgSrc, setImgSrc] = useState("");
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (item) {
      setImgSrc(item.thumbnail_url || "/placeholder-image.png");
      setImgFailed(!item.thumbnail_url);
    }
  }, [item]);

  if (!item) return null;

  const formattedDate = item.created_time
    ? new Date(item.created_time).toLocaleString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "—";

  const lastSyncDate = item.updated_at
    ? new Date(item.updated_at).toLocaleString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "—";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(4px)",
              zIndex: 999,
            }}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: "100%",
              maxWidth: "500px",
              height: "100vh",
              background: "var(--surface)",
              borderLeft: "1px solid var(--border)",
              boxShadow: "-10px 0 30px rgba(0,0,0,0.5)",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "700" }}>تفاصيل منشور المكتبة</h2>
              <button
                onClick={onClose}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border)",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Scrollable Area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Media Preview */}
              <div style={{ width: "100%", height: "240px", borderRadius: "8px", overflow: "hidden", background: "rgba(0,0,0,0.3)", position: "relative" }}>
                {!imgFailed ? (
                  <img
                    src={imgSrc}
                    alt="Content Preview"
                    onError={() => setImgFailed(true)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--muted)" }}>
                    <ImageIcon size={36} />
                    <span style={{ fontSize: "12px" }}>معاينة الصورة غير متوفرة</span>
                  </div>
                )}

                <div style={{ position: "absolute", top: "12px", right: "12px", display: "flex", gap: "6px" }}>
                  <span className="badge badge--info" style={{ fontSize: "11px" }}>
                    {item.platform === "instagram" ? "Instagram" : "Facebook"}
                  </span>
                  <span className="badge badge--neutral" style={{ fontSize: "11px" }}>
                    {item.content_type.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                <div className="panel" style={{ padding: "12px", textAlign: "center", background: "var(--surface-soft)" }}>
                  <ThumbsUp size={16} style={{ color: "var(--blue)", margin: "0 auto 6px" }} />
                  <span style={{ display: "block", fontSize: "11px", color: "var(--muted)" }}>الإعجابات</span>
                  <strong style={{ fontSize: "15px" }}>{item.likes_count}</strong>
                </div>
                <div className="panel" style={{ padding: "12px", textAlign: "center", background: "var(--surface-soft)" }}>
                  <MessageSquare size={16} style={{ color: "var(--green)", margin: "0 auto 6px" }} />
                  <span style={{ display: "block", fontSize: "11px", color: "var(--muted)" }}>التعليقات</span>
                  <strong style={{ fontSize: "15px" }}>{item.comments_count}</strong>
                </div>
                <div className="panel" style={{ padding: "12px", textAlign: "center", background: "var(--surface-soft)" }}>
                  <Share2 size={16} style={{ color: "var(--amber)", margin: "0 auto 6px" }} />
                  <span style={{ display: "block", fontSize: "11px", color: "var(--muted)" }}>المشاركات</span>
                  <strong style={{ fontSize: "15px" }}>{item.shares_count}</strong>
                </div>
              </div>

              {/* Full Caption */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "600" }}>النص الكامل (Caption)</span>
                <div className="panel" style={{ padding: "16px", background: "var(--surface-soft)", fontSize: "13.5px", lineHeight: "1.7", whiteSpace: "pre-line", direction: "rtl" }}>
                  {item.caption || <span style={{ color: "var(--muted)", fontStyle: "italic" }}>لا يوجد نص شرح متوفر لهذا المنشور.</span>}
                </div>
              </div>

              {/* Meta & System Info */}
              <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px", background: "var(--surface-soft)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px" }}>
                  <span style={{ color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}><Calendar size={14} /> تاريخ النشر</span>
                  <strong>{formattedDate}</strong>
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                  <span style={{ color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}><Tag size={14} /> حالة الترويج</span>
                  <strong>{item.is_promoted ? `نعم (تم ترويجه ${item.promotion_count} مرات)` : "لا"}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                  <span style={{ color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}><Layers size={14} /> حالة دورة الحياة</span>
                  <strong className="badge badge--success" style={{ fontSize: "10px" }}>{item.status}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                  <span style={{ color: "var(--muted)" }}>معرف منشور Meta</span>
                  <code style={{ fontSize: "11px", color: "var(--amber)" }}>{item.meta_post_id}</code>
                </div>

                {item.instagram_media_id && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                    <span style={{ color: "var(--muted)" }}>Instagram Media ID</span>
                    <code style={{ fontSize: "11px" }}>{item.instagram_media_id}</code>
                  </div>
                )}

                {item.last_campaign_id && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                    <span style={{ color: "var(--muted)" }}>آخر معرف حملة مرتبطة</span>
                    <code style={{ fontSize: "11px" }}>{item.last_campaign_id}</code>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                  <span style={{ color: "var(--muted)" }}>آخر تحديث مزامنة</span>
                  <strong>{lastSyncDate}</strong>
                </div>
              </div>
            </div>

            {/* Footer */}
            {item.permalink && (
              <div style={{ padding: "20px", borderTop: "1px solid var(--border)", display: "flex", gap: "10px" }}>
                <a
                  href={item.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sync-button"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    background: "transparent",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                    textDecoration: "none",
                    height: "40px"
                  }}
                >
                  فتح المنشور الأصلي
                  <ExternalLink size={14} style={{ marginRight: "6px" }} />
                </a>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
