"use client";
import { useMemo, useState } from "react";
import { PageHeader, Table } from "@/components/dashboard";
type RecordRow=Record<string, unknown>;
function value(value:unknown){return value === null || value === undefined || value === "" ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value)}
function name(row:RecordRow){const account=row.meta_ad_accounts as {name?:string}|null; return account?.name ?? "—"}
export function AccountsPage({accounts}:{accounts:Parameters<typeof Table>[0]["accounts"]}){const [q,setQ]=useState("");const [status,setStatus]=useState("all");const rows=useMemo(()=>accounts.filter(a=>(status==="all"||a.connection_status===status)&&`${a.name} ${a.meta_account_id}`.toLowerCase().includes(q.toLowerCase())),[accounts,q,status]);return <><PageHeader title="الحسابات الإعلانية"/><div className="filters"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="ابحث بالاسم أو Meta ID"/><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">كل الحالات</option><option value="connected">connected</option><option value="pending">pending</option><option value="error">error</option></select></div><article className="panel"><Table accounts={rows}/></article></>}
export function DecisionsPage({rows}:{rows:RecordRow[]}){const [q,setQ]=useState("");const [decision,setDecision]=useState("all");const formatDecision = (dec: unknown) => {
  const d = String(dec);
  if (d === "hold") return "إبقاء الميزانية";
  if (d === "watch") return "مراقبة";
  if (d === "pause") return "إيقاف الإعلان";
  if (d === "decrease_budget") return "خفض الميزانية";
  if (d === "increase_budget") return "زيادة الميزانية";
  return d;
};
const formatActionStatus = (status: unknown) => {
  if (!status) return "—";
  const s = String(status);
  if (s === "queued") return "في الانتظار";
  if (s === "executing") return "جاري التنفيذ";
  if (s === "verified") return "مؤكد";
  if (s === "failed") return "فشل";
  if (s === "rolled_back") return "تم التراجع";
  if (s === "skipped") return "تم التخطي";
  return s;
};
const shown=useMemo(()=>rows.filter(r=>(decision==="all"||r.decision===decision)&&`${r.reason} ${name(r)}`.toLowerCase().includes(q.toLowerCase())),[rows,q,decision]);if (!rows.length) {
  return (
    <>
      <PageHeader title="قرارات Agent" />
      <article className="panel" style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--amber-soft)", color: "var(--amber)", padding: "6px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", marginBottom: "20px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "currentColor" }}></span>
          محرك القرارات غير مفعّل
        </div>
        <h2 style={{ fontSize: "16px", marginBottom: "12px", fontWeight: "600" }}>لم يصدر Agent أي قرارات حتى الآن.</h2>
        <p style={{ color: "var(--muted)", fontSize: "12px", maxWidth: "480px", margin: "0 auto 20px", lineHeight: "1.6" }}>
          ستظهر هنا القرارات المقترحة أو المنفذة مثل:
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 auto", maxWidth: "320px", textAlign: "right", fontSize: "12px", color: "var(--muted)", display: "grid", gap: "8px" }}>
          <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "var(--green)" }}>•</span> إيقاف إعلان ضعيف.
          </li>
          <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "var(--green)" }}>•</span> خفض الميزانية.
          </li>
          <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "var(--green)" }}>•</span> زيادة ميزانية إعلان فعّال.
          </li>
          <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "var(--green)" }}>•</span> الاستمرار في المراقبة.
          </li>
        </ul>
      </article>
    </>
  );
}
return <><PageHeader title="قرارات Agent"/><div className="filters"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث في السبب أو الحساب"/><select value={decision} onChange={e=>setDecision(e.target.value)}><option value="all">كل القرارات</option>{[...new Set(rows.map(r=>String(r.decision)))].map(x=><option key={x} value={x}>{formatDecision(x)}</option>)}</select></div><DataTable empty="لا توجد قرارات مطابقة للبحث." headers={["القرار","الحساب","السبب","الثقة","الحالة","وقت الإنشاء","وقت التنفيذ","النتيجة"]} rows={shown.map(r=>{const action = (r.agent_actions as RecordRow[]|undefined)?.[0]; return [formatDecision(r.decision),name(r),r.reason,`${r.confidence}%`,formatActionStatus(action?.status),new Date(String(r.created_at)).toLocaleString("ar-EG", { hour12: false }),action?.executed_at ? new Date(String(action.executed_at)).toLocaleString("ar-EG", { hour12: false }) : "—",action?.error_message ?? action?.verified_state ?? "—"];})}/></>}

