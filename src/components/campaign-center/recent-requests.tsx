"use client";

import { CampaignCreationRequest } from "./types";
import { formatArabicDate } from "@/lib/readable-helpers";
import { Image as ImageIcon, ExternalLink } from "lucide-react";

interface RecentRequestsProps {
  requests: CampaignCreationRequest[];
  onSelectRequest: (request: CampaignCreationRequest) => void;
  activeRequestId?: string;
}

export function RecentRequests({ requests, onSelectRequest, activeRequestId }: RecentRequestsProps) {
  const translateStatus = (status: string) => {
    switch (status) {
      case "draft":
        return { text: "مسودة", cls: "badge--neutral" };
      case "resolution_failed":
        return { text: "فشل التحليل", cls: "badge--failed" };
      case "strategy_ready":
        return { text: "الاستراتيجية جاهزة", cls: "badge--info" };
      case "strategy_review_required":
        return { text: "تطلب مراجعة الاستراتيجية", cls: "badge--warning" };
      case "building":
        return { text: "جاري البناء", cls: "badge--warning" };
      case "ready_for_review":
        return { text: "جاهز للمراجعة", cls: "badge--success" };
      case "approved":
        return { text: "تمت الموافقة", cls: "badge--success" };
      case "rejected":
        return { text: "مرفوض", cls: "badge--failed" };
      case "published":
        return { text: "تم النشر", cls: "badge--success" };
      case "failed":
        return { text: "فشل", cls: "badge--failed" };
      default:
        return { text: status, cls: "badge--neutral" };
    }
  };

  return (
    <article className="panel" style={{ background: "var(--surface)", marginTop: "24px" }}>
      <h2 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "14px" }}>الطلبات الأخيرة</h2>
      <div className="data-table" style={{ margin: 0, overflowX: "auto" }}>
        {!requests.length ? (
          <div className="empty-state">لا توجد طلبات حملات حالياً.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>المحتوى</th>
                <th>المنصة</th>
                <th>الحساب الإعلاني</th>
                <th>الوجهة المستهدفة</th>
                <th>الميزانية</th>
                <th>وضع التنفيذ</th>
                <th>الحالة</th>
                <th>تاريخ الطلب</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const statusInfo = translateStatus(req.status);
                
                // Extract content context
                const payload = req.request_payload || {};
                const context = payload.content_context || {};
                const thumbnail = context.thumbnail_url;
                const caption = context.caption || req.source_post_url;
                const permalink = context.permalink || req.source_post_url;
                const platform = req.source_platform || (req.source_post_url?.includes("instagram") ? "instagram" : "facebook");

                return (
                  <tr
                    key={req.id}
                    style={{
                      background: activeRequestId === req.id ? "rgba(59,130,246,0.06)" : undefined,
                    }}
                  >
                    <td>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center", maxWidth: "250px" }}>
                        {thumbnail ? (
                          <div style={{ width: "36px", height: "36px", borderRadius: "4px", overflow: "hidden", flexShrink: 0, background: "rgba(0,0,0,0.2)" }}>
                            <img
                              src={thumbnail}
                              alt="thumbnail"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>
                        ) : (
                          <div style={{ width: "36px", height: "36px", borderRadius: "4px", display: "grid", placeItems: "center", flexShrink: 0, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", color: "var(--muted)" }}>
                            <ImageIcon size={14} />
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
                          <span
                            style={{
                              fontSize: "12.5px",
                              lineHeight: "1.4",
                              display: "-webkit-box",
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              color: "var(--foreground)"
                            }}
                          >
                            {caption}
                          </span>
                          {permalink && (
                            <a
                              href={permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "2px",
                                fontSize: "10.5px",
                                color: "var(--blue)",
                                textDecoration: "none"
                              }}
                            >
                              عرض المنشور الأصلي
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge--neutral" style={{ fontSize: "11px", textTransform: "capitalize" }}>
                        {platform}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, fontSize: "12.5px" }}>
                        {req.meta_ad_accounts?.name || req.target_meta_account_id || "—"}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge--neutral" style={{ fontSize: "11px" }}>
                        {req.destination_type?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <strong className="ltr-val" style={{ fontSize: "12.5px" }}>
                        {req.requested_daily_budget ? `$${req.requested_daily_budget}` : "تلقائي"}
                      </strong>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: req.execution_mode === "live" ? "var(--green)" : "var(--muted)" }}>
                        {req.execution_mode === "live" ? "حقيقي (Live)" : "تجريبي (Dry Run)"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${statusInfo.cls}`} style={{ fontSize: "11px" }}>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td>
                      <span className="ltr-val" style={{ fontSize: "12px", color: "var(--muted)" }}>{formatArabicDate(req.created_at)}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="sync-button"
                        onClick={() => onSelectRequest(req)}
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                      >
                        متابعة
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </article>
  );
}
