"use client";

import {
  Activity,
  Bell,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Gauge,
  LayoutDashboard,
  Menu,
  MessageCircleMore,
  Pause,
  Play,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  ActionStatus,
  AgentMode,
  DashboardData,
} from "@/types/dashboard";

const navItems = [
  { label: "نظرة عامة", icon: LayoutDashboard },
  { label: "الحسابات الإعلانية", icon: Target },
  { label: "قرارات الـAgent", icon: BrainCircuit },
  { label: "سجل التنفيذ", icon: Activity },
  { label: "قواعد الحماية", icon: ShieldCheck },
  { label: "الإعدادات", icon: Settings2 },
];

const statusLabels: Record<ActionStatus, string> = {
  executed: "نُفّذ تلقائيًا",
  watching: "تحت التحقق",
  protected: "محمي",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function LineChart({ values, variant }: { values: number[]; variant: "green" | "blue" }) {
  const width = 620;
  const height = 190;
  const padding = 12;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values
    .map((value, index) => {
      const x = padding + (index / (values.length - 1)) * (width - padding * 2);
      const y =
        height -
        padding -
        ((value - min) / Math.max(max - min, 1)) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const area = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg
      className={`line-chart line-chart--${variant}`}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="اتجاه الأداء خلال الفترة المحددة"
    >
      <defs>
        <linearGradient id={`area-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1="48" x2={width} y2="48" className="chart-grid" />
      <line x1="0" y1="96" x2={width} y2="96" className="chart-grid" />
      <line x1="0" y1="144" x2={width} y2="144" className="chart-grid" />
      <polygon points={area} fill={`url(#area-${variant})`} />
      <polyline points={points} fill="none" className="chart-line" />
      {values.map((value, index) => {
        const [x, y] = points.split(" ")[index].split(",");
        return index === values.length - 1 ? (
          <circle key={value + index} cx={x} cy={y} r="5" className="chart-dot" />
        ) : null;
      })}
    </svg>
  );
}

export function Dashboard({ initialData }: { initialData: DashboardData }) {
  const [agentMode, setAgentMode] = useState<AgentMode>("autopilot");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [period, setPeriod] = useState("30 يومًا");
  const [activeNav, setActiveNav] = useState("نظرة عامة");

  const totalSpend = useMemo(
    () => initialData.accounts.reduce((sum, account) => sum + account.spend, 0),
    [initialData.accounts],
  );

  const toggleAgent = () => {
    setAgentMode((mode) => (mode === "autopilot" ? "paused" : "autopilot"));
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar--open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">WS</div>
          <div>
            <strong>White Style</strong>
            <span>Smart Agent</span>
          </div>
          <button className="icon-button sidebar-close" onClick={() => setMobileMenu(false)} aria-label="إغلاق القائمة">
            <X size={18} />
          </button>
        </div>

        <div className="agent-mini-card">
          <div className="agent-orb"><Bot size={20} /></div>
          <div className="agent-mini-copy">
            <div><span className={`live-dot ${agentMode === "paused" ? "live-dot--paused" : ""}`} />حالة الـAgent</div>
            <strong>{agentMode === "autopilot" ? "يعمل باستقلالية" : "متوقف مؤقتًا"}</strong>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="التنقل الرئيسي">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.label;
            return (
              <button
                key={item.label}
                className={active ? "nav-item nav-item--active" : "nav-item"}
                onClick={() => {
                  setActiveNav(item.label);
                  setMobileMenu(false);
                }}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.label === "قرارات الـAgent" && <b>3</b>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-avatar">AN</div>
          <div><strong>مدير النظام</strong><span>NTN Operations</span></div>
          <ChevronDown size={16} />
        </div>
      </aside>

      {mobileMenu && <button className="mobile-overlay" aria-label="إغلاق القائمة" onClick={() => setMobileMenu(false)} />}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-title">
            <button className="icon-button menu-button" onClick={() => setMobileMenu(true)} aria-label="فتح القائمة">
              <Menu size={21} />
            </button>
            <div>
              <p>صباح الخير، جاهز لتحسين الأداء؟</p>
              <h1>{activeNav}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="demo-badge"><Sparkles size={14} />بيانات تجريبية واقعية</div>
            <button className="icon-button notification-button" onClick={() => setNotificationsOpen((open) => !open)} aria-label="التنبيهات">
              <Bell size={20} />
              <span>3</span>
            </button>
            <button className="sync-button"><RefreshCw size={16} />آخر مزامنة: منذ 4 دقائق</button>
          </div>
        </header>

        {notificationsOpen && (
          <section className="notification-panel" aria-label="التنبيهات الحديثة">
            <div className="panel-heading"><strong>التنبيهات</strong><button className="icon-button" onClick={() => setNotificationsOpen(false)}><X size={17} /></button></div>
            <div className="notification-item"><TriangleAlert size={18} /><div><strong>الحساب الثالث غير مربوط</strong><span>أضف Meta API عند توفره.</span></div></div>
            <div className="notification-item"><CheckCircle2 size={18} /><div><strong>نُفّذ قراران بنجاح</strong><span>تم التحقق من الحالة في Meta.</span></div></div>
            <div className="notification-item"><Activity size={18} /><div><strong>ارتفاع تكرار الحساب الثاني</strong><span>بدأ الـAgent مراقبة التشبع.</span></div></div>
          </section>
        )}

        <section className="agent-command-card">
          <div className="command-main">
            <div className="agent-large-icon"><BrainCircuit size={28} /></div>
            <div>
              <div className="command-title"><h2>White Style Smart Agent</h2><span className="status-pill"><i />{agentMode === "autopilot" ? "Autopilot نشط" : "متوقف"}</span></div>
              <p>{agentMode === "autopilot" ? "يراقب 156 إعلانًا ويملك صلاحية التحسين التلقائي ضمن حدود الحماية." : "تم إيقاف التنفيذ مؤقتًا. يستمر جمع البيانات دون تعديل الحملات."}</p>
            </div>
          </div>
          <div className="command-stats">
            <div><span>الفحص القادم</span><strong>07:42</strong></div>
            <div><span>قرارات اليوم</span><strong>7</strong></div>
            <div><span>آخر ثقة</span><strong>99%</strong></div>
          </div>
          <button className={agentMode === "autopilot" ? "agent-control agent-control--pause" : "agent-control"} onClick={toggleAgent}>
            {agentMode === "autopilot" ? <Pause size={17} /> : <Play size={17} />}
            {agentMode === "autopilot" ? "إيقاف مؤقت" : "تشغيل Autopilot"}
          </button>
        </section>

        <section className="metrics-grid">
          {initialData.metrics.map((metric, index) => {
            const icons = [CircleDollarSign, MessageCircleMore, Gauge, TriangleAlert];
            const Icon = icons[index];
            return (
              <article className="metric-card" key={metric.label}>
                <div className={`metric-icon metric-icon--${index + 1}`}><Icon size={21} /></div>
                <div className="metric-label">{metric.label}</div>
                <strong className="metric-value">{metric.value}</strong>
                <div className="metric-foot">
                  <span className={`metric-change metric-change--${metric.trend}`}>
                    {metric.trend === "up" && <TrendingUp size={14} />}
                    {metric.trend === "down" && <TrendingDown size={14} />}
                    {metric.change}
                  </span>
                  <small>{metric.helper}</small>
                </div>
              </article>
            );
          })}
        </section>

        <section className="content-grid">
          <article className="panel performance-panel">
            <div className="panel-heading">
              <div><span className="eyebrow">اتجاه الأداء</span><h2>الإنفاق مقابل المحادثات</h2></div>
              <div className="period-switch">
                {["7 أيام", "14 يومًا", "30 يومًا"].map((item) => (
                  <button key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item}</button>
                ))}
              </div>
            </div>
            <div className="chart-summary">
              <div><i className="legend-dot legend-dot--green" /><span>المحادثات</span><strong>15,299</strong><small>+8.4%</small></div>
              <div><i className="legend-dot legend-dot--blue" /><span>الإنفاق</span><strong>{formatCurrency(totalSpend)}</strong><small>-3.1%</small></div>
            </div>
            <div className="combined-chart">
              <LineChart values={initialData.conversationSeries} variant="green" />
              <LineChart values={initialData.spendSeries} variant="blue" />
            </div>
            <div className="chart-axis"><span>9 يونيو</span><span>16 يونيو</span><span>23 يونيو</span><span>30 يونيو</span><span>8 يوليو</span></div>
          </article>

          <article className="panel insight-panel">
            <div className="panel-heading"><div><span className="eyebrow">تحليل لحظي</span><h2>ما الذي يراه الـAgent؟</h2></div><Zap size={20} /></div>
            <div className="insight-score">
              <div className="score-ring"><strong>74</strong><span>/100</span></div>
              <div><strong>كفاءة جيدة قابلة للتحسين</strong><p>الحساب الأول مستقر، بينما يحتاج الحساب الثاني إلى معالجة التشبع والإعلانات الشديدة الغلاء.</p></div>
            </div>
            <div className="insight-list">
              <div><CheckCircle2 size={17} /><span>58% من الإنفاق يعمل ضمن المعيار</span></div>
              <div><TriangleAlert size={17} /><span>$4,899 تحت المراقبة وليس هدرًا مؤكدًا</span></div>
              <div><Bot size={17} /><span>3 إجراءات تحت التحقق بعد التنفيذ</span></div>
            </div>
          </article>
        </section>

        <section className="content-grid content-grid--bottom">
          <article className="panel accounts-panel">
            <div className="panel-heading"><div><span className="eyebrow">الحسابات</span><h2>كفاءة الإنفاق الإعلاني</h2></div><button className="text-button">عرض التفاصيل</button></div>
            <div className="account-table">
              <div className="table-row table-head"><span>الحساب</span><span>الإنفاق</span><span>المحادثات</span><span>التكلفة</span><span>الكفاءة</span></div>
              {initialData.accounts.map((account) => (
                <div className="table-row" key={account.id}>
                  <div className="account-name"><i className={`account-state account-state--${account.status}`} /><span>{account.name}<small>{account.status === "critical" ? "بانتظار الربط" : "متصل ونشط"}</small></span></div>
                  <strong>{account.spend ? formatCurrency(account.spend) : "—"}</strong>
                  <strong>{account.conversations ? account.conversations.toLocaleString("en-US") : "—"}</strong>
                  <strong>{account.cpr ? `$${account.cpr.toFixed(2)}` : "—"}</strong>
                  <div className="efficiency"><div><i style={{ width: `${account.efficiency}%` }} /></div><span>{account.efficiency || "—"}{account.efficiency ? "%" : ""}</span></div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel actions-panel">
            <div className="panel-heading"><div><span className="eyebrow">التنفيذ الذاتي</span><h2>آخر قرارات الـAgent</h2></div><button className="search-button" aria-label="بحث"><Search size={17} /></button></div>
            <div className="actions-list">
              {initialData.actions.map((action) => (
                <div className="action-row" key={action.id}>
                  <div className={`action-symbol action-symbol--${action.status}`}>
                    {action.status === "executed" ? <Zap size={17} /> : action.status === "watching" ? <Activity size={17} /> : <ShieldCheck size={17} />}
                  </div>
                  <div className="action-copy"><strong>{action.title}</strong><p>{action.detail}</p><span>{action.account} · {action.timestamp}</span></div>
                  <div className="action-meta"><strong>{action.amount}</strong><span className={`action-status action-status--${action.status}`}>{statusLabels[action.status]}</span><small>ثقة {action.confidence}%</small></div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
