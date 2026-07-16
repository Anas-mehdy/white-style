"use client";

import { Heart, MessageCircle, Share2, ExternalLink, Image as ImageIcon, Sparkles, Plus, Eye } from "lucide-react";
import { useState } from "react";
import { ContentLibraryItem } from "./types";

interface ContentCardProps {
  item: ContentLibraryItem;
  onSelectForCampaign: (item: ContentLibraryItem, forceNewAttempt?: boolean) => void;
  onShowDetails: (item: ContentLibraryItem) => void;
  onShowAIEditor: (item: ContentLibraryItem) => void;
}

export function ContentCard({
  item,
  onSelectForCampaign,
  onShowDetails,
  onShowAIEditor,
}: ContentCardProps) {
  const [imgSrc, setImgSrc] = useState(item.thumbnail_url || "/placeholder-image.png");
  const [imgFailed, setImgFailed] = useState(!item.thumbnail_url);

  const handleImageError = () => {
    setImgFailed(true);
    setImgSrc(""); // will render fallback container
  };

  const formattedDate = item.created_time
    ? new Date(item.created_time).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  // Card status color schemes
  const statusLabels: Record<string, string> = {
    NEW: "جديد",
    ANALYZED: "محلل",
    READY: "جاهز للحملات",
    PROMOTED: "مروج",
    RUNNING: "نشط",
    FINISHED: "مكتمل",
    ARCHIVED: "مؤرشف",
  };

  const statusClasses: Record<string, string> = {
    NEW: "badge--info",
    ANALYZED: "badge--success",
    READY: "badge--success",
    PROMOTED: "badge--warning",
    RUNNING: "badge--success",
    FINISHED: "badge--neutral",
    ARCHIVED: "badge--neutral",
  };

  return (
    <article
      className="panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: 0,
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        transition: "transform 0.2s, border-color 0.2s",
      }}
    >
      {/* Thumbnail area */}
      <div style={{ position: "relative", width: "100%", height: "180px", background: "rgba(0,0,0,0.2)" }}>
        {!imgFailed ? (
          <img
            src={imgSrc}
            alt={item.caption || "Content thumbnail"}
            onError={handleImageError}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            loading="lazy"
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--muted)", background: "rgba(255,255,255,0.02)" }}>
            <ImageIcon size={32} />
            <span style={{ fontSize: "12px" }}>معاينة الصورة غير متوفرة</span>
          </div>
        )}

        {/* AI Candidate Badge (Top Left) */}
        {(() => {
          const scoreVal = Math.min(98, Math.max(34, Math.round(60 + (item.likes_count * 0.15) + (item.comments_count * 0.45))));
          if (scoreVal < 70) {
            return null;
          }
          let badgeText = "مرشح ممتاز";
          let badgeColor = "var(--green)";
          if (scoreVal < 90) {
            badgeText = "مرشح جيد";
            badgeColor = "var(--amber)";
          }
          return (
            <div style={{ position: "absolute", top: "10px", left: "10px", zIndex: 2 }}>
              <span className="badge" style={{ backgroundColor: badgeColor, color: "white", fontSize: "11px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
                <Sparkles size={11} style={{ fill: "white" }} />
                {badgeText} {scoreVal}%
              </span>
            </div>
          );
        })()}

        {/* Badges on Thumbnail (Top Right) */}
        <div style={{ position: "absolute", top: "10px", right: "10px", display: "flex", flexDirection: "column", gap: "6px", zIndex: 2 }}>
          <span className="badge badge--info" style={{ textTransform: "capitalize", fontSize: "10.5px" }}>
            {item.platform === "instagram" ? "Instagram" : "Facebook"}
          </span>
          <span className="badge badge--neutral" style={{ textTransform: "capitalize", fontSize: "10.5px" }}>
            {item.content_type === "reel" ? "Reel" : item.content_type === "carousel" ? "Carousel" : "منشور"}
          </span>
        </div>

        {/* Status Badge (Bottom Right) */}
        <div style={{ position: "absolute", bottom: "10px", right: "10px", zIndex: 2 }}>
          <span className={`badge ${statusClasses[item.status] || "badge--neutral"}`} style={{ fontSize: "11px", fontWeight: "600" }}>
            {statusLabels[item.status] || item.status}
          </span>
        </div>
      </div>

      {/* Content details */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "16px" }}>
        {/* Caption */}
        <p
          style={{
            fontSize: "13px",
            lineHeight: "1.6",
            color: "var(--foreground)",
            margin: "0 0 12px 0",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textOverflow: "ellipsis",
            height: "40px"
          }}
        >
          {item.caption || <span style={{ color: "var(--muted)", fontStyle: "italic" }}>بدون شرح...</span>}
        </p>

        {/* Date and Engagement */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "10px", marginBottom: "12px" }}>
          <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>{formattedDate}</span>
          
          <div style={{ display: "flex", gap: "10px", color: "var(--muted)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11.5px" }}>
              <Heart size={13} style={{ fill: "currentColor", stroke: "none" }} />
              {item.likes_count}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11.5px" }}>
              <MessageCircle size={13} style={{ fill: "currentColor", stroke: "none" }} />
              {item.comments_count}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11.5px" }}>
              <Share2 size={13} />
              {item.shares_count}
            </span>
          </div>
        </div>

        {/* V2 Campaign Status Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "11.5px", marginBottom: "14px" }}>
          <div>
            <span style={{ color: "var(--muted)", display: "block" }}>حالة الإعلان الحالية:</span>
            <strong style={{ color: item.status === "RUNNING" ? "var(--green)" : item.status === "PROMOTED" ? "var(--amber)" : "var(--muted)", display: "block", marginTop: "2px" }}>
              {item.status === "RUNNING" ? "نشط (Running)" : item.status === "PROMOTED" ? "موقف مؤقتاً (Paused)" : "غير مروّج"}
            </strong>
          </div>
          <div>
            <span style={{ color: "var(--muted)", display: "block" }}>إجمالي المرات المروجة:</span>
            <strong style={{ color: "var(--foreground)", display: "block", marginTop: "2px" }}>
              {item.promotion_count || 0} حملة
            </strong>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "6px" }}>
            <span style={{ color: "var(--muted)", display: "block" }}>الطلبات المحققة:</span>
            <span style={{ color: "var(--muted)", display: "block", marginTop: "2px" }}>— (قريباً)</span>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "6px" }}>
            <span style={{ color: "var(--muted)", display: "block" }}>العائد على الاستثمار:</span>
            <span style={{ color: "var(--muted)", display: "block", marginTop: "2px" }}>— (قريباً)</span>
          </div>
        </div>

        {/* Action row */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {(() => {
            const isAlreadyPromoted = item.status === "RUNNING" || item.status === "PROMOTED" || item.is_promoted;
            if (isAlreadyPromoted) {
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <button
                    disabled
                    className="sync-button"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      background: "rgba(255,255,255,0.05)",
                      color: "var(--muted)",
                      border: "1px solid var(--border)",
                      fontWeight: "700",
                      height: "38px",
                      cursor: "not-allowed"
                    }}
                  >
                    مروّج بالفعل (Already Promoted)
                  </button>
                  <button
                    onClick={() => onSelectForCampaign(item, true)}
                    type="button"
                    className="sync-button"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      color: "var(--green)",
                      fontWeight: "700",
                      fontSize: "12px",
                      height: "30px",
                      cursor: "pointer"
                    }}
                  >
                    🚀 ترويج مجدداً (Promote Again)
                  </button>
                </div>
              );
            }
            return (
              <button
                onClick={() => onSelectForCampaign(item, false)}
                className="sync-button"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  background: "var(--brand-gradient)",
                  color: "white",
                  border: 0,
                  fontWeight: "700",
                  height: "38px",
                  cursor: "pointer"
                }}
              >
                <Plus size={16} style={{ marginLeft: "4px" }} />
                🚀 Smart Promote / ترويج ذكي
              </button>
            );
          })()}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button
              onClick={() => onShowDetails(item)}
              type="button"
              className="sync-button"
              style={{
                justifyContent: "center",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                fontSize: "12px",
                height: "34px"
              }}
            >
              <Eye size={14} style={{ marginLeft: "4px" }} />
              عرض التفاصيل
            </button>
            <button
              onClick={() => onShowAIEditor(item)}
              type="button"
              className="sync-button"
              style={{
                justifyContent: "center",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                fontSize: "12px",
                height: "34px"
              }}
            >
              <Sparkles size={14} style={{ marginLeft: "4px" }} />
              اقتراحات الذكاء الاصطناعي
            </button>
          </div>

          {item.permalink && (
            <a
              href={item.permalink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                fontSize: "11px",
                color: "var(--muted)",
                textDecoration: "none",
                marginTop: "2px",
                alignSelf: "center"
              }}
            >
              رابط المنشور الأصلي
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
