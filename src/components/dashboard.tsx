"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, BrainCircuit, LayoutDashboard, RefreshCw, Settings2, ShieldCheck, Target } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AccountRow, ChartPoint } from "@/lib/dashboard-data";

const nav = [
  ["/dashboard", "نظرة عامة", LayoutDashboard],
  ["/accounts", "الحسابات الإعلانية", Target],
  ["/agent-decisions", "قرارات Agent", BrainCircuit],
  ["/execution-log", "سجل التنفيذ", Activity],
  ["/safety-rules", "قواعد الحماية", ShieldCheck],
  ["/settings", "الإعدادات", Settings2],
] as const;

const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);

const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-US").format(n);

export function Shell({ children }: { children: React.ReactNode }) {
  const p = usePathname();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">WS</div>
          <div>
            <strong>White Style</strong>
            <span>Smart Agent</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {nav.map(([h, l, I]) => (
            <Link
              key={h}
              href={h}
              className={p === h ? "nav-item nav-item--active" : "nav-item"}
            >
              <I size={19} />
              <span>{l}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

export function PageHeader({ title }: { title: string }) {
  const r = useRouter();
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <button className="sync-button" onClick={() => r.refresh()}>
        <RefreshCw size={16} />
        تحديث الصفحة
      </button>
    </header>
  );
}

function Chart({ points, loading }: { points: ChartPoint[]; loading: boolean }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  if (!points || !points.length) {
    return <div className="empty-state">لا توجد بيانات أداء.</div>;
  }

  // Filter out incomplete today's data if it is zero
  const todayStr = new Date().toISOString().slice(0, 10);
  const filteredPoints = points.filter((p, idx) => {
    if (idx === points.length - 1) {
      if (p.date === todayStr && p.spend === 0 && p.conversations === 0) {
        return false;
      }
    }
    return true;
  });

  const activePoints = filteredPoints.length > 0 ? filteredPoints : points;

  const spends = activePoints.map((x) => x.spend);
  const convs = activePoints.map((x) => x.conversations);

  const maxSpend = Math.max(...spends, 0);
  const maxConv = Math.max(...convs, 0);

  // Scaled max to prevent lines touching the top of the chart
  const maxSpendScaled = maxSpend > 0 ? Math.ceil(maxSpend * 1.1) : 100;
  const maxConvScaled = maxConv > 0 ? Math.ceil(maxConv * 1.1) : 10;

  // viewBox is 500x220. Margins: Left: 65, Right: 65, Top: 25, Bottom: 35
  const marginL = 65;
  const marginR = 65;
  const marginT = 25;
  const marginB = 35;
  const plotW = 500 - marginL - marginR;
  const plotH = 220 - marginT - marginB;

  const getX = (idx: number) => {
    if (activePoints.length <= 1) return marginL + plotW / 2;
    return marginL + (idx / (activePoints.length - 1)) * plotW;
  };

  const getYSpend = (val: number) => {
    return marginT + plotH - (val / maxSpendScaled) * plotH;
  };

  const getYConv = (val: number) => {
    return marginT + plotH - (val / maxConvScaled) * plotH;
  };

  // SVG Paths
  let spendPath = "";
  let convPath = "";

  if (activePoints.length === 1) {
    const x = getX(0);
    const ys = getYSpend(activePoints[0].spend);
    const yc = getYConv(activePoints[0].conversations);
    spendPath = `M ${x - 10} ${ys} L ${x + 10} ${ys}`;
    convPath = `M ${x - 10} ${yc} L ${x + 10} ${yc}`;
  } else {
    spendPath = activePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getYSpend(p.spend)}`).join(" ");
    convPath = activePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getYConv(p.conversations)}`).join(" ");
  }

  const gridLevels = [0, 0.33, 0.66, 1];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || activePoints.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * 500;
    const percent = (relX - marginL) / plotW;
    const index = Math.round(percent * (activePoints.length - 1));
    const clampedIndex = Math.max(0, Math.min(activePoints.length - 1, index));
    setHoveredIndex(clampedIndex);
  };

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
  };

  const formatLongDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Pick ~5 tick marks for X axis
  const labelCount = Math.min(activePoints.length, 5);
  const labelIndices: number[] = [];
  if (activePoints.length > 0) {
    if (activePoints.length <= 5) {
      for (let i = 0; i < activePoints.length; i++) labelIndices.push(i);
    } else {
      for (let i = 0; i < labelCount; i++) {
        labelIndices.push(Math.floor((i / (labelCount - 1)) * (activePoints.length - 1)));
      }
    }
  }

  // Hover data
  const activePoint = hoveredIndex !== null ? activePoints[hoveredIndex] : null;
  const hoverX = hoveredIndex !== null ? getX(hoveredIndex) : 0;
  const hoverYSpend = activePoint ? getYSpend(activePoint.spend) : 0;
  const hoverYConv = activePoint ? getYConv(activePoint.conversations) : 0;

  // Tooltip setup
  let tooltip = null;
  if (activePoint && hoveredIndex !== null) {
    const pct = hoveredIndex / Math.max(activePoints.length - 1, 1);
    const tooltipStyle: React.CSSProperties = {
      position: "absolute",
      top: "10px",
      background: "rgba(16, 26, 22, 0.96)",
      color: "#fff",
      padding: "10px 14px",
      borderRadius: "8px",
      border: "1px solid var(--border)",
      fontSize: "11px",
      pointerEvents: "none",
      zIndex: 20,
      direction: "rtl",
      textAlign: "right",
      minWidth: "150px",
    };

    const leftPct = (marginL / 500) * 100 + pct * ((plotW / 500) * 100);

    if (pct < 0.25) {
      tooltipStyle.left = `calc(${leftPct}% + 12px)`;
    } else if (pct > 0.75) {
      tooltipStyle.right = `calc(${100 - leftPct}% + 12px)`;
    } else {
      tooltipStyle.left = `${leftPct}%`;
      tooltipStyle.transform = "translateX(-50%)";
    }

    tooltip = (
      <div style={tooltipStyle} className="chart-tooltip">
        <div
          style={{
            fontWeight: 600,
            borderBottom: "1px solid rgba(255,255,255,0.15)",
            paddingBottom: "4px",
            marginBottom: "6px",
            fontSize: "10px",
          }}
          className="ltr-val"
        >
          {formatLongDate(activePoint.date)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "4px" }}>
          <span>الإنفاق:</span>
          <strong className="ltr-val" style={{ color: "var(--green)" }}>
            {money(activePoint.spend)}
          </strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
          <span>المحادثات:</span>
          <strong className="ltr-val" style={{ color: "var(--blue)" }}>
            {formatNumber(activePoint.conversations)}
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className={`loading-overlay ${loading ? "loading-overlay--active" : ""}`}>
        <div className="spinner"></div>
      </div>

      {tooltip}

      <svg
        ref={svgRef}
        viewBox="0 0 500 220"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIndex(null)}
        style={{ overflow: "visible" }}
      >
        {/* Y Axis Titles */}
        <text x={marginL - 8} y="15" textAnchor="end" fontSize="9" fontWeight="600" fill="var(--green)">
          الإنفاق (USD)
        </text>
        <text x={500 - marginR + 8} y="15" textAnchor="start" fontSize="9" fontWeight="600" fill="var(--blue)">
          المحادثات
        </text>

        {/* Grid lines and Labels */}
        {gridLevels.map((lvl) => {
          const y = marginT + (1 - lvl) * plotH;
          const spendVal = lvl * maxSpendScaled;
          const convVal = lvl * maxConvScaled;
          return (
            <g key={lvl}>
              <line x1={marginL} y1={y} x2={500 - marginR} y2={y} className="chart-grid-line" />
              {/* Left Y label */}
              <text x={marginL - 8} y={y + 3} textAnchor="end" fontSize="8" fill="var(--muted)">
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(spendVal)}
              </text>
              {/* Right Y label */}
              <text x={500 - marginR + 8} y={y + 3} textAnchor="start" fontSize="8" fill="var(--muted)">
                {Math.round(convVal).toLocaleString("en-US")}
              </text>
            </g>
          );
        })}

        {/* X Axis base line */}
        <line x1={marginL} y1={marginT + plotH} x2={500 - marginR} y2={marginT + plotH} className="chart-axis-line" />

        {/* Lines */}
        {activePoints.length > 0 && (
          <>
            <path d={spendPath} className="chart-line-spend" />
            <path d={convPath} className="chart-line-conv" />
          </>
        )}

        {/* Render dots if single point */}
        {activePoints.length === 1 && (
          <>
            <circle cx={getX(0)} cy={getYSpend(activePoints[0].spend)} r="4" fill="var(--green)" />
            <circle cx={getX(0)} cy={getYConv(activePoints[0].conversations)} r="4" fill="var(--blue)" />
          </>
        )}

        {/* X Axis Labels */}
        {labelIndices.map((idx) => (
          <text
            key={idx}
            x={getX(idx)}
            y={marginT + plotH + 16}
            textAnchor="middle"
            fontSize="8.5"
            fill="var(--muted)"
            className="ltr-val"
          >
            {formatShortDate(activePoints[idx].date)}
          </text>
        ))}

        {/* Hover elements */}
        {hoveredIndex !== null && activePoint && (
          <>
            <line x1={hoverX} y1={marginT} x2={hoverX} y2={marginT + plotH} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={hoverX} cy={hoverYSpend} r="4.5" className="chart-dot-spend" />
            <circle cx={hoverX} cy={hoverYConv} r="4.5" className="chart-dot-conv" />
          </>
        )}
      </svg>

      <div className="chart-legend">
        <div className="chart-legend-item">
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--green)", display: "inline-block" }}></span>
          <span>الإنفاق: <strong>USD</strong></span>
        </div>
        <div className="chart-legend-item">
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--blue)", display: "inline-block" }}></span>
          <span>المحادثات: <strong>عدد المحادثات</strong></span>
        </div>
      </div>
    </div>
  );
}