export function ExecutionPage({ rows }: { rows: RecordRow[] }) {
  const [expandedErrors, setExpandedErrors] = useState<Record<string, boolean>>({});
  const [now] = useState(() => Date.now());

  const toggleError = (id: string) => {
    setExpandedErrors((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const formatNumber = (n: number) => {
    return new Intl.NumberFormat("en-US").format(n);
  };

  const formatSource = (src: unknown) => {
    const s = String(src);
    if (s === "meta_api") return "واجهة Meta";
    if (s === "csv") return "ملف CSV";
    if (s === "mock") return "بيانات تجريبية";
    return s;
  };

  const isEnglishOrTechnical = (text: string) => {
    const arabicRegex = /[\u0600-\u06FF]/;
    return !arabicRegex.test(text) || text.includes("{") || text.includes(":") || text.includes("/");
  };

  const formatDuration = (ms: number) => {
    const totalSec = Math.round(ms / 1000);
    if (totalSec < 0) return "—";
    if (totalSec < 60) {
      return `${totalSec} ث`;
    }
    const totalMin = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    if (totalMin < 60) {
      return `${totalMin} د ${sec} ث`;
    }
    const hours = Math.floor(totalMin / 60);
    const min = totalMin % 60;
    return `${hours} س ${min} د ${sec} ث`;
  };

  return (
    <>
      <PageHeader title="سجل التنفيذ" />
      <div className="data-table">
        {!rows.length ? (
          <div className="empty-state">لا توجد عمليات مزامنة أو تنفيذ.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>المصدر</th>
                <th>الحساب</th>
                <th>الحالة</th>
                <th>بدأ</th>
                <th>انتهى</th>
                <th>المدة</th>
                <th>السجلات</th>
                <th>العدادات</th>
                <th>الخطأ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const id = String(r.id);
                const status = String(r.status);
                const startedAtStr = r.started_at ? String(r.started_at) : null;
                const finishedAtStr = r.finished_at ? String(r.finished_at) : null;

                const startedAt = startedAtStr ? new Date(startedAtStr).getTime() : null;
                const finishedAt = finishedAtStr ? new Date(finishedAtStr).getTime() : null;

                let resolvedStatus = status;
                let isStalled = false;
                let isInconsistent = false;

                if (status === "running" && startedAt) {
                  const elapsedMin = (now - startedAt) / 60000;
                  if (elapsedMin > 20) {
                    resolvedStatus = "stuck";
                    isStalled = true;
                  }
                }

                if (status === "succeeded" && !finishedAt) {
                  isInconsistent = true;
                }

                // Calculate duration
                let durationStr = "—";
                if (startedAt) {
                  let durationMs = 0;
                  if (finishedAt) {
                    durationMs = finishedAt - startedAt;
                  } else if (resolvedStatus === "running" || isStalled) {
                    durationMs = now - startedAt;
                  }

                  if (durationMs >= 0) {
                    durationStr = formatDuration(durationMs);
                  }
                }

                // Status Badge styling
                let badgeClass = "badge--neutral";
                let badgeText = resolvedStatus;

                if (resolvedStatus === "succeeded") {
                  if (isInconsistent) {
                    badgeClass = "badge--warning";
                    badgeText = "حالة غير متسقة";
                  } else {
                    badgeClass = "badge--success";
                    badgeText = "ناجح";
                  }
                } else if (resolvedStatus === "failed") {
                  badgeClass = "badge--danger";
                  badgeText = "فاشل";
                } else if (resolvedStatus === "running") {
                  badgeClass = "badge--info";
                  badgeText = "قيد التشغيل";
                } else if (resolvedStatus === "stuck") {
                  badgeClass = "badge--warning";
                  badgeText = "معلق";
                }

                // Safe parsing of counts
                const cursorState = r.cursor_state && typeof r.cursor_state === "object" ? (r.cursor_state as Record<string, unknown>) : null;
                const counts = cursorState && typeof cursorState.counts === "object" ? (cursorState.counts as Record<string, unknown>) : null;

                const getCountStr = (val: unknown) => {
                  return val !== undefined && val !== null ? String(val) : "—";
                };

                const campaigns = counts ? getCountStr(counts.campaigns ?? counts.campaign_count ?? counts.campaigns_processed) : "—";
                const adsets = counts ? getCountStr(counts.adsets ?? counts.ad_sets ?? counts.adset_count ?? counts.ad_sets_processed) : "—";
                const ads = counts ? getCountStr(counts.ads ?? counts.ad_count ?? counts.ads_processed) : "—";
                const insights = counts ? getCountStr(counts.insights ?? counts.insight_count ?? counts.insights_processed) : "—";

                const errorSummary = r.error_summary ? String(r.error_summary) : null;
                let displayError = errorSummary;
                if (errorSummary === "Stale test execution closed after workflow repair") {
                  displayError = "تم إغلاق تنفيذ تجريبي قديم بعد إصلاح سير العمل";
                }
                const isExpanded = expandedErrors[id] || false;

                return (
                  <tr key={id}>
                    <td>{formatSource(r.source)}</td>
                    <td className="account-name-cell">{name(r)}</td>
                    <td>
                      <span className={`badge ${badgeClass}`}>{badgeText}</span>
                    </td>
                    <td>
                      <span className="ltr-val">{formatDateTime(startedAtStr)}</span>
                    </td>
                    <td>
                      {isInconsistent ? (
                        <span className="badge badge--warning" style={{ fontSize: "10px" }}>تنبيه: لا يوجد وقت انتهاء</span>
                      ) : (
                        <span className="ltr-val">{formatDateTime(finishedAtStr)}</span>
                      )}
                    </td>
                    <td>
                      {isStalled ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span dir="ltr" style={{ display: "inline-block" }}>{durationStr}</span>
                          <span className="badge badge--warning" style={{ fontSize: "8px", padding: "2px 6px" }}>معلق</span>
                        </div>
                      ) : (
                        <span dir="ltr" style={{ display: "inline-block" }}>{durationStr}</span>
                      )}
                    </td>
                    <td>
                      <span className="ltr-val">
                        {r.records_processed !== null && r.records_processed !== undefined ? formatNumber(Number(r.records_processed)) : "—"}
                      </span>
                    </td>
                    <td>
                      <div className="counts-grid">
                        <span className="counts-badge" title="Campaigns">
                          الحملات: <b>{campaigns}</b>
                        </span>
                        <span className="counts-badge" title="Ad Sets">
                          المجموعات الإعلانية: <b>{adsets}</b>
                        </span>
                        <span className="counts-badge" title="Ads">
                          الإعلانات: <b>{ads}</b>
                        </span>
                        <span className="counts-badge" title="Insights">
                          سجلات الأداء: <b>{insights}</b>
                        </span>
                      </div>
                    </td>
                    <td className="error-summary-cell">
                      {displayError ? (
                        <div>
                          <span style={{ fontSize: "11px" }}>
                            {displayError.length > 60 && !isExpanded ? `${displayError.slice(0, 60)}...` : displayError}
                          </span>
                          {displayError.length > 60 && (
                            <button className="error-toggle" onClick={() => toggleError(id)}>
                              {isExpanded ? "عرض أقل" : "عرض التفاصيل الكاملة"}
                            </button>
                          )}
                          {isExpanded && (
                            <div className="error-details" dir={isEnglishOrTechnical(displayError) ? "ltr" : "rtl"} style={{ textAlign: isEnglishOrTechnical(displayError) ? "left" : "right" }}>
                              {displayError}
                            </div>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export function SafetyPage({ rows }: { rows: RecordRow[] }) {
  if (!rows.length) {
    return (
      <>
        <PageHeader title="قواعد الحماية" />
        <article className="panel empty-state">
          لا توجد إعدادات حماية. أنشئ صفًا في agent_configs لإدارة Autopilot وحدوده.
        </article>
      </>
    );
  }

  return (
    <>
      <PageHeader title="قواعد الحماية" />
      {rows.map((r) => {
        const configName = name(r) === "—" ? "إعدادات المنظمة الافتراضية" : name(r);
        
        // Autopilot display
        const mode = r.mode ? String(r.mode) : "paused";
        let autopilotText = "غير مفعّل";
        let autopilotBadge = "badge--neutral";
        if (mode === "autopilot") {
          autopilotText = "مفعّل (Autopilot)";
          autopilotBadge = "badge--connected";
        } else if (mode === "observe") {
          autopilotText = "وضع المراقبة فقط";
          autopilotBadge = "badge--info";
        }

        // Kill Switch display
        const killSwitch = !!r.kill_switch;
        const killSwitchText = killSwitch ? "مفعّل" : "غير مفعّل";
        const killSwitchBadge = killSwitch ? "badge--failed" : "badge--neutral";

        return (
          <article className="panel settings-card" key={String(r.id)} style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "600", borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "20px" }}>
              {configName}
            </h2>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              
              <div style={{ background: "var(--surface-soft)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--muted)", fontSize: "11px", marginBottom: "6px" }}>Autopilot</div>
                <span className={`badge ${autopilotBadge}`} style={{ fontSize: "12px", padding: "6px 12px" }}>
                  {autopilotText}
                </span>
              </div>

              <div style={{ background: "var(--surface-soft)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--muted)", fontSize: "11px", marginBottom: "6px" }}>Kill switch</div>
                <span className={`badge ${killSwitchBadge}`} style={{ fontSize: "12px", padding: "6px 12px" }}>
                  {killSwitchText}
                </span>
              </div>

              <div style={{ background: "var(--surface-soft)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--muted)", fontSize: "11px", marginBottom: "6px" }}>أقصى زيادة للميزانية</div>
                <strong className="ltr-val" style={{ fontSize: "16px", color: "var(--foreground)", display: "block" }}>
                  {r.max_budget_change_percent !== null && r.max_budget_change_percent !== undefined ? `${String(r.max_budget_change_percent)}%` : "لم يتم ضبطه بعد"}
                </strong>
              </div>

              <div style={{ background: "var(--surface-soft)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--muted)", fontSize: "11px", marginBottom: "6px" }}>الحد اليومي للزيادة</div>
                <strong className="ltr-val" style={{ fontSize: "16px", color: "var(--foreground)", display: "block" }}>
                  {r.daily_total_increase_percent !== null && r.daily_total_increase_percent !== undefined ? `${String(r.daily_total_increase_percent)}%` : "لم يتم ضبطه بعد"}
                </strong>
              </div>

              <div style={{ background: "var(--surface-soft)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--muted)", fontSize: "11px", marginBottom: "6px" }}>الحد الأدنى لعمر الإعلان</div>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--muted)", display: "block" }}>غير محدد</span>
              </div>

              <div style={{ background: "var(--surface-soft)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--muted)", fontSize: "11px", marginBottom: "6px" }}>عتبة CPA الضعيف</div>
                <strong style={{ fontSize: "15px", color: "var(--foreground)", display: "block" }}>
                  {r.poor_cost_multiple !== null && r.poor_cost_multiple !== undefined ? (
                    <>
                      <span className="ltr-val" style={{ fontFamily: "inherit" }}>{String(r.poor_cost_multiple)}</span>× المعيار
                    </>
                  ) : "لم يتم ضبطه بعد"}
                </strong>
              </div>

              <div style={{ background: "var(--surface-soft)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--muted)", fontSize: "11px", marginBottom: "6px" }}>عتبة إنفاق بلا نتائج</div>
                <strong style={{ fontSize: "15px", color: "var(--foreground)", display: "block" }}>
                  {r.no_result_pause_multiple !== null && r.no_result_pause_multiple !== undefined ? (
                    <>
                      <span className="ltr-val" style={{ fontFamily: "inherit" }}>{String(r.no_result_pause_multiple)}</span>× المعيار
                    </>
                  ) : "لم يتم ضبطه بعد"}
                </strong>
              </div>

            </div>
          </article>
        );
      })}
    </>
  );
}
export function SettingsPage({accounts,configs}:{accounts:RecordRow[];configs:RecordRow[]}){return <><PageHeader title="الإعدادات"/><article className="panel settings-card"><h2>الاتصال والحسابات</h2><p>تُقرأ بيانات الاتصال من Supabase. لا تُعرض مفاتيح API أو Meta tokens في الواجهة.</p><dl><dt>الحسابات</dt><dd>{accounts.length}</dd><dt>الحسابات المتصلة</dt><dd>{accounts.filter(x=>x.connection_status==="connected").length}</dd><dt>إعدادات Agent</dt><dd>{configs.length}</dd></dl></article></>}
function DataTable({headers,rows,empty}:{headers:string[];rows:unknown[][];empty:string}){return <article className="panel"><div className="data-table">{!rows.length?<div className="empty-state">{empty}</div>:<table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{value(c)}</td>)}</tr>)}</tbody></table>}</div></article>}
