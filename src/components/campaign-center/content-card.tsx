"use client";

import { Heart, MessageCircle, Share2, ExternalLink, Image as ImageIcon, Sparkles, Plus, Eye } from "lucide-react";
import { useState } from "react";
import { ContentLibraryItem } from "./types";

interface ContentCardProps {
  item: ContentLibraryItem;
  onSelectForCampaign: (item: ContentLibraryItem) => void;
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

        {/* Badges on Thumbnail */}
        <div style={{ position: "absolute", top: "10px", right: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <span className="badge badge--info" style={{ textTransform: "capitalize", fontSize: "10.5px" }}>
            {item.platform === "instagram" ? "Instagram" : "Facebook"}
          </span>
          <span className="badge badge--neutral" style={{ textTransform: "capitalize", fontSize: "10.5px" }}>
            {item.content_type === "reel" ? "Reel" : item.content_type === "carousel" ? "Carousel" : "منشور"}
          </span>
        </div>

        {/* Status Badge */}
        <div style={{ position: "absolute", bottom: "10px", right: "10px" }}>
          <span className={`badge ${statusClasses[item.status] || "badge--neutral"}`} style={{ fontSize: "11px", fontWeight: "600" }}>
            {statusLabels[item.status] || item.status}
          </span>
        </div>

        {item.is_promoted && (
          <div style={{ position: "absolute", bottom: "10px", left: "10px" }}>
            <span className="badge badge--warning" style={{ fontSize: "10.5px" }}>
              مروّج ({item.promotion_count})
            </span>
          </div>
        )}
      </div>

      {/* Content details */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "16px" }}>
        {/* Caption */}
        <p
          style={{
            fontSize: "13px",
            lineHeight: "1.6",
            color: "var(--foreground)",
            margin: "0 0 16px 0",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 1,
          }}
        >
          {item.caption || <span style={{ color: "var(--muted)", fontStyle: "italic" }}>بدون شرح...</span>}
        </p>

        {/* Date and Engagement */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "12px", marginBottom: "16px" }}>
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

        {/* Action row */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            onClick={() => onSelectForCampaign(item)}
            className="sync-button"
            style={{
              width: "100%",
              justifyContent: "center",
              background: "var(--brand-gradient)",
              color: "white",
              border: 0,
              fontWeight: "600",
              height: "38px"
            }}
          >
            <Plus size={16} style={{ marginLeft: "4px" }} />
            تحليل وإنشاء حملة
          </button>

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
              تفاصيل
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
              تحرير ذكي
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
                marginTop: "4px",
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