type Data = Awaited<ReturnType<typeof import("@/lib/dashboard-data").getDashboardData>>;
type Run = {
  status: string;
  started_at: string;
  finished_at: string | null;
  records_processed: number;
  error_summary: string | null;
  counts: unknown;
};

const SYNC_TIMEOUT_MS = 20 * 60 * 1000;
const POLL_INTERVAL_MS = 5000;

export function DashboardClient({ initial }: { initial: Data }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(initial);
  const [syncing, setSyncing] = useState(false);
  const [loadingDays, setLoadingDays] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const controller = useRef<AbortController | null>(null);
  const daysController = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controller.current?.abort();
      daysController.current?.abort();
    };
  }, []);

  async function load(d = days) {
    if (daysController.current) {
      daysController.current.abort();
    }
    const c = new AbortController();
    daysController.current = c;
    setLoadingDays(true);
    try {
      const r = await fetch(`/api/dashboard?days=${d}`, {
        cache: "no-store",
        signal: c.signal,
      });
      if (!r.ok) throw Error();
      const nextData = await r.json();
      setData(nextData);
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        setNotice("تعذر تحميل البيانات للفترة المحددة.");
      }
    } finally {
      if (!c.signal.aborted) {
        setLoadingDays(false);
      }
    }
  }

  async function poll(startedAfter: string) {
    const c = new AbortController();
    controller.current = c;
    const deadline = Date.now() + SYNC_TIMEOUT_MS;
    const notFoundUntil = Date.now() + 120000;

    while (Date.now() < deadline && !c.signal.aborted) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const r = await fetch(`/api/sync/status?started_after=${encodeURIComponent(startedAfter)}`, {
        cache: "no-store",
        signal: c.signal,
      }).catch(() => null);

      if (!r) continue;
      if (r.status === 400) {
        setNotice("تعذر متابعة المزامنة: قيمة وقت البدء غير صالحة.");
        return;
      }
      if (!r.ok) continue;

      const body = await r.json();
      if (body.status === "not_found") {
        setNotice(
          Date.now() < notFoundUntil
            ? "بانتظار إنشاء سجل المزامنة في Supabase..."
            : "لم يظهر سجل المزامنة بعد؛ ستستمر المحاولة في الخلفية حتى انتهاء المهلة."
        );
        continue;
      }

      const run = body.sync_run as Run;
      if (run.status === "running") {
        const min = Math.floor((Date.now() - new Date(run.started_at).getTime()) / 60000);
        setNotice(`جارٍ سحب بيانات Meta وحفظها في Supabase — بدأ ${new Date(run.started_at).toLocaleString("ar")} (${min} دقيقة).`);
        continue;
      }
      if (run.status === "succeeded") {
        await load();
        setNotice(
          `تم تحديث البيانات بنجاح — ${run.records_processed} سجلًا، انتهت ${new Date(
            run.finished_at!
          ).toLocaleString("ar")}، العدّادات: ${JSON.stringify(run.counts ?? {})}.`
        );
        return;
      }
      if (run.status === "failed") {
        setNotice(`فشلت المزامنة: ${run.error_summary ?? "خطأ غير معروف"}`);
        return;
      }
    }
    if (!c.signal.aborted) setNotice("المزامنة ما زالت تعمل في الخلفية. يمكنك متابعة سجل التنفيذ أو تحديث الصفحة لاحقًا.");
  }

  async function sync() {
    if (syncing) return;
    setSyncing(true);
    setNotice("جارٍ مزامنة البيانات...");
    try {
      const requestId = crypto.randomUUID();
      const r = await fetch("/api/sync", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "dashboard", request_id: requestId }),
      });
      const b = await r.json();
      if (r.status === 409) {
        setNotice("المزامنة جارية بالفعل.");
        return;
      }
      const startedAfter = b.started_after;
      if (!r.ok) throw Error(b.error);
      if (typeof startedAfter !== "string" || Number.isNaN(Date.parse(startedAfter))) {
        setNotice("تعذر بدء متابعة المزامنة: لم يُعد الخادم وقت بدء صالحًا.");
        return;
      }
      await poll(startedAfter);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setNotice(e instanceof Error ? e.message : "تعذر بدء المزامنة.");
      }
    } finally {
      setSyncing(false);
      controller.current = null;
    }
  }

  const s = data.stats;
  // Calculate CPR from total sums
  const totalCost = s.conversations ? s.spend / s.conversations : null;

  return (
    <>
      <header className="topbar">
        <h1>نظرة عامة</h1>
        <button disabled={syncing} className="sync-button" onClick={sync}>
          <RefreshCw size={16} />
          {syncing ? "جارٍ مزامنة البيانات..." : "تحديث البيانات"}
        </button>
      </header>

      {notice && <div className="sync-notice">{notice}</div>}

      <section className="metrics-grid">
        {[
          ["الإنفاق", money(s.spend)],
          ["المحادثات", formatNumber(s.conversations)],
          ["تكلفة المحادثة", totalCost === null ? "—" : money(totalCost)],
          ["الحسابات المتصلة", formatNumber(s.connected)],
        ].map(([l, v]) => (
          <article className="metric-card" key={l}>
            <div className="metric-label">{l}</div>
            <strong className="metric-value ltr-val">{v}</strong>
          </article>
        ))}
      </section>

      <article className="panel">
        <div className="period-switch">
          {[7, 14, 30].map((d) => (
            <button
              disabled={syncing || loadingDays}
              key={d}
              className={d === days ? "active" : ""}
              onClick={async () => {
                setDays(d);
                await load(d);
              }}
            >
              {d} يومًا
            </button>
          ))}
        </div>
        <Chart points={data.chart} loading={loadingDays} />
      </article>

      <article className="panel">
        <h2 style={{ marginBottom: "14px", fontSize: "14px", fontWeight: "600" }}>الحسابات الإعلانية النشطة</h2>
        <Table accounts={data.accounts.slice(0, 5)} />
        <Link className="text-button" href="/accounts" style={{ marginTop: "10px", display: "inline-block" }}>
          عرض تفاصيل الحسابات
        </Link>
      </article>
    </>
  );
}

