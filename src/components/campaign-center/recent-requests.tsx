"use client";

import { CampaignCreationRequest } from "./types";
import { formatArabicDate } from "@/lib/readable-helpers";

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
    <article className="panel" style={{ background: "var(--surface)" }}>
      <h2 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "14px" }}>الطلبات الأخيرة</h2>
      <div className="data-table" style={{ margin: 0 }}>
        {!requests.length ? (
          <div className="empty-state">لا توجد طلبات حملات حالياً.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>تاريخ الطلب</th>
                <th>رابط المنشور</th>
                <th>الوجهة المستهدفة</th>
                <th>الحساب الإعلاني</th>
                <th>الميزانية المقترحة</th>
                <th>وضع التنفيذ</th>
                <th>الحالة</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const statusInfo = translateStatus(req.status);
                return (
                  <tr
                    key={req.id}
                    style={{
                      background: activeRequestId === req.id ? "rgba(59,130,246,0.06)" : undefined,
                    }}
                  >
                    <td>
                      <span className="ltr-val" style={{ fontSize: "12.5px" }}>{formatArabicDate(req.created_at)}</span>
                    </td>
                    <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <a href={req.source_post_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--blue)", textDecoration: "underline", fontSize: "12.5px" }} className="ltr-val">
                        {req.source_post_url}
                      </a>
                    </td>
                    <td>
                      <span className="badge badge--neutral" style={{ fontSize: "11px" }}>
                        {req.destination_type.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>
                        {req.meta_ad_accounts?.name || req.target_meta_account_id || "—"}
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
                      <button
                        type="button"
                        className="sync-button"
                        onClick={() => onSelectRequest(req)}
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                      >
                        عرض ومتابعة
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
