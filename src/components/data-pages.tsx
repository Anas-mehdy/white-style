"use client";

import { useMemo, useState } from "react";
import { PageHeader, Table } from "@/components/dashboard";
import { useRouter } from "next/navigation";
import { 
  Search, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ChevronDown, 
  ChevronUp, 
  AlertOctagon, 
  Activity, 
  ArrowLeft,
  Calendar,
  Eye,
  Sliders,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Ban
} from "lucide-react";
import {
  translateDecision,
  translateStatus,
  translateEntityType,
  convertMinorUnits,
  formatCurrency,
  formatBudgetChange,
  formatPauseResult,
  formatArabicDate,
  translateMetaError,
  extractBudgetValue
} from "@/lib/readable-helpers";

type RecordRow = Record<string, unknown>;

function name(row: RecordRow) {
  const account = row.meta_ad_accounts as { name?: string } | null;
  return account?.name ?? "—";
}

// Helper to get latest action from decision
function getLatestAction(decision: RecordRow): RecordRow | null {
  const actions = (decision.agent_actions as RecordRow[] | undefined) || [];
  if (!actions.length) return null;
  const sorted = [...actions].sort((a, b) => {
    return new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime();
  });
  return sorted[0];
}

// Helper to get decision status
function getDecisionStatus(decision: RecordRow): string {
  const latestAction = getLatestAction(decision);
  if (!latestAction) return "pending";
  return String(latestAction.status || "pending");
}

// Target info helper for decisions
function getTargetInfo(r: RecordRow) {
  if (r.meta_ads && (r.meta_ads as any).name) {
    return { name: (r.meta_ads as any).name, label: "إعلان", id: (r.meta_ads as any).meta_ad_id };
  }
  if (r.meta_ad_sets && (r.meta_ad_sets as any).name) {
    return { name: (r.meta_ad_sets as any).name, label: "مجموعة إعلانية", id: (r.meta_ad_sets as any).meta_adset_id };
  }
  if (r.meta_campaigns && (r.meta_campaigns as any).name) {
    return { name: (r.meta_campaigns as any).name, label: "حملة", id: (r.meta_campaigns as any).meta_campaign_id };
  }
  return { name: "غير محدد", label: "—", id: "—" };
}

// Helper to extract metric SNAPSHOTS
function extractMetricsFromSnapshot(snapshot: unknown, currency: string = "USD") {
  if (!snapshot || typeof snapshot !== "object") return null;
  
  const snap = snapshot as Record<string, unknown>;

  const findVal = (keys: string[]) => {
    for (const key of keys) {
      if (key in snap && snap[key] !== null && snap[key] !== undefined) {
        return snap[key];
      }
    }
    return null;
  };

  const cpaRaw = findVal(["cpa", "cpr", "cost_per_conversation", "cost_per_convo", "current_cpa", "current_cpr"]);
  const benchmarkRaw = findVal(["benchmark_cpa", "benchmark_cpr", "target_cpa", "target_cpr", "benchmark", "standard_cpa", "standard_cpr"]);
  const diffRaw = findVal(["diff_pct", "difference", "diff_percent", "percent_diff", "difference_percent"]);
  const spendRaw = findVal(["spend", "spending", "total_spend", "amount_spent"]);
  const convsRaw = findVal(["conversations", "conversations_count", "convo_count", "convo", "messaging_conversations"]);
  const impressionsRaw = findVal(["impressions"]);
  const reachRaw = findVal(["reach"]);
  const ageRaw = findVal(["ad_age_days", "age_days", "days_active", "age"]);

  if (
    cpaRaw === null &&
    benchmarkRaw === null &&
    diffRaw === null &&
    spendRaw === null &&
    convsRaw === null &&
    impressionsRaw === null &&
    reachRaw === null &&
    ageRaw === null
  ) {
    return null;
  }

  const fmtMoney = (val: unknown) => val !== null && val !== undefined ? formatCurrency(Number(val), currency) : "—";
  const fmtNum = (val: unknown) => val !== null && val !== undefined ? new Intl.NumberFormat("en-US").format(Number(val)) : "—";
  const fmtPct = (val: unknown) => {
    if (val === null || val === undefined) return "—";
    const num = Number(val);
    return num > 0 ? `+${num}%` : `${num}%`;
  };
  const fmtDays = (val: unknown) => val !== null && val !== undefined ? `${val} يوم` : "—";

  return {
    cpa: fmtMoney(cpaRaw),
    benchmark: fmtMoney(benchmarkRaw),
    diff: fmtPct(diffRaw),
    spend: fmtMoney(spendRaw),
    conversations: fmtNum(convsRaw),
    impressions: fmtNum(impressionsRaw),
    reach: fmtNum(reachRaw),
    age: fmtDays(ageRaw),
  };
}

// Helper to render Status badges
function getStatusBadge(status: string) {
  switch (status) {
    case "verified":
      return <span className="badge badge--success">تم التنفيذ</span>;
    case "failed":
      return <span className="badge badge--failed">فشل التنفيذ</span>;
    case "skipped":
      return <span className="badge badge--neutral">تم التخطي</span>;
    case "queued":
    case "executing":
      return <span className="badge badge--info">قيد التنفيذ</span>;
    case "pending":
    default:
      return <span className="badge badge--pending">بانتظار التنفيذ</span>;
  }
}

// Target info helper for direct actions
function getActionTargetInfo(action: RecordRow) {
  const decision = action.agent_decisions as RecordRow | null;
  if (!decision) {
    return { name: `Entity ID: ${action.meta_entity_id || "—"}`, label: translateEntityType(action.meta_entity_type) };
  }
  return getTargetInfo(decision);
}