export function Table({ accounts }: { accounts: AccountRow[] }) {
  const formatLastSynced = (dateStr: string | null, timezone?: string) => {
    if (!dateStr) return "لم تتم المزامنة";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "لم تتم المزامنة";
    try {
      return d.toLocaleString("en-US", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: timezone || undefined,
      });
    } catch {
      return d.toLocaleString("en-US", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
  };

  return (
    <div className="data-table">
      {!accounts.length ? (
        <div className="empty-state">لا توجد حسابات.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>اسم الحساب</th>
              <th>الحالة</th>
              <th>الإنفاق</th>
              <th>المحادثات</th>
              <th>تكلفة المحادثة</th>
              <th>آخر مزامنة</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => {
              const isPending = a.connection_status === "pending";
              const isConnected = a.connection_status === "connected";

              let badgeClass = "badge--failed";
              let badgeText = a.connection_status;

              if (isConnected) {
                badgeClass = "badge--connected";
                badgeText = "متصل";
              } else if (isPending) {
                badgeClass = "badge--pending";
                badgeText = "قيد الانتظار";
              } else {
                badgeText = "فشل الاتصال";
              }

              return (
                <tr key={a.id}>
                  <td className="account-name-cell">
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontWeight: 600 }}>{a.name}</span>
                      <span className="ltr-val" style={{ fontSize: "10px", color: "var(--muted)", alignSelf: "flex-start" }}>
                        {a.meta_account_id}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${badgeClass}`}>{badgeText}</span>
                  </td>
                  <td>
                    {isPending ? (
                      "—"
                    ) : (
                      <strong className="ltr-val">{money(a.spend)}</strong>
                    )}
                  </td>
                  <td>
                    {isPending ? (
                      "—"
                    ) : (
                      <span className="ltr-val">{formatNumber(a.conversations)}</span>
                    )}
                  </td>
                  <td>
                    {isPending || !a.conversations ? (
                      "—"
                    ) : (
                      <strong className="ltr-val">{money(a.spend / a.conversations)}</strong>
                    )}
                  </td>
                  <td>
                    <span className="ltr-val">{formatLastSynced(a.last_synced_at, a.timezone_name)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
