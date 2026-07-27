"use client";

import { useState } from "react";
import { Edit2, Trash2, ExternalLink, Copy, Check, Power, ShieldCheck } from "lucide-react";
import type { AdPauseException } from "@/types/ad-exceptions";
import { AdExceptionBadge, AdExceptionStatusBadge } from "./AdExceptionBadge";

interface AdExceptionsTableProps {
  items: AdPauseException[];
  onEdit: (item: AdPauseException) => void;
  onDelete: (item: AdPauseException) => void;
  onToggleActive: (item: AdPauseException) => void;
}

export function AdExceptionsTable({
  items,
  onEdit,
  onDelete,
  onToggleActive,
}: AdExceptionsTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyMetaAdId = (metaAdId: string) => {
    navigator.clipboard.writeText(metaAdId);
    setCopiedId(metaAdId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      {/* Desktop & Tablet Table */}
      <div className="data-table-wrapper">
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>اسم الإعلان</th>
                <th>الحساب الإعلاني</th>
                <th>Meta Ad ID</th>
                <th>نوع الاستثناء</th>
                <th>الحد المخصص</th>
                <th>السبب</th>
                <th>الحالة</th>
                <th>تاريخ الإضافة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const accountName = item.meta_ad_accounts?.name || "—";
                const isNeverPause = item.exception_mode === "never_pause";
                const formattedLimit = isNeverPause || item.custom_cost_per_conversation === null
                  ? "—"
                  : `$${Number(item.custom_cost_per_conversation).toFixed(2)}`;

                return (
                  <tr key={item.id}>
                    {/* Ad Name */}
                    <td className="account-name-cell">
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontWeight: 600 }}>{item.ad_name || "—"}</span>
                        {item.ad_url && (
                          <a
                            href={item.ad_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: "11px",
                              color: "var(--blue)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              marginTop: "2px",
                              textDecoration: "none"
                            }}
                          >
                            <span>فتح رابط الإعلان</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Ad Account */}
                    <td>
                      <span style={{ fontSize: "13px" }}>{accountName}</span>
                    </td>

                    {/* Meta Ad ID */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="ltr-val" style={{ fontFamily: "monospace", fontSize: "12px" }}>
                          {item.meta_ad_id}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyMetaAdId(item.meta_ad_id)}
                          title="نسخ Meta Ad ID"
                          style={{
                            background: "transparent",
                            border: "1px solid var(--border)",
                            color: copiedId === item.meta_ad_id ? "var(--green)" : "var(--muted)",
                            borderRadius: "4px",
                            padding: "2px 5px",
                            cursor: "pointer",
                            display: "grid",
                            placeItems: "center"
                          }}
                        >
                          {copiedId === item.meta_ad_id ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                      </div>
                    </td>

                    {/* Exception Mode */}
                    <td>
                      <AdExceptionBadge mode={item.exception_mode} customLimit={item.custom_cost_per_conversation} />
                    </td>

                    {/* Custom Limit */}
                    <td>
                      {isNeverPause ? (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      ) : (
                        <strong className="ltr-val" style={{ color: "var(--foreground)", fontSize: "13.5px" }}>
                          {formattedLimit}
                        </strong>
                      )}
                    </td>

                    {/* Reason */}
                    <td style={{ maxWidth: "200px", whiteSpace: "normal" }}>
                      <span
                        title={item.reason || undefined}
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          fontSize: "12.5px",
                          color: "var(--muted)"
                        }}
                      >
                        {item.reason || "—"}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <AdExceptionStatusBadge isActive={item.is_active} />
                    </td>

                    {/* Created Date */}
                    <td>
                      <span className="ltr-val" style={{ fontSize: "12px" }}>
                        {formatDate(item.created_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => onToggleActive(item)}
                          title={item.is_active ? "تعطيل الاستثناء" : "تفعيل الاستثناء"}
                          style={{
                            background: "var(--surface-soft)",
                            border: "1px solid var(--border)",
                            color: item.is_active ? "var(--green)" : "var(--muted)",
                            borderRadius: "6px",
                            padding: "6px 8px",
                            fontSize: "12px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Power size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          title="تعديل"
                          style={{
                            background: "var(--surface-soft)",
                            border: "1px solid var(--border)",
                            color: "var(--blue)",
                            borderRadius: "6px",
                            padding: "6px 8px",
                            fontSize: "12px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(item)}
                          title="حذف"
                          style={{
                            background: "var(--red-soft)",
                            border: "1px solid var(--red)",
                            color: "var(--red)",
                            borderRadius: "6px",
                            padding: "6px 8px",
                            fontSize: "12px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards Layout */}
      <div className="mobile-cards-list">
        {items.map((item) => {
          const accountName = item.meta_ad_accounts?.name || "—";
          const isNeverPause = item.exception_mode === "never_pause";
          const formattedLimit = isNeverPause || item.custom_cost_per_conversation === null
            ? "—"
            : `$${Number(item.custom_cost_per_conversation).toFixed(2)}`;

          return (
            <article key={item.id} className="mobile-card">
              <div className="mobile-card-row">
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: 1 }}>
                  <span className="mobile-card-title">{item.ad_name || "إعلان غير مسمى"}</span>
                  <span className="mobile-card-subtitle">{accountName}</span>
                </div>
                <AdExceptionStatusBadge isActive={item.is_active} />
              </div>

              <div className="mobile-card-divider" />

              <div className="mobile-card-row">
                <span className="mobile-card-label">Meta Ad ID</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span className="mobile-card-val ltr-val" style={{ fontFamily: "monospace", fontSize: "11px" }}>
                    {item.meta_ad_id}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyMetaAdId(item.meta_ad_id)}
                    style={{ background: "none", border: 0, color: "var(--muted)", cursor: "pointer" }}
                  >
                    {copiedId === item.meta_ad_id ? <Check size={12} style={{ color: "var(--green)" }} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div className="mobile-card-row">
                <span className="mobile-card-label">نوع الاستثناء</span>
                <AdExceptionBadge mode={item.exception_mode} customLimit={item.custom_cost_per_conversation} />
              </div>

              <div className="mobile-card-row">
                <span className="mobile-card-label">الحد المخصص</span>
                <strong className="mobile-card-val ltr-val">{formattedLimit}</strong>
              </div>

              {item.reason && (
                <div className="mobile-card-row">
                  <span className="mobile-card-label">السبب</span>
                  <span className="mobile-card-val" style={{ fontSize: "12px", color: "var(--muted)" }}>{item.reason}</span>
                </div>
              )}

              <div className="mobile-card-row">
                <span className="mobile-card-label">تاريخ الإضافة</span>
                <span className="mobile-card-val ltr-val">{formatDate(item.created_at)}</span>
              </div>

              <div className="mobile-card-divider" />

              {/* Action Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: item.ad_url ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => onToggleActive(item)}
                  className="mobile-card-btn"
                  style={{ color: item.is_active ? "var(--green)" : "var(--muted)" }}
                >
                  {item.is_active ? "تعطيل" : "تفعيل"}
                </button>

                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="mobile-card-btn"
                  style={{ color: "var(--blue)" }}
                >
                  تعديل
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className="mobile-card-btn"
                  style={{ color: "var(--red)" }}
                >
                  حذف
                </button>

                {item.ad_url && (
                  <a
                    href={item.ad_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mobile-card-btn"
                    style={{ textDecoration: "none", display: "grid", placeItems: "center" }}
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
