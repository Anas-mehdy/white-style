"use client";
import { useMemo, useState } from "react";
import { PageHeader, Table } from "@/components/dashboard";
type RecordRow=Record<string, unknown>;
function value(value:unknown){return value === null || value === undefined || value === "" ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value)}
function name(row:RecordRow){const account=row.meta_ad_accounts as {name?:string}|null; return account?.name ?? "—"}
export function AccountsPage({accounts}:{accounts:Parameters<typeof Table>[0]["accounts"]}){const [q,setQ]=useState("");const [status,setStatus]=useState("all");const rows=useMemo(()=>accounts.filter(a=>(status==="all"||a.connection_status===status)&&`${a.name} ${a.meta_account_id}`.toLowerCase().includes(q.toLowerCase())),[accounts,q,status]);return <><PageHeader title="الحسابات الإعلانية"/><div className="filters"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="ابحث بالاسم أو Meta ID"/><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">كل الحالات</option><option value="connected">connected</option><option value="pending">pending</option><option value="error">error</option></select></div><article className="panel"><Table accounts={rows}/></article></>}
export function DecisionsPage({rows}:{rows:RecordRow[]}){const [q,setQ]=useState("");const [decision,setDecision]=useState("all");const shown=useMemo(()=>rows.filter(r=>(decision==="all"||r.decision===decision)&&`${r.reason} ${name(r)}`.toLowerCase().includes(q.toLowerCase())),[rows,q,decision]);return <><PageHeader title="قرارات Agent"/><div className="filters"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث في السبب أو الحساب"/><select value={decision} onChange={e=>setDecision(e.target.value)}><option value="all">كل القرارات</option>{[...new Set(rows.map(r=>String(r.decision)))].map(x=><option key={x}>{x}</option>)}</select></div><DataTable empty="لا توجد قرارات Agent حتى الآن." headers={["القرار","الحساب","السبب","الثقة","الحالة","وقت الإنشاء","وقت التنفيذ","النتيجة"]} rows={shown.map(r=>[r.decision,name(r),r.reason,`${r.confidence}%`,(r.agent_actions as RecordRow[]|undefined)?.[0]?.status,new Date(String(r.created_at)).toLocaleString("ar"),(r.agent_actions as RecordRow[]|undefined)?.[0]?.executed_at,(r.agent_actions as RecordRow[]|undefined)?.[0]?.error_message ?? (r.agent_actions as RecordRow[]|undefined)?.[0]?.verified_state])}/></>}
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
                    const totalSec = Math.round(durationMs / 1000);
                    if (totalSec < 60) {
                      durationStr = `${totalSec} ثانية`;
                    } else {
                      const min = Math.floor(totalSec / 60);
                      const sec = totalSec % 60;
                      durationStr = `${min} د ${sec} ث`;
                    }
                  }
                }

                // Status Badge styling
                let badgeClass = "badge--neutral";
                let badgeText = resolvedStatus;

                if (resolvedStatus === "succeeded") {
                  if (isInconsistent) {
                    badgeClass = "badge--warning";
                    badgeText = "غير متسق ⚠️";
                  } else {
                    badgeClass = "badge--success";
                    badgeText = "ناجح";
                  }
                } else if (resolvedStatus === "failed") {
                  badgeClass = "badge--danger";
                  badgeText = "فاشل";
                } else if (resolvedStatus === "running") {
                  badgeClass = "badge--info";
                  badgeText = "جاري";
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
                const isExpanded = expandedErrors[id] || false;

                return (
                  <tr key={id}>
                    <td>{String(r.source)}</td>
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
                          <span className="ltr-val">{durationStr}</span>
                          <span className="badge badge--warning" style={{ fontSize: "8px", padding: "2px 6px" }}>معلق</span>
                        </div>
                      ) : (
                        <span className="ltr-val">{durationStr}</span>
                      )}
                    </td>
                    <td>
                      <span className="ltr-val">
                        {r.records_processed !== null && r.records_processed !== undefined ? formatNumber(Number(r.records_processed)) : "—"}
                      </span>
                    </td>
                    <td>
                      <div className="counts-grid">
                        <span className="counts-badge">
                          Campaigns: <b>{campaigns}</b>
                        </span>
                        <span className="counts-badge">
                          Ad Sets: <b>{adsets}</b>
                        </span>
                        <span className="counts-badge">
                          Ads: <b>{ads}</b>
                        </span>
                        <span className="counts-badge">
                          Insights: <b>{insights}</b>
                        </span>
                      </div>
                    </td>
                    <td className="error-summary-cell">
                      {errorSummary ? (
                        <div>
                          <span style={{ fontSize: "11px" }}>
                            {errorSummary.length > 60 && !isExpanded ? `${errorSummary.slice(0, 60)}...` : errorSummary}
                          </span>
                          {errorSummary.length > 60 && (
                            <button className="error-toggle" onClick={() => toggleError(id)}>
                              {isExpanded ? "عرض أقل" : "عرض التفاصيل الكاملة"}
                            </button>
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
export function SafetyPage({rows}:{rows:RecordRow[]}){return <><PageHeader title="قواعد الحماية"/>{!rows.length?<article className="panel empty-state">لا توجد إعدادات حماية. أنشئ صفًا في agent_configs لإدارة Autopilot وحدوده.</article>:rows.map(r=><article className="panel settings-card" key={String(r.id)}><h2>{name(r) === "—" ? "إعدادات المنظمة الافتراضية" : name(r)}</h2><dl><dt>Autopilot</dt><dd>{value(r.mode)}</dd><dt>Kill switch</dt><dd>{r.kill_switch ? "مفعّل" : "غير مفعّل"}</dd><dt>أقصى زيادة للميزانية</dt><dd>{value(r.max_budget_change_percent)}%</dd><dt>الحد اليومي للزيادة</dt><dd>{value(r.daily_total_increase_percent)}%</dd><dt>الحد الأدنى لعمر الإعلان</dt><dd>لا يوجد عمود مخصص في schema</dd><dt>عتبة CPA الضعيف</dt><dd>{value(r.poor_cost_multiple)}× المعيار</dd><dt>عتبة إنفاق بلا نتائج</dt><dd>{value(r.no_result_pause_multiple)}× المعيار</dd></dl></article>)}</>}
export function SettingsPage({accounts,configs}:{accounts:RecordRow[];configs:RecordRow[]}){return <><PageHeader title="الإعدادات"/><article className="panel settings-card"><h2>الاتصال والحسابات</h2><p>تُقرأ بيانات الاتصال من Supabase. لا تُعرض مفاتيح API أو Meta tokens في الواجهة.</p><dl><dt>الحسابات</dt><dd>{accounts.length}</dd><dt>الحسابات المتصلة</dt><dd>{accounts.filter(x=>x.connection_status==="connected").length}</dd><dt>إعدادات Agent</dt><dd>{configs.length}</dd></dl></article></>}
function DataTable({headers,rows,empty}:{headers:string[];rows:unknown[][];empty:string}){return <article className="panel"><div className="data-table">{!rows.length?<div className="empty-state">{empty}</div>:<table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{value(c)}</td>)}</tr>)}</tbody></table>}</div></article>}