export function AccountsPage({ accounts }: { accounts: Parameters<typeof Table>[0]["accounts"] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const rows = useMemo(() => accounts.filter(a => (status === "all" || a.connection_status === status) && `${a.name} ${a.meta_account_id}`.toLowerCase().includes(q.toLowerCase())), [accounts, q, status]);
  return (
    <>
      <PageHeader title="الحسابات الإعلانية" />
      <div className="filters">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث بالاسم أو Meta ID" />
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">كل الحالات</option>
          <option value="connected">connected</option>
          <option value="pending">pending</option>
          <option value="error">error</option>
        </select>
      </div>
      <article className="panel">
        <Table accounts={rows} />
      </article>
    </>
  );
}

export function DecisionsPage({ rows }: { rows: RecordRow[] }) {
  const rtr = useRouter();
  
  // States for filters
  const [q, setQ] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [decisionTypeFilter, setDecisionTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState(0);
  
  // Tab State
  const [activeTab, setActiveTab] = useState("current"); // current, executed, failed, all
  
  // Drawer States
  const [selectedRow, setSelectedRow] = useState<RecordRow | null>(null);
  const [isTechOpen, setIsTechOpen] = useState(false);

  // Timezone-aware local today YYYY-MM-DD
  const localToday = useMemo(() => new Date().toLocaleDateString("en-CA"), []);

  // Reset Filters
  const resetFilters = () => {
    setQ("");
    setAccountFilter("all");
    setDecisionTypeFilter("all");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
    setConfidenceFilter(0);
  };

  // Unique Accounts list for filter dropdown
  const accountsList = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const acct = r.meta_ad_accounts as { name?: string } | null;
      if (r.ad_account_id && acct?.name) {
        map.set(String(r.ad_account_id), acct.name);
      }
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  // KPI counts based on TODAY (created today)
  const kpiStats = useMemo(() => {
    const todayRows = rows.filter(r => {
      const dateStr = new Date(String(r.created_at)).toLocaleDateString("en-CA");
      return dateStr === localToday;
    });

    const createdToday = todayRows.length;
    const executedToday = todayRows.filter(r => getDecisionStatus(r) === "verified").length;
    const skippedToday = todayRows.filter(r => getDecisionStatus(r) === "skipped").length;
    const failedToday = todayRows.filter(r => getDecisionStatus(r) === "failed").length;

    // Changes breakdown today
    let budgetDecreased = 0;
    let budgetIncreased = 0;
    let paused = 0;
    
    todayRows.forEach(r => {
      if (getDecisionStatus(r) === "verified") {
        if (r.decision === "decrease_budget") budgetDecreased++;
        else if (r.decision === "increase_budget") budgetIncreased++;
        else if (r.decision === "pause") paused++;
      }
    });

    return {
      createdToday,
      executedToday,
      skippedToday,
      failedToday,
      budgetDecreased,
      budgetIncreased,
      paused
    };
  }, [rows, localToday]);

  // Filter & tab logic
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      // Search
      if (q) {
        const query = q.toLowerCase();
        const reason = String(r.reason || "").toLowerCase();
        const target = getTargetInfo(r);
        const targetName = target.name.toLowerCase();
        const acctName = name(r).toLowerCase();
        if (!reason.includes(query) && !targetName.includes(query) && !acctName.includes(query)) {
          return false;
        }
      }
      
      // Account
      if (accountFilter !== "all" && r.ad_account_id !== accountFilter) {
        return false;
      }
      
      // Decision Type
      if (decisionTypeFilter !== "all" && r.decision !== decisionTypeFilter) {
        return false;
      }
      
      // Status
      if (statusFilter !== "all") {
        const status = getDecisionStatus(r);
        if (statusFilter === "executing") {
          if (status !== "queued" && status !== "executing") return false;
        } else {
          if (status !== statusFilter) return false;
        }
      }
      
      // Confidence
      if (Number(r.confidence || 0) < confidenceFilter) {
        return false;
      }
      
      // Date Range
      if (startDate || endDate) {
        const rowTime = new Date(String(r.created_at)).getTime();
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (rowTime < start.getTime()) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (rowTime > end.getTime()) return false;
        }
      }

      // Tab filtering
      const stat = getDecisionStatus(r);
      if (activeTab === "current") {
        return stat === "pending" || stat === "queued" || stat === "executing";
      } else if (activeTab === "executed") {
        return stat === "verified";
      } else if (activeTab === "failed") {
        return stat === "failed";
      }
      
      return true; // all tab
    });
  }, [rows, q, accountFilter, decisionTypeFilter, statusFilter, confidenceFilter, startDate, endDate, activeTab]);

  // Loading / Empty States definitions
  const hasNoDecisionsAtAll = rows.length === 0;

  return (
    <>
      {/* Header */}
      <header className="topbar">
        <div className="topbar-title" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <h1>قرارات Agent</h1>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "12px" }}>متابعة قرارات النظام والتنفيذ الفعلي على الحملات الإعلانية</p>
        </div>
        <div className="topbar-actions">
          <button className="sync-button" onClick={() => rtr.refresh()}>
            <RotateCcw size={14} />
            تحديث الصفحة
          </button>
        </div>
      </header>

      {/* KPI Cards Section */}
      <section className="kpi-grid">
        <article className="kpi-card">
          <div className="kpi-label">قرارات اليوم</div>
          <strong className="kpi-value">{kpiStats.createdToday}</strong>
          <span className="kpi-subtext">إجمالي القرارات الصادرة اليوم</span>
        </article>
        
        <article className="kpi-card" style={{ borderRight: "3px solid var(--green)" }}>
          <div className="kpi-label">تم التنفيذ</div>
          <strong className="kpi-value" style={{ color: "var(--green)" }}>{kpiStats.executedToday}</strong>
          <span className="kpi-subtext">عمليات ناجحة على Meta اليوم</span>
        </article>
        
        <article className="kpi-card" style={{ borderRight: "3px solid var(--muted)" }}>
          <div className="kpi-label">تم التخطي</div>
          <strong className="kpi-value" style={{ color: "var(--muted)" }}>{kpiStats.skippedToday}</strong>
          <span className="kpi-subtext">قرارات تم تجاوزها لظروف الحملة</span>
        </article>
        
        <article className="kpi-card" style={{ borderRight: "3px solid var(--red)" }}>
          <div className="kpi-label">فشل التنفيذ</div>
          <strong className="kpi-value" style={{ color: "var(--red)" }}>{kpiStats.failedToday}</strong>
          <span className="kpi-subtext">إخفاقات في الكتابة إلى Meta</span>
        </article>
        
        <article className="kpi-card">
          <div className="kpi-label">التغييرات المنفذة اليوم</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "4px" }}>
            <div style={{ fontSize: "10.5px", color: "var(--muted)", display: "flex", justifyContent: "space-between" }}>
              <span>خفض الميزانية:</span>
              <strong style={{ color: "var(--foreground)" }}>{kpiStats.budgetDecreased}</strong>
            </div>
            <div style={{ fontSize: "10.5px", color: "var(--muted)", display: "flex", justifyContent: "space-between" }}>
              <span>زيادة الميزانية:</span>
              <strong style={{ color: "var(--foreground)" }}>{kpiStats.budgetIncreased}</strong>
            </div>
            <div style={{ fontSize: "10.5px", color: "var(--muted)", display: "flex", justifyContent: "space-between" }}>
              <span>إيقاف:</span>
              <strong style={{ color: "var(--foreground)" }}>{kpiStats.paused}</strong>
            </div>
          </div>
        </article>
      </section>

      {/* Filter Bar */}
      <section className="compact-filters">
        <div className="filter-item filter-item--search">
          <label>بحث</label>
          <div style={{ position: "relative" }}>
            <input 
              value={q} 
              onChange={e => setQ(e.target.value)} 
              placeholder="ابحث بالحملة، الهدف، السبب..." 
              className="filter-input"
            />
            {q && <button onClick={() => setQ("")} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: 0, color: "var(--muted)" }}><X size={14} /></button>}
          </div>
        </div>

        <div className="filter-item">
          <label>الحساب</label>
          <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)} className="filter-input">
            <option value="all">الكل</option>
            {accountsList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        <div className="filter-item">
          <label>نوع القرار</label>
          <select value={decisionTypeFilter} onChange={e => setDecisionTypeFilter(e.target.value)} className="filter-input">
            <option value="all">الكل</option>
            <option value="decrease_budget">خفض الميزانية</option>
            <option value="increase_budget">زيادة الميزانية</option>
            <option value="pause">إيقاف</option>
          </select>
        </div>

        <div className="filter-item">
          <label>حالة التنفيذ</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-input">
            <option value="all">الكل</option>
            <option value="pending">بانتظار التنفيذ</option>
            <option value="executing">قيد التنفيذ</option>
            <option value="verified">تم التنفيذ</option>
            <option value="skipped">تم التخطي</option>
            <option value="failed">فشل التنفيذ</option>
          </select>
        </div>

        <div className="filter-item">
          <label>من تاريخ</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="filter-input" />
        </div>

        <div className="filter-item">
          <label>إلى تاريخ</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="filter-input" />
        </div>

        <div className="filter-item">
          <label>الثقة (أكبر من {confidenceFilter}%)</label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            step="5" 
            value={confidenceFilter} 
            onChange={e => setConfidenceFilter(Number(e.target.value))} 
            className="filter-input"
            style={{ padding: 0, height: "30px", cursor: "pointer" }}
          />
        </div>

        <button className="reset-btn" onClick={resetFilters}>
          <RotateCcw size={13} />
          إعادة ضبط الفلاتر
        </button>
      </section>

      {/* Tabs */}
      <section className="tabs-bar">
        <button 
          className={`tab-btn ${activeTab === "current" ? "tab-btn--active" : ""}`} 
          onClick={() => setActiveTab("current")}
        >
          القرارات الحالية
        </button>
        <button 
          className={`tab-btn ${activeTab === "executed" ? "tab-btn--active" : ""}`} 
          onClick={() => setActiveTab("executed")}
        >
          تم التنفيذ
        </button>
        <button 
          className={`tab-btn ${activeTab === "failed" ? "tab-btn--active" : ""}`} 
          onClick={() => setActiveTab("failed")}
        >
          فشل التنفيذ
        </button>
        <button 
          className={`tab-btn ${activeTab === "all" ? "tab-btn--active" : ""}`} 
          onClick={() => setActiveTab("all")}
        >
          كل السجل
        </button>
      </section>

      {/* Main Content Area */}
      {hasNoDecisionsAtAll ? (
        <article className="panel" style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--amber-soft)", color: "var(--amber)", padding: "6px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", marginBottom: "20px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "currentColor" }}></span>
            لا توجد قرارات حتى الآن
          </div>
          <h2 style={{ fontSize: "16px", marginBottom: "12px", fontWeight: "600" }}>لا توجد قرارات مسجلة في قاعدة البيانات حاليًا.</h2>
        </article>
      ) : filteredRows.length === 0 ? (
        <article className="panel" style={{ textAlign: "center", padding: "30px" }}>
          <div style={{ color: "var(--muted)", fontSize: "13px" }}>
            {activeTab === "failed" ? "لا توجد عمليات فاشلة" : (activeTab === "current" ? "لا توجد قرارات بانتظار التنفيذ" : "لا توجد نتائج مطابقة للفلاتر الحالية")}
          </div>
        </article>
      ) : (
        <>
          {/* Desktop & Tablet Table */}
          <div className="data-table-wrapper">
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>القرار</th>
                    <th>الهدف</th>
                    <th>الحساب</th>
                    <th>السبب</th>
                    <th>الثقة</th>
                    <th>التغيير</th>
                    <th>الحالة</th>
                    <th className="hide-tablet">وقت الإنشاء</th>
                    <th className="hide-tablet">وقت التنفيذ</th>
                    <th>التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(r => {
                    const latestAction = getLatestAction(r);
                    const status = getDecisionStatus(r);
                    const target = getTargetInfo(r);
                    const currency = (r.meta_ad_accounts as any)?.currency || "USD";
                    const confidence = Number(r.confidence || 0);
                    
                    // Format budget change text
                    let changeText = "—";
                    if (r.decision === "increase_budget" || r.decision === "decrease_budget") {
                      if (latestAction) {
                        changeText = formatBudgetChange(
                          latestAction.before_state,
                          latestAction.requested_state,
                          latestAction.verified_state,
                          Number((r.proposed_change as any)?.budget_change_pct || 0),
                          currency
                        );
                      } else {
                        const beforeBudget = r.meta_ad_sets ? (r.meta_ad_sets as any).daily_budget : (r.meta_campaigns ? (r.meta_campaigns as any).daily_budget : null);
                        const pct = Number((r.proposed_change as any)?.budget_change_pct || 0);
                        if (beforeBudget !== null) {
                          const requestedBudget = beforeBudget * (1 + pct / 100);
                          changeText = formatBudgetChange(beforeBudget, requestedBudget, null, pct, currency);
                        } else {
                          changeText = formatBudgetChange(null, null, null, pct, currency);
                        }
                      }
                    } else if (r.decision === "pause") {
                      const entityType = latestAction?.meta_entity_type || (r.meta_ads ? "ad" : (r.meta_ad_sets ? "ad_set" : "campaign"));
                      changeText = formatPauseResult(entityType);
                    }

                    // Decision color badge
                    let decBadgeClass = "badge--neutral";
                    if (r.decision === "increase_budget") decBadgeClass = "badge--success";
                    else if (r.decision === "decrease_budget") decBadgeClass = "badge--warning";
                    else if (r.decision === "pause") decBadgeClass = "badge--failed";

                    return (
                      <tr key={String(r.id)}>
                        <td>
                          <span className={`badge ${decBadgeClass}`}>{translateDecision(r.decision)}</span>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ fontWeight: 600 }}>{target.name}</span>
                            <span style={{ fontSize: "9.5px", color: "var(--muted)" }}>{target.label}</span>
                          </div>
                        </td>
                        <td className="account-name-cell">{name(r)}</td>
                        <td style={{ maxWidth: "220px", whiteSpace: "normal" }}>
                          <span 
                            title={String(r.reason)} 
                            style={{ 
                              display: "-webkit-box", 
                              WebkitLineClamp: 2, 
                              WebkitBoxOrient: "vertical", 
                              overflow: "hidden", 
                              lineHeight: "1.5",
                              fontSize: "11px",
                              color: "var(--muted)"
                            }}
                          >
                            {String(r.reason)}
                          </span>
                        </td>
                        <td>
                          <div className="confidence-cell">
                            <span className="ltr-val" style={{ width: "34px" }}>{confidence}%</span>
                            <div className="confidence-bar-bg">
                              <div className="confidence-bar-fill" style={{ width: `${confidence}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: "11px", fontWeight: "500" }}>{changeText}</span>
                        </td>
                        <td>{getStatusBadge(status)}</td>
                        <td className="hide-tablet">
                          <span className="ltr-val">{formatArabicDate(r.created_at)}</span>
                        </td>
                        <td className="hide-tablet">
                          <span className="ltr-val">{latestAction?.executed_at ? formatArabicDate(latestAction.executed_at) : "—"}</span>
                        </td>
                        <td>
                          <button 
                            className="sync-button" 
                            style={{ padding: "6px 10px", fontSize: "10.5px" }}
                            onClick={() => {
                              setSelectedRow(r);
                              setIsTechOpen(false);
                            }}
                          >
                            عرض التفاصيل
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Layout (Cards) */}
          <div className="mobile-cards-list">
            {filteredRows.map(r => {
              const latestAction = getLatestAction(r);
              const status = getDecisionStatus(r);
              const target = getTargetInfo(r);
              const currency = (r.meta_ad_accounts as any)?.currency || "USD";
              const confidence = Number(r.confidence || 0);

              let changeText = "—";
              if (r.decision === "increase_budget" || r.decision === "decrease_budget") {
                if (latestAction) {
                  changeText = formatBudgetChange(
                    latestAction.before_state,
                    latestAction.requested_state,
                    latestAction.verified_state,
                    Number((r.proposed_change as any)?.budget_change_pct || 0),
                    currency
                  );
                } else {
                  const pct = Number((r.proposed_change as any)?.budget_change_pct || 0);
                  changeText = formatBudgetChange(null, null, null, pct, currency);
                }
              } else if (r.decision === "pause") {
                const entityType = latestAction?.meta_entity_type || (r.meta_ads ? "ad" : (r.meta_ad_sets ? "ad_set" : "campaign"));
                changeText = formatPauseResult(entityType);
              }

              let decBadgeClass = "badge--neutral";
              if (r.decision === "increase_budget") decBadgeClass = "badge--success";
              else if (r.decision === "decrease_budget") decBadgeClass = "badge--warning";
              else if (r.decision === "pause") decBadgeClass = "badge--failed";

              return (
                <article key={String(r.id)} className="mobile-card">
                  <div className="mobile-card-row">
                    <span className={`badge ${decBadgeClass}`}>{translateDecision(r.decision)}</span>
                    <span className="ltr-val" style={{ fontSize: "10px", color: "var(--muted)" }}>{formatArabicDate(r.created_at)}</span>
                  </div>
                  
                  <div style={{ margin: "4px 0" }}>
                    <div className="mobile-card-title">{target.name}</div>
                    <div className="mobile-card-subtitle">{target.label}</div>
                  </div>

                  <div className="mobile-card-divider" />

                  <div className="mobile-card-row">
                    <span className="mobile-card-label">الحساب</span>
                    <span className="mobile-card-val">{name(r)}</span>
                  </div>

                  <div className="mobile-card-row">
                    <span className="mobile-card-label">مستوى الثقة</span>
                    <span className="mobile-card-val">{confidence}%</span>
                  </div>

                  <div className="mobile-card-row">
                    <span className="mobile-card-label">التغيير</span>
                    <strong className="mobile-card-val" style={{ fontSize: "11px" }}>{changeText}</strong>
                  </div>

                  <div className="mobile-card-row">
                    <span className="mobile-card-label">الحالة</span>
                    <span>{getStatusBadge(status)}</span>
                  </div>

                  <div className="mobile-card-divider" />

                  <button 
                    className="mobile-card-btn"
                    onClick={() => {
                      setSelectedRow(r);
                      setIsTechOpen(false);
                    }}
                  >
                    عرض التفاصيل الكاملة
                  </button>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* Right-Side Slide-Over Details Drawer */}
      <div 
        className={`drawer-backdrop ${selectedRow ? "drawer-backdrop--open" : ""}`} 
        onClick={() => setSelectedRow(null)} 
      />
      <div className={`drawer ${selectedRow ? "drawer--open" : ""}`}>
        {selectedRow && (() => {
          const r = selectedRow as any;
          const latestAction = getLatestAction(r);
          const currency = (r.meta_ad_accounts as any)?.currency || "USD";
          const target = getTargetInfo(r);
          const metrics = extractMetricsFromSnapshot(r.input_snapshot, currency);
          const confidence = Number(r.confidence || 0);
          
          return (
            <>
              <div className="drawer-header">
                <h3>تفاصيل قرار النظام</h3>
                <button className="drawer-close" onClick={() => setSelectedRow(null)}>
                  <X size={18} />
                </button>
              </div>
              
              <div className="drawer-body">
                {/* Section A: معلومات القرار */}
                <div className="drawer-section">
                  <div className="drawer-section-title">معلومات القرار</div>
                  <div className="info-grid">
                    <div className="info-item">
                      <div className="info-label">نوع القرار</div>
                      <div className="info-value">{translateDecision(r.decision)}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">مستوى الثقة</div>
                      <div className="info-value">{confidence}%</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">الحساب الإعلاني</div>
                      <div className="info-value">{name(r)}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">الهدف</div>
                      <div className="info-value" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={target.name}>
                        {target.name} <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "normal" }}>({target.label})</span>
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">وقت الإنشاء</div>
                      <div className="info-value">{formatArabicDate(r.created_at)}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">وقت التنفيذ</div>
                      <div className="info-value">
                        {latestAction?.executed_at ? formatArabicDate(latestAction.executed_at) : "—"}
                      </div>
                    </div>
                    <div className="info-item" style={{ gridColumn: "span 2" }}>
                      <div className="info-label">حالة التنفيذ</div>
                      <div className="info-value" style={{ marginTop: "4px" }}>
                        {getStatusBadge(getDecisionStatus(r))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Section B: سبب القرار */}
                <div className="drawer-section">
                  <div className="drawer-section-title">سبب القرار</div>
                  <p style={{ fontSize: "12px", lineHeight: "1.6", color: "var(--muted)", margin: "0 0 10px", background: "var(--surface-soft)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    {String(r.reason || "—")}
                  </p>
                  
                  {metrics && (
                    <div className="drawer-section">
                      <div className="drawer-section-title" style={{ fontSize: "10.5px", border: 0, padding: 0 }}>مؤشرات أداء الحملة المستهدفة وقت القرار:</div>
                      <div className="metrics-card-grid">
                        <div className="metric-mini-card">
                          <div className="metric-mini-label" title="تكلفة المحادثة الحالية">تكلفة المحادثة</div>
                          <div className="metric-mini-val">{metrics.cpa}</div>
                        </div>
                        <div className="metric-mini-card">
                          <div className="metric-mini-label" title="معيار الحساب">معيار الحساب</div>
                          <div className="metric-mini-val">{metrics.benchmark}</div>
                        </div>
                        <div className="metric-mini-card">
                          <div className="metric-mini-label" title="نسبة الفرق">نسبة الفرق</div>
                          <div className="metric-mini-val" style={{ color: metrics.diff.startsWith("+") ? "var(--red)" : "var(--green)" }}>
                            {metrics.diff}
                          </div>
                        </div>
                        <div className="metric-mini-card">
                          <div className="metric-mini-label" title="الإنفاق">الإنفاق</div>
                          <div className="metric-mini-val">{metrics.spend}</div>
                        </div>
                        <div className="metric-mini-card">
                          <div className="metric-mini-label" title="المحادثات">المحادثات</div>
                          <div className="metric-mini-val">{metrics.conversations}</div>
                        </div>
                        <div className="metric-mini-card">
                          <div className="metric-mini-label" title="مرات الظهور">الظهور</div>
                          <div className="metric-mini-val">{metrics.impressions}</div>
                        </div>
                        <div className="metric-mini-card">
                          <div className="metric-mini-label" title="الوصول">الوصول</div>
                          <div className="metric-mini-val">{metrics.reach}</div>
                        </div>
                        <div className="metric-mini-card">
                          <div className="metric-mini-label" title="عمر الإعلان">عمر الإعلان</div>
                          <div className="metric-mini-val">{metrics.age}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Section C: التغيير المطلوب */}
                <div className="drawer-section">
                  <div className="drawer-section-title">التغيير المطلوب والتنفيذ</div>
                  {r.decision === "increase_budget" || r.decision === "decrease_budget" ? (
                    <div className="info-grid">
                      <div className="info-item">
                        <div className="info-label">الميزانية قبل التنفيذ</div>
                        <div className="info-value">
                          {latestAction?.before_state ? formatCurrency(convertMinorUnits(latestAction.before_state, currency), currency) : "—"}
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">الميزانية المطلوبة</div>
                        <div className="info-value">
                          {latestAction?.requested_state ? formatCurrency(convertMinorUnits(latestAction.requested_state, currency), currency) : "—"}
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">الميزانية بعد التحقق</div>
                        <div className="info-value">
                          {latestAction?.verified_state ? formatCurrency(convertMinorUnits(latestAction.verified_state, currency), currency) : "—"}
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">نسبة التغيير</div>
                        <div className="info-value" style={{ direction: "ltr", textAlign: "right" }}>
                          {Number((r.proposed_change as any)?.budget_change_pct || 0) > 0 ? "+" : ""}
                          {Number((r.proposed_change as any)?.budget_change_pct || 0)}%
                        </div>
                      </div>
                    </div>
                  ) : r.decision === "pause" ? (
                    <div className="info-grid">
                      <div className="info-item">
                        <div className="info-label">الحالة قبل التنفيذ</div>
                        <div className="info-value">
                          {latestAction?.before_state ? (String((latestAction.before_state as any)?.status || "ACTIVE") === "ACTIVE" ? "نشط (ACTIVE)" : "متوقف (PAUSED)") : "نشط (ACTIVE)"}
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">الحالة المطلوبة</div>
                        <div className="info-value">متوقف (PAUSED)</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">الحالة بعد التحقق</div>
                        <div className="info-value">
                          {latestAction?.verified_state ? (String((latestAction.verified_state as any)?.status || (latestAction.verified_state as any)?.effective_status || "PAUSED") === "PAUSED" ? "متوقف (PAUSED)" : "نشط (ACTIVE)") : "—"}
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">مستوى الإيقاف</div>
                        <div className="info-value">
                          {translateEntityType(latestAction?.meta_entity_type || (r.meta_ads ? "ad" : (r.meta_ad_sets ? "ad_set" : "campaign")))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>لا توجد تفاصيل تغيير لهذا القرار.</div>
                  )}
                </div>
                
                {/* Section D: سجل التنفيذ */}
                <div className="drawer-section">
                  <div className="drawer-section-title">سجل التنفيذ</div>
                  <div className="timeline">
                    <div className="timeline-item">
                      <div className="timeline-dot timeline-dot--active" />
                      <div className="timeline-content">
                        <div className="timeline-title">تم إنشاء القرار</div>
                        <div className="timeline-time">{formatArabicDate(r.created_at)}</div>
                      </div>
                    </div>
                    
                    <div className="timeline-item">
                      <div className={`timeline-dot ${latestAction ? "timeline-dot--active" : ""}`} />
                      <div className="timeline-content">
                        <div className="timeline-title">تم إرسال الطلب إلى Meta</div>
                        <div className="timeline-time">
                          {latestAction?.created_at ? formatArabicDate(latestAction.created_at) : "—"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="timeline-item">
                      <div className={`timeline-dot ${latestAction?.executed_at ? "timeline-dot--active" : ""}`} />
                      <div className="timeline-content">
                        <div className="timeline-title">تم التحقق من الحالة</div>
                        <div className="timeline-time">
                          {latestAction?.executed_at ? formatArabicDate(latestAction.executed_at) : "—"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="timeline-item">
                      <div className={`timeline-dot ${latestAction?.status === "verified" ? "timeline-dot--active" : (latestAction?.status === "failed" ? "timeline-dot--failed" : "")}`} />
                      <div className="timeline-content">
                        <div className="timeline-title">
                          {latestAction?.status === "verified" ? "تم حفظ النتيجة وتأكيد التنفيذ" : (latestAction?.status === "failed" ? "فشل التنفيذ" : "بانتظار اكتمال التحقق")}
                        </div>
                        <div className="timeline-time">
                          {latestAction?.executed_at ? formatArabicDate(latestAction.executed_at) : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Section E: الخطأ */}
                {latestAction?.status === "failed" && (
                  <div className="drawer-section" style={{ background: "var(--red-soft)", border: "1px solid var(--red)", padding: "12px", borderRadius: "8px" }}>
                    <div className="drawer-section-title" style={{ color: "var(--red)", border: 0, padding: 0, marginBottom: "6px" }}>تفاصيل الخطأ</div>
                    <div style={{ fontSize: "12px", color: "var(--red)", fontWeight: "600", display: "flex", gap: "6px", alignItems: "center" }}>
                      <AlertOctagon size={16} />
                      <span>{translateMetaError(latestAction.error_code, latestAction.error_message)}</span>
                    </div>
                  </div>
                )}
                
                {/* Section F: التفاصيل التقنية */}
                <div className="accordion">
                  <button className="accordion-toggle" onClick={() => setIsTechOpen(!isTechOpen)}>
                    <span>التفاصيل التقنية</span>
                    <span>{isTechOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                  </button>
                  {isTechOpen && (
                    <div className="accordion-body">
                      <pre className="tech-code-block">
{`Decision ID: ${r.id}
Action ID: ${latestAction?.id || "N/A"}
Idempotency Key: ${latestAction?.idempotency_key || "N/A"}
Meta Entity Type: ${latestAction?.meta_entity_type || (r.meta_ads ? "ad" : (r.meta_ad_sets ? "ad_set" : "campaign"))}
Meta Entity ID: ${latestAction?.meta_entity_id || target.id}
Before State: ${latestAction?.before_state ? JSON.stringify(latestAction.before_state, null, 2) : "N/A"}
Requested State: ${latestAction?.requested_state ? JSON.stringify(latestAction.requested_state, null, 2) : "N/A"}
Verified State: ${latestAction?.verified_state ? JSON.stringify(latestAction.verified_state, null, 2) : "N/A"}
Raw Error Code: ${latestAction?.error_code || "N/A"}
Raw Error Message: ${latestAction?.error_message || "N/A"}`}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </>
  );
}

export function ExecutionPage({ rows }: { rows: RecordRow[] }) {
  const rtr = useRouter();
  
  // Slide-over Drawer States for Execution Logs
  const [selectedRow, setSelectedRow] = useState<RecordRow | null>(null);
  const [isTechOpen, setIsTechOpen] = useState(false);

  return (
    <>
      <header className="topbar">
        <div className="topbar-title" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <h1>سجل التنفيذ</h1>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "12px" }}>عمليات وتعديلات الميزانية والحالة المنفذة بواسطة النظام</p>
        </div>
        <div className="topbar-actions">
          <button className="sync-button" onClick={() => rtr.refresh()}>
            <RotateCcw size={14} />
            تحديث الصفحة
          </button>
        </div>
      </header>

      <div className="data-table-wrapper">
        <div className="data-table">
          {!rows.length ? (
            <div className="empty-state">لا توجد عمليات فاشلة أو منفذة.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>الإجراء</th>
                  <th>الهدف</th>
                  <th>الحساب</th>
                  <th>التغيير المطلوب</th>
                  <th>النتيجة المؤكدة</th>
                  <th>الحالة</th>
                  <th>وقت التنفيذ</th>
                  <th>الخطأ</th>
                  <th>التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const decision = r.agent_decisions as RecordRow | null;
                  const target = getActionTargetInfo(r);
                  const currency = (decision?.meta_ad_accounts as any)?.currency || "USD";
                  
                  // Format budget/pause requested changes
                  let changeText = "—";
                  let verifiedText = "—";
                  const actionType = String(r.action_type || decision?.decision || "");

                  if (actionType === "increase_budget" || actionType === "decrease_budget") {
                    changeText = r.requested_state ? formatCurrency(convertMinorUnits(r.requested_state, currency), currency) : "—";
                    verifiedText = r.verified_state ? formatCurrency(convertMinorUnits(r.verified_state, currency), currency) : "—";
                  } else if (actionType === "pause") {
                    changeText = "إيقاف (PAUSED)";
                    verifiedText = r.status === "verified" ? "متوقف (PAUSED)" : "—";
                  }

                  // Action type badge style
                  let decBadgeClass = "badge--neutral";
                  if (actionType === "increase_budget") decBadgeClass = "badge--success";
                  else if (actionType === "decrease_budget") decBadgeClass = "badge--warning";
                  else if (actionType === "pause") decBadgeClass = "badge--failed";

                  return (
                    <tr key={String(r.id)}>
                      <td>
                        <span className={`badge ${decBadgeClass}`}>{translateDecision(actionType)}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontWeight: 600 }}>{target.name}</span>
                          <span style={{ fontSize: "9.5px", color: "var(--muted)" }}>{target.label}</span>
                        </div>
                      </td>
                      <td className="account-name-cell">
                        {decision?.meta_ad_accounts ? (decision.meta_ad_accounts as any).name : "—"}
                      </td>
                      <td>
                        <span className="ltr-val" style={{ fontWeight: "500" }}>{changeText}</span>
                      </td>
                      <td>
                        <span className="ltr-val" style={{ fontWeight: "500", color: r.status === "verified" ? "var(--green)" : "inherit" }}>
                          {verifiedText}
                        </span>
                      </td>
                      <td>{getStatusBadge(String(r.status))}</td>
                      <td>
                        <span className="ltr-val">{formatArabicDate(r.executed_at || r.created_at)}</span>
                      </td>
                      <td style={{ maxWidth: "160px", whiteSpace: "normal" }}>
                        {r.status === "failed" ? (
                          <span style={{ fontSize: "11px", color: "var(--red)" }}>
                            {translateMetaError(r.error_code, r.error_message)}
                          </span>
                        ) : "—"}
                      </td>
                      <td>
                        <button 
                          className="sync-button" 
                          style={{ padding: "6px 10px", fontSize: "10.5px" }}
                          onClick={() => {
                            // Map action back to a decision-like object for details drawer reuse
                            const decisionRow = decision ? {
                              ...decision,
                              agent_actions: [r]
                            } : {
                              id: "—",
                              decision: r.action_type,
                              reason: "تم التنفيذ بشكل مباشر بدون تفاصيل القرار الحالية",
                              confidence: 100,
                              created_at: r.created_at,
                              meta_ad_accounts: null,
                              agent_actions: [r]
                            };
                            setSelectedRow(decisionRow);
                            setIsTechOpen(false);
                          }}
                        >
                          تفاصيل
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Mobile Card Layout for Executions */}
      <div className="mobile-cards-list">
        {rows.map(r => {
          const decision = r.agent_decisions as RecordRow | null;
          const target = getActionTargetInfo(r);
          const currency = (decision?.meta_ad_accounts as any)?.currency || "USD";
          const actionType = String(r.action_type || decision?.decision || "");
          
          let changeText = "—";
          if (actionType === "increase_budget" || actionType === "decrease_budget") {
            changeText = r.requested_state ? formatCurrency(convertMinorUnits(r.requested_state, currency), currency) : "—";
          } else if (actionType === "pause") {
            changeText = "إيقاف (PAUSED)";
          }

          let decBadgeClass = "badge--neutral";
          if (actionType === "increase_budget") decBadgeClass = "badge--success";
          else if (actionType === "decrease_budget") decBadgeClass = "badge--warning";
          else if (actionType === "pause") decBadgeClass = "badge--failed";

          return (
            <article key={String(r.id)} className="mobile-card">
              <div className="mobile-card-row">
                <span className={`badge ${decBadgeClass}`}>{translateDecision(actionType)}</span>
                <span className="ltr-val" style={{ fontSize: "10px", color: "var(--muted)" }}>{formatArabicDate(r.created_at)}</span>
              </div>
              
              <div style={{ margin: "4px 0" }}>
                <div className="mobile-card-title">{target.name}</div>
                <div className="mobile-card-subtitle">{target.label}</div>
              </div>

              <div className="mobile-card-divider" />

              <div className="mobile-card-row">
                <span className="mobile-card-label">الحساب</span>
                <span className="mobile-card-val">
                  {decision?.meta_ad_accounts ? (decision.meta_ad_accounts as any).name : "—"}
                </span>
              </div>

              <div className="mobile-card-row">
                <span className="mobile-card-label">التغيير</span>
                <strong className="mobile-card-val">{changeText}</strong>
              </div>

              <div className="mobile-card-row">
                <span className="mobile-card-label">الحالة</span>
                <span>{getStatusBadge(String(r.status))}</span>
              </div>

              <div className="mobile-card-divider" />

              <button 
                className="mobile-card-btn"
                onClick={() => {
                  const decisionRow = decision ? {
                    ...decision,
                    agent_actions: [r]
                  } : {
                    id: "—",
                    decision: r.action_type,
                    reason: "تم التنفيذ بشكل مباشر بدون تفاصيل القرار الحالية",
                    confidence: 100,
                    created_at: r.created_at,
                    meta_ad_accounts: null,
                    agent_actions: [r]
                  };
                  setSelectedRow(decisionRow);
                  setIsTechOpen(false);
                }}
              >
                عرض تفاصيل التنفيذ
              </button>
            </article>
          );
        })}
      </div>

      {/* Right-Side Slide-Over Details Drawer (Reused) */}
      <div 
        className={`drawer-backdrop ${selectedRow ? "drawer-backdrop--open" : ""}`} 
        onClick={() => setSelectedRow(null)} 
      />
      <div className={`drawer ${selectedRow ? "drawer--open" : ""}`}>
        {selectedRow && (() => {
          const r = selectedRow as any;
          const latestAction = getLatestAction(r);
          const currency = (r.meta_ad_accounts as any)?.currency || "USD";
          const target = getTargetInfo(r);
          const metrics = extractMetricsFromSnapshot(r.input_snapshot, currency);
          
          return (
            <>
              <div className="drawer-header">
                <h3>تفاصيل تنفيذ الإجراء</h3>
                <button className="drawer-close" onClick={() => setSelectedRow(null)}>
                  <X size={18} />
                </button>
              </div>
              
              <div className="drawer-body">
                {/* Section A: معلومات القرار */}
                <div className="drawer-section">
                  <div className="drawer-section-title">معلومات الإجراء</div>
                  <div className="info-grid">
                    <div className="info-item">
                      <div className="info-label">نوع الإجراء</div>
                      <div className="info-value">{translateDecision(r.decision)}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">الحساب الإعلاني</div>
                      <div className="info-value">
                        {r.meta_ad_accounts ? (r.meta_ad_accounts as any).name : "—"}
                      </div>
                    </div>
                    <div className="info-item" style={{ gridColumn: "span 2" }}>
                      <div className="info-label">الهدف</div>
                      <div className="info-value" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={target.name}>
                        {target.name} <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "normal" }}>({target.label})</span>
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">وقت البدء</div>
                      <div className="info-value">{formatArabicDate(r.created_at)}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">وقت الاكتمال</div>
                      <div className="info-value">
                        {latestAction?.executed_at ? formatArabicDate(latestAction.executed_at) : "—"}
                      </div>
                    </div>
                    <div className="info-item" style={{ gridColumn: "span 2" }}>
                      <div className="info-label">حالة التنفيذ</div>
                      <div className="info-value" style={{ marginTop: "4px" }}>
                        {getStatusBadge(getDecisionStatus(r))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section B: سبب الإجراء */}
                {r.reason && r.reason !== "تم التنفيذ بشكل مباشر بدون تفاصيل القرار الحالية" && (
                  <div className="drawer-section">
                    <div className="drawer-section-title">السبب والتحليل الداعم</div>
                    <p style={{ fontSize: "12px", lineHeight: "1.6", color: "var(--muted)", margin: 0, background: "var(--surface-soft)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                      {String(r.reason)}
                    </p>
                  </div>
                )}
                
                {/* Section C: التغيير المطلوب */}
                <div className="drawer-section">
                  <div className="drawer-section-title">التعديلات وقيم الحالات</div>
                  {r.decision === "increase_budget" || r.decision === "decrease_budget" ? (
                    <div className="info-grid">
                      <div className="info-item">
                        <div className="info-label">الميزانية السابقة</div>
                        <div className="info-value">
                          {latestAction?.before_state ? formatCurrency(convertMinorUnits(latestAction.before_state, currency), currency) : "—"}
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">الميزانية المطلوبة</div>
                        <div className="info-value">
                          {latestAction?.requested_state ? formatCurrency(convertMinorUnits(latestAction.requested_state, currency), currency) : "—"}
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">الميزانية الفعلية بعد التأكيد</div>
                        <div className="info-value">
                          {latestAction?.verified_state ? formatCurrency(convertMinorUnits(latestAction.verified_state, currency), currency) : "—"}
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">مفتاح المطابقة (Idempotency)</div>
                        <div className="info-value" style={{ fontSize: "10.5px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {latestAction?.idempotency_key ? String(latestAction.idempotency_key) : "—"}
                        </div>
                      </div>
                    </div>
                  ) : r.decision === "pause" ? (
                    <div className="info-grid">
                      <div className="info-item">
                        <div className="info-label">الحالة السابقة</div>
                        <div className="info-value">
                          {latestAction?.before_state ? (String((latestAction.before_state as any)?.status || "ACTIVE") === "ACTIVE" ? "نشط (ACTIVE)" : "متوقف (PAUSED)") : "نشط (ACTIVE)"}
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">الحالة المطلوبة</div>
                        <div className="info-value">متوقف (PAUSED)</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">الحالة المؤكدة بعد التحقق</div>
                        <div className="info-value">
                          {latestAction?.verified_state ? (String((latestAction.verified_state as any)?.status || (latestAction.verified_state as any)?.effective_status || "PAUSED") === "PAUSED" ? "متوقف (PAUSED)" : "نشط (ACTIVE)") : "—"}
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">المستوى</div>
                        <div className="info-value">
                          {translateEntityType(latestAction?.meta_entity_type || "—")}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>لا توجد تعديلات إضافية للتنفيذ.</div>
                  )}
                </div>

                {/* Section E: الخطأ */}
                {latestAction?.status === "failed" && (
                  <div className="drawer-section" style={{ background: "var(--red-soft)", border: "1px solid var(--red)", padding: "12px", borderRadius: "8px" }}>
                    <div className="drawer-section-title" style={{ color: "var(--red)", border: 0, padding: 0, marginBottom: "6px" }}>تفاصيل الخطأ</div>
                    <div style={{ fontSize: "12px", color: "var(--red)", fontWeight: "600", display: "flex", gap: "6px", alignItems: "center" }}>
                      <AlertOctagon size={16} />
                      <span>{translateMetaError(latestAction.error_code, latestAction.error_message)}</span>
                    </div>
                  </div>
                )}
                
                {/* Section F: التفاصيل التقنية */}
                <div className="accordion">
                  <button className="accordion-toggle" onClick={() => setIsTechOpen(!isTechOpen)}>
                    <span>التفاصيل التقنية</span>
                    <span>{isTechOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                  </button>
                  {isTechOpen && (
                    <div className="accordion-body">
                      <pre className="tech-code-block">
{`Action ID: ${latestAction?.id || "N/A"}
Decision ID: ${r.id || "N/A"}
Idempotency Key: ${latestAction?.idempotency_key || "N/A"}
Meta Entity Type: ${latestAction?.meta_entity_type || "N/A"}
Meta Entity ID: ${latestAction?.meta_entity_id || "N/A"}
Before State: ${latestAction?.before_state ? JSON.stringify(latestAction.before_state, null, 2) : "N/A"}
Requested State: ${latestAction?.requested_state ? JSON.stringify(latestAction.requested_state, null, 2) : "N/A"}
Verified State: ${latestAction?.verified_state ? JSON.stringify(latestAction.verified_state, null, 2) : "N/A"}
Raw Error Code: ${latestAction?.error_code || "N/A"}
Raw Error Message: ${latestAction?.error_message || "N/A"}`}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </>
          );
        })()}
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

export function SettingsPage({ accounts, configs }: { accounts: RecordRow[]; configs: RecordRow[] }) {
  return (
    <>
      <PageHeader title="الإعدادات" />
      <article className="panel settings-card">
        <h2>الاتصال والحسابات</h2>
        <p>تُقرأ بيانات الاتصال من Supabase. لا تُعرض مفاتيح API أو Meta tokens في الواجهة.</p>
        <dl>
          <dt>الحسابات</dt>
          <dd>{accounts.length}</dd>
          <dt>الحسابات المتصلة</dt>
          <dd>{accounts.filter(x => x.connection_status === "connected").length}</dd>
          <dt>إعدادات Agent</dt>
          <dd>{configs.length}</dd>
        </dl>
      </article>
    </>
  );
}
