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
                <th style={{ width: "60px" }}>الصورة</th>
                <th>النص</th>
                <th>الحالة الداخلية</th>
                <th>الاستراتيجية المختارة</th>
                <th>وضع التنفيذ</th>
                <th>حالة Meta</th>
                <th>أنشئ بواسطة</th>
                <th style={{ width: "100px" }}>الإجراء</th>
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
                
                // 4. Find selected strategy
                const strategies = (req as any).campaign_strategies || [];
                const selectedStrat = strategies.find((s: any) => s.selected === true);
                let strategyText = "—";
                if (selectedStrat) {
                  if (selectedStrat.tier === "conservative") strategyText = "محافظ (Conservative)";
                  else if (selectedStrat.tier === "balanced") strategyText = "متوازن (Balanced)";
                  else if (selectedStrat.tier === "aggressive") strategyText = "هجومي (Aggressive)";
                } else if (req.selected_strategy) {
                  if (req.selected_strategy === "conservative") strategyText = "محافظ (Conservative)";
                  else if (req.selected_strategy === "balanced") strategyText = "متوازن (Balanced)";
                  else if (req.selected_strategy === "aggressive") strategyText = "هجومي (Aggressive)";
                }

                // 6. Meta Status
                let metaStatusText = "—";
                let metaStatusCls = "badge--neutral";
                if (selectedStrat) {
                  if (selectedStrat.status === "built_paused") {
                    metaStatusText = "موقوف مؤقتاً (Built Paused)";
                    metaStatusCls = "badge--warning";
                  } else if (selectedStrat.status === "published" || req.status === "published") {
                    metaStatusText = "نشط (Active)";
                    metaStatusCls = "badge--success";
                  } else if (selectedStrat.status === "failed") {
                    metaStatusText = "فشل البناء";
                    metaStatusCls = "badge--failed";
                  }
                } else if (req.status === "published") {
                  metaStatusText = "نشط (Active)";
                  metaStatusCls = "badge--success";
                } else if (req.status === "ready_for_review" || req.status === "approved") {
                  metaStatusText = "موقوف مؤقتاً (Built Paused)";
                  metaStatusCls = "badge--warning";
                }

                // 7. Created By
                const isHuman = req.expert_mode === true;
                const createdByText = isHuman ? "👤 Human" : "🤖 AI";

                return (
                  <tr
                    key={req.id}
                    style={{
                      background: activeRequestId === req.id ? "rgba(59,130,246,0.06)" : undefined,
                    }}
                  >
                    <td>
                      {thumbnail ? (
                        <div style={{ width: "40px", height: "40px", borderRadius: "4px", overflow: "hidden", background: "rgba(0,0,0,0.2)" }}>
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
                        <div style={{ width: "40px", height: "40px", borderRadius: "4px", display: "grid", placeItems: "center", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", color: "var(--muted)" }}>
                          <ImageIcon size={14} />
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", maxWidth: "220px", overflow: "hidden" }}>
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
                            رابط المنشور
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${statusInfo.cls}`} style={{ fontSize: "11px" }}>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--foreground)" }}>
                        {strategyText}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: req.execution_mode === "live" ? "var(--green)" : "var(--muted)" }}>
                        {req.execution_mode === "live" ? "حقيقي" : "تجريبي"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${metaStatusCls}`} style={{ fontSize: "11px" }}>
                        {metaStatusText}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", fontWeight: "600", color: isHuman ? "var(--blue)" : "var(--green)" }}>
                        {createdByText}
                      </span>
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
