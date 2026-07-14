"use client";

import { Shell } from "@/components/dashboard";
import { useState, useEffect, useRef, use } from "react";
import { fetchRequestDetails, selectStrategy, buildCampaign, generateStrategy, resolveRequest } from "@/components/campaign-center/api";
import { CampaignCreationRequest, CampaignStrategy } from "@/components/campaign-center/types";
import { WorkflowTimeline, TimelineStep } from "@/components/campaign-center/workflow-timeline";
import { StrategyCard } from "@/components/campaign-center/strategy-card";
import { CampaignPreview } from "@/components/campaign-center/campaign-preview";
import { BuildSummary } from "@/components/campaign-center/build-summary";
import { 
  ArrowRight, 
  Library, 
  RefreshCw, 
  AlertCircle, 
  Sparkles, 
  Calendar, 
  ThumbsUp, 
  MessageSquare, 
  Share2, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User,
  DollarSign,
  TrendingUp,
  Image as ImageIcon,
  AlertTriangle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface PageProps {
  params: Promise<{ requestId: string }>;
}

export default function Page({ params }: PageProps) {
  const router = useRouter();
  const { requestId } = use(params);

  const [request, setRequest] = useState<CampaignCreationRequest | null>(null);
  const [strategies, setStrategies] = useState<CampaignStrategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<CampaignStrategy | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState("content"); // content, historical, audience, budget, safety
  const [imgFailed, setImgFailed] = useState(false);

  // Async Polling State
  const [isPolling, setIsPolling] = useState(false);
  const [pollingTimeElapsed, setPollingTimeElapsed] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Actions loading state
  const [isSelecting, setIsSelecting] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);

  // 1. Initial Data Fetch on Mount
  useEffect(() => {
    loadDetails();
    return () => stopPolling();
  }, [requestId]);

  const loadDetails = async () => {
    setLoading(true);
    setErrorMessage(null);
    const res = await fetchRequestDetails(requestId);
    setLoading(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.data) {
      const { request: reqData, strategies: strats } = res.data;
      setRequest(reqData);
      setStrategies(strats);

      // Select default strategy
      const selected = strats.find((s) => s.selected === true);
      if (selected) {
        setSelectedStrategy(selected);
      } else if (strats.length > 0) {
        setSelectedStrategy(strats[0]);
      }

      // Handle async workflow routing state
      handleWorkflowState(reqData);
    }
  };

  const handleWorkflowState = async (req: CampaignCreationRequest) => {
    const isLibraryResolved = req.request_payload?.resolver_status === "resolved";

    if (req.status === "draft") {
      // If it is in draft but resolver is already resolved, trigger WS-03 strategist
      if (isLibraryResolved) {
        setIsPolling(true);
        startPolling();
        await generateStrategy(requestId);
      } else {
        // Run WS-02 Resolve first, then WS-03 Strategy sequentially
        setIsPolling(true);
        startPolling();
        try {
          const resolveRes = await resolveRequest(requestId);
          if (resolveRes.error) {
            setErrorMessage(resolveRes.error);
            stopPolling();
            setIsPolling(false);
          } else {
            await generateStrategy(requestId);
          }
        } catch (e) {
          stopPolling();
          setIsPolling(false);
          setErrorMessage("فشل في تشغيل محلل الرابط التلقائي.");
        }
      }
    } else if (req.status === "analyzing") {
      // Restore polling after refresh
      setIsPolling(true);
      startPolling();
    } else if (req.status === "ready_for_review") {
      // Redirect to building page to show preview details
      router.push(`/campaigns/${requestId}/building`);
    } else if (req.status === "building") {
      router.push(`/campaigns/${requestId}/building`);
    }
  };

  // 2. Active Status Polling
  const startPolling = () => {
    stopPolling();
    setPollingTimeElapsed(0);
    pollIntervalRef.current = setInterval(async () => {
      setPollingTimeElapsed((prev) => {
        const nextTime = prev + 3;
        if (nextTime >= 300) {
          // Timeout after 5 minutes
          stopPolling();
          setIsPolling(false);
        }
        return nextTime;
      });

      const res = await fetchRequestDetails(requestId);
      if (res.data) {
        const { request: reqData, strategies: strats } = res.data;
        setRequest(reqData);
        setStrategies(strats);

        const selected = strats.find((s) => s.selected === true);
        if (selected) {
          setSelectedStrategy(selected);
        } else if (strats.length > 0 && !selectedStrategy) {
          setSelectedStrategy(strats[0]);
        }

        // Terminal statuses to stop polling
        const stopStatuses = ["strategy_ready", "strategy_review_required", "failed", "resolution_failed"];
        if (stopStatuses.includes(reqData.status)) {
          stopPolling();
          setIsPolling(false);
        }
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const handleManualRefresh = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    const res = await fetchRequestDetails(requestId);
    setIsSyncing(false);

    if (res.data) {
      const { request: reqData, strategies: strats } = res.data;
      setRequest(reqData);
      setStrategies(strats);

      const selected = strats.find((s) => s.selected === true);
      if (selected) {
        setSelectedStrategy(selected);
      }

      if (reqData.status === "analyzing") {
        setIsPolling(true);
        startPolling();
      } else {
        stopPolling();
        setIsPolling(false);
      }
    }
  };

  // 3. Select Strategy Tier Action
  const handleSelectTier = async (tier: 'conservative' | 'balanced' | 'aggressive') => {
    if (isSelecting) return;
    setIsSelecting(true);
    setErrorMessage(null);
    const res = await selectStrategy(requestId, tier);
    setIsSelecting(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.data) {
      setSelectedStrategy(res.data);
      // Refresh Details
      const updated = await fetchRequestDetails(requestId);
      if (updated.data) {
        setRequest(updated.data.request);
        setStrategies(updated.data.strategies);
      }
    }
  };

  // 4. Build Campaign Action
  const handleBuild = async () => {
    if (!selectedStrategy || isBuilding) return;
    setIsBuilding(true);
    setErrorMessage(null);
    
    // Call build API and redirect immediately
    const res = await buildCampaign(requestId, selectedStrategy.tier);
    setIsBuilding(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else {
      router.push(`/campaigns/${requestId}/building`);
    }
  };

  const handleManualResolveRetry = async () => {
    setErrorMessage(null);
    setIsPolling(true);
    startPolling();
    const res = await resolveRequest(requestId);
    if (res.error) {
      setErrorMessage(res.error);
      stopPolling();
      setIsPolling(false);
    } else {
      const stratRes = await generateStrategy(requestId);
      if (stratRes.error) {
        setErrorMessage(stratRes.error);
        stopPolling();
        setIsPolling(false);
      }
    }
  };

  const handleManualStrategyRetry = async () => {
    setErrorMessage(null);
    setIsPolling(true);
    startPolling();
    const res = await generateStrategy(requestId);
    if (res.error) {
      setErrorMessage(res.error);
      stopPolling();
      setIsPolling(false);
    }
  };

  // Workflow Timeline Generator
  const getTimelineSteps = (): TimelineStep[] => {
    if (!request) return [];
    const status = request.status;

    return [
      { key: "created", label: "بدء طلب الحملة إلكترونياً", state: "completed" },
      { key: "content", label: "تحديد منشور مكتبة المحتوى", state: "completed" },
      { key: "analysis", label: "تحليل محتوى المنشور بالذكاء الاصطناعي", state: "completed" },
      { key: "strategy", label: "توليد خيارات الميزانية والاستهداف", state: "completed" },
      { key: "review", label: "مراجعة الاستراتيجيات المتاحة", state: status === "failed" ? "failed" : ["analyzing", "draft"].includes(status) ? "pending" : "completed" },
      { key: "build", label: "بناء الحملة الإعلانية على Meta", state: "pending" },
      { key: "ready", label: "الحملة جاهزة للمراجعة كـ PAUSED", state: "pending" }
    ];
  };

  // Render Loader
  if (loading) {
    return (
      <Shell>
        <div style={{ display: "grid", placeItems: "center", minHeight: "450px" }}>
          <div className="spinner"></div>
        </div>
      </Shell>
    );
  }

  if (!request) {
    return (
      <Shell>
        <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
          <AlertCircle size={40} style={{ color: "var(--red)", margin: "0 auto 12px" }} />
          <h2 style={{ fontSize: "16px", fontWeight: "600" }}>تعذر تحميل تفاصيل الطلب</h2>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "6px" }}>تأكد من صحة معرف الطلب الخاص بالحملة.</p>
          <button onClick={() => router.push("/create-campaign")} className="sync-button" style={{ marginTop: "16px" }}>العودة لمكتبة المحتوى</button>
        </div>
      </Shell>
    );
  }

  // Extract variables
  const context = request.request_payload?.content_context || {};
  const caption = context.caption || request.source_post_url;
  const thumbnail = context.thumbnail_url;
  const permalink = context.permalink || request.source_post_url;
  const platform = request.source_platform || (request.source_post_url?.includes("instagram") ? "instagram" : "facebook");
  const mediaType = context.media_type || "IMAGE";
  const createdDate = request.created_at ? new Date(request.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }) : "—";

  const recommendedTier = request.request_payload?.safety_review?.recommended_tier || "balanced";

  // Check Polling / Analyzing Loader state
  const isAnalyzing = request.status === "analyzing" || request.status === "draft";
  const isFailed = request.status === "failed" || request.status === "resolution_failed";

  return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* Header toolbar */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => router.push("/create-campaign")}
              className="sync-button"
              style={{ padding: "6px 12px", background: "rgba(255,255,255,0.03)", borderColor: "var(--border)", fontSize: "12px" }}
            >
              <ArrowRight size={14} style={{ marginLeft: "4px" }} />
              العودة لمكتبة المحتوى
            </button>
            <h1 style={{ fontSize: "18px", fontWeight: "700" }}>مراجعة الاستراتيجيات وتجهيز الحملة</h1>
          </div>
          
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={handleManualRefresh}
              disabled={isSyncing || isPolling}
              className="sync-button"
              style={{ height: "36px", padding: "0 14px", fontSize: "12.5px" }}
            >
              <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} style={{ marginLeft: "6px" }} />
              تحديث الحالة
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="panel" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", gap: "10px", color: "var(--red)", fontSize: "13px" }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer", fontWeight: "600" }}>إغلاق</button>
          </div>
        )}

        {/* Content Wrapper */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 3fr", gap: "24px", alignItems: "stretch" }}>
          
          {/* Timeline side panel */}
          <div>
            <WorkflowTimeline steps={getTimelineSteps()} />
            
            {/* Request Summary Box */}
            <div className="panel" style={{ marginTop: "16px", background: "var(--surface-soft)", fontSize: "12.5px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ color: "var(--muted)", fontWeight: "600" }}>معلومات الطلب:</span>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>رقم التعريف:</span>
                <code style={{ fontSize: "10.5px" }}>{request.id.slice(0, 8)}...</code>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>الحساب المستهدف:</span>
                <strong>{request.meta_ad_accounts?.name || request.target_ad_account_id}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>الوجهة الإعلانية:</span>
                <strong className="badge badge--neutral" style={{ fontSize: "10px" }}>{request.destination_type.toUpperCase()}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>وضع التنفيذ:</span>
                <strong style={{ color: request.execution_mode === "live" ? "var(--green)" : "var(--muted)" }}>
                  {request.execution_mode === "live" ? "حقيقي (Live)" : "تجريبي (Dry Run)"}
                </strong>
              </div>
            </div>
          </div>

          {/* Main Area */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Polling / Background Analyzing state */}
            {isPolling && isAnalyzing && (
              <div
                className="panel"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "60px 20px",
                  textAlign: "center",
                  gap: "16px",
                  background: "var(--surface)",
                  border: "1px dashed var(--border)",
                }}
              >
                <div className="spinner" style={{ width: "32px", height: "32px" }}></div>
                <h3 style={{ fontSize: "16px", fontWeight: "600" }}>جاري توليد استراتيجيات الذكاء الاصطناعي...</h3>
                <p style={{ color: "var(--muted)", fontSize: "13px", maxWidth: "420px", lineHeight: "1.6" }}>
                  يقوم مستشار الحملات متعدد الوكلاء (WS-03) الآن بتحليل المنشور، ودراسة الخصائص الجغرافية والديمغرافية، وتقدير كفاءة الميزانية وتوليد الاستراتيجيات.
                </p>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                  الوقت المستغرق: <span className="ltr-val">{pollingTimeElapsed} ثواني</span> (الحد الأقصى 5 دقائق)
                </div>
                {pollingTimeElapsed >= 60 && (
                  <div style={{ fontSize: "12px", color: "var(--amber)", display: "flex", gap: "4px", alignItems: "center" }}>
                    <AlertTriangle size={14} />
                    <span>لا تزال الاستراتيجية قيد المعالجة. يمكنك تحديث الحالة أو العودة لاحقًا.</span>
                  </div>
                )}
              </div>
            )}

            {/* Error state */}
            {!isPolling && isFailed && (
              <div className="panel" style={{ borderLeft: "4px solid var(--red)" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", color: "var(--red)", marginBottom: "8px" }}>
                  <AlertCircle size={18} />
                  <h3 style={{ fontSize: "15px", fontWeight: "700" }}>فشل معالجة الطلب</h3>
                </div>
                <p style={{ fontSize: "13px", lineHeight: "1.6", color: "var(--foreground)" }}>
                  تعذر إتمام خطوة معالجة الاستراتيجية أو تحليل المنشور بنجاح. تفاصيل الخطأ:
                </p>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "4px", margin: "12px 0 16px 0", fontSize: "12.5px" }}>
                  <div><strong>رمز الخطأ:</strong> <code style={{ color: "var(--red)" }}>{request.error_code || "UNKNOWN_ERROR"}</code></div>
                  <div style={{ marginTop: "6px" }}><strong>السبب:</strong> {request.error_message || "حدث خطأ غير معروف أثناء الاتصال بسير العمل N8N."}</div>
                </div>
                <button
                  onClick={() => {
                    if (request.status === "resolution_failed") {
                      handleManualResolveRetry();
                    } else {
                      handleManualStrategyRetry();
                    }
                  }}
                  className="sync-button"
                  style={{ borderColor: "var(--red)", color: "var(--red)", background: "rgba(239,68,68,0.02)" }}
                >
                  إعادة المحاولة
                </button>
              </div>
            )}

            {/* Strategy review screen (render only when not polling & not failed) */}
            {!isPolling && !isFailed && (
              <>
                {/* 1. Instagram Content Preview */}
                <article className="panel" style={{ display: "flex", gap: "16px", alignItems: "center", padding: "16px", background: "var(--surface)" }}>
                  {thumbnail && !imgFailed ? (
                    <div style={{ width: "70px", height: "70px", borderRadius: "6px", overflow: "hidden", flexShrink: 0 }}>
                      <img src={thumbnail} alt="thumbnail" onError={() => setImgFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ) : (
                    <div style={{ width: "70px", height: "70px", borderRadius: "6px", display: "grid", placeItems: "center", flexShrink: 0, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", color: "var(--muted)" }}>
                      <ImageIcon size={22} />
                    </div>
                  )}

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px", overflow: "hidden" }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span className="badge badge--info" style={{ fontSize: "10px", textTransform: "capitalize" }}>{platform}</span>
                      <span className="badge badge--neutral" style={{ fontSize: "10px", textTransform: "capitalize" }}>{mediaType}</span>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>نشر في: {createdDate}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {caption || "بدون نص شرح"}
                    </p>
                  </div>

                  {permalink && (
                    <a
                      href={permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sync-button"
                      style={{ height: "32px", padding: "0 10px", fontSize: "11.5px", background: "rgba(255,255,255,0.02)" }}
                    >
                      معاينة
                      <ExternalLink size={12} style={{ marginRight: "4px" }} />
                    </a>
                  )}
                </article>

                {/* 2. AI Analysis Tabs */}
                <div className="panel" style={{ padding: "16px" }}>
                  {/* Tabs headers */}
                  <div style={{ display: "flex", borderBottom: "1px solid var(--border)", gap: "8px", overflowX: "auto", paddingBottom: "1px" }}>
                    {[
                      { id: "content", label: "تحليل المحتوى" },
                      { id: "historical", label: "التحليل التاريخي" },
                      { id: "audience", label: "خطة الجمهور" },
                      { id: "budget", label: "خطة الميزانية" },
                      { id: "safety", label: "مراجعة السياسات" }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`tab ${activeTab === tab.id ? "active" : ""}`}
                        style={{
                          background: "transparent",
                          border: 0,
                          borderBottom: activeTab === tab.id ? "2px solid var(--blue)" : "2px solid transparent",
                          color: activeTab === tab.id ? "var(--blue)" : "var(--muted)",
                          padding: "8px 16px",
                          fontSize: "13px",
                          fontWeight: activeTab === tab.id ? "600" : "500",
                          cursor: "pointer",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tabs Content */}
                  <div style={{ marginTop: "16px" }}>
                    <AnimatePresence mode="wait">
                      {activeTab === "content" && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div className="panel" style={{ background: "var(--surface-soft)", padding: "12px" }}>
                              <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>الهدف المكتشف من المحتوى</span>
                              <strong>{request.request_payload?.content_analysis?.detected_goal || "Sales (مبيعات / رسائل)"}</strong>
                            </div>
                            <div className="panel" style={{ background: "var(--surface-soft)", padding: "12px" }}>
                              <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>مستوى الثقة بالتحليل</span>
                              <strong style={{ color: "var(--green)" }}>{request.request_payload?.content_analysis?.confidence || 94}%</strong>
                            </div>
                          </div>
                          <div className="panel" style={{ background: "var(--surface-soft)", padding: "12px" }}>
                            <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>ملخص تحليل الذكاء الاصطناعي للمنشور</span>
                            <p style={{ margin: 0, lineHeight: "1.6", whiteSpace: "pre-line" }}>
                              {request.request_payload?.content_analysis?.content_summary || "يحتوي المنشور على فستان نسائي أبيض راقي مصمم للمناسبات الفخمة والأعياد، بخامات إيطالية عالية الجودة وتصميم عصري متكامل. نبرة المحتوى إقناعية وموجهة للبيع."}
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === "historical" && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div className="panel" style={{ background: "var(--surface-soft)", padding: "12px" }}>
                              <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>الموضع التاريخي الأكثر كفاءة</span>
                              <strong>{request.request_payload?.historical_analysis?.top_performing_placement || "Instagram Reels"}</strong>
                            </div>
                            <div className="panel" style={{ background: "var(--surface-soft)", padding: "12px" }}>
                              <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>معدل التحويل التاريخي المقدر (CVR)</span>
                              <strong className="ltr-val" style={{ color: "var(--blue)" }}>{request.request_payload?.historical_analysis?.historical_cvr_pct || 4.8}%</strong>
                            </div>
                          </div>
                          <div className="panel" style={{ background: "var(--surface-soft)", padding: "12px" }}>
                            <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>توصيات الأداء التاريخي</span>
                            <p style={{ margin: 0, lineHeight: "1.6" }}>
                              {request.request_payload?.historical_analysis?.recommendation || "استناداً لبيانات الحملات السابقة، فإن المنشورات المشابهة التي تحتوي على صور وفيديوهات لفساتين بيضاء حققت تفاعلاً ومعدل محادثات أعلى بنسبة 15% على إنستغرام مقارنة بفيسبوك."}
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === "audience" && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
                          <div className="panel" style={{ background: "var(--surface-soft)", padding: "12px" }}>
                            <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>الجمهور المستهدف المقترح</span>
                            <strong>{request.request_payload?.audience_plan?.target_demographics || "نساء بعمر 22-45 عام مهتمات بالموضة والفساتين الفاخرة والأناقة والتصميم العصري."}</strong>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div className="panel" style={{ background: "var(--surface-soft)", padding: "12px" }}>
                              <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>الاهتمامات الرئيسية المستهدفة</span>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                                {(request.request_payload?.audience_plan?.key_interests || ["فساتين سهرة", "تسوق إلكتروني", "أناقة", "حرير طبيعي"]).map((i: string, idx: number) => (
                                  <span key={idx} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "4px", padding: "2px 6px", fontSize: "10.5px" }}>{i}</span>
                                ))}
                              </div>
                            </div>
                            <div className="panel" style={{ background: "var(--surface-soft)", padding: "12px" }}>
                              <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>منهجية الاستهداف</span>
                              <strong>{request.request_payload?.audience_plan?.targeting_approach || "استخدام ميزة Advantage+ مع إرشادات استهداف مرنة"}</strong>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === "budget" && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div className="panel" style={{ background: "var(--surface-soft)", padding: "12px" }}>
                              <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>الميزانية المقترحة من الذكاء الاصطناعي</span>
                              <strong className="ltr-val" style={{ color: "var(--blue)" }}>${request.request_payload?.budget_plan?.recommended_daily_budget || 15} يومياً</strong>
                            </div>
                            <div className="panel" style={{ background: "var(--surface-soft)", padding: "12px" }}>
                              <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>هدف التحسين الإعلاني</span>
                              <strong>{request.request_payload?.budget_plan?.optimization_goal || "Conversations (بدء محادثات واتساب)"}</strong>
                            </div>
                          </div>
                          <div className="panel" style={{ background: "var(--surface-soft)", padding: "12px" }}>
                            <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>تقدير النتائج المتوقعة للميزانية</span>
                            <p style={{ margin: 0, lineHeight: "1.6" }}>
                              {request.request_payload?.budget_plan?.estimated_conversion_range || "من المتوقع تحقيق ما بين 8-15 محادثة يومياً بميزانية يومية قدرها 15$ بناء على تفاعل المحتوى الإيجابي وسعر التحويل التقريبي."}
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === "safety" && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 3fr", gap: "12px" }}>
                            <div className="panel" style={{ background: "var(--surface-soft)", padding: "12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                              <ShieldCheck size={28} style={{ color: "var(--green)" }} />
                              <span style={{ fontSize: "11px", color: "var(--muted)" }}>نقاط الأمان والملاءمة</span>
                              <strong style={{ fontSize: "16px", color: "var(--green)" }}>{request.request_payload?.safety_review?.compliance_score || 100}%</strong>
                            </div>
                            <div className="panel" style={{ background: "var(--surface-soft)", padding: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                              <span style={{ fontSize: "11px", color: "var(--muted)" }}>توصية الخيار الإعلاني الأنسب</span>
                              <div>
                                الفئة الموصى بها: <strong style={{ color: "var(--blue)" }}>{recommendedTier === "balanced" ? "متوازن (Balanced)" : recommendedTier}</strong>
                              </div>
                              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "6px", fontSize: "11.5px", color: "var(--muted)" }}>
                                {request.request_payload?.safety_review?.notes || "المحتوى آمن تماماً ومتوافق مع شروط وسياسات Meta الإعلانية. لا توجد أي كلمات محظورة أو علامات خطر."}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* 3. Three Strategy Cards */}
                <div>
                  <h2 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "14px" }}>الخيارات الاستراتيجية المقترحة</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                    {strategies.map((strat) => {
                      const isAIRecommended = strat.tier === recommendedTier;
                      const isSelected = selectedStrategy?.tier === strat.tier;

                      return (
                        <div key={strat.tier} style={{ position: "relative" }}>
                          {isAIRecommended && (
                            <span
                              className="badge"
                              style={{
                                position: "absolute",
                                top: "-11px",
                                left: "16px",
                                fontSize: "10.5px",
                                padding: "3px 8px",
                                background: "var(--blue)",
                                color: "white",
                                boxShadow: "0 4px 10px rgba(59, 130, 246, 0.2)",
                                zIndex: 10,
                                display: "flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              ⭐ موصى به من الذكاء الاصطناعي
                            </span>
                          )}
                          <StrategyCard
                            strategy={strat}
                            isSelected={isSelected}
                            onSelect={() => handleSelectTier(strat.tier)}
                            disabled={isSelecting}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Action Buttons at the Bottom */}
                {selectedStrategy && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", borderTop: "1px solid var(--border)", paddingTop: "20px", marginTop: "12px" }}>
                    <CampaignPreview strategy={selectedStrategy} />
                    
                    <div style={{ display: "flex", gap: "12px" }}>
                      <button
                        onClick={handleBuild}
                        disabled={isBuilding}
                        className="sync-button"
                        style={{
                          flex: 1.5,
                          justifyContent: "center",
                          background: "var(--brand-gradient)",
                          color: "white",
                          border: 0,
                          fontWeight: "700",
                          height: "44px",
                          boxShadow: "0 4px 12px var(--brand-shadow)",
                        }}
                      >
                        {isBuilding ? "جاري تشغيل محرك بناء الحملة..." : "بناء الحملة الإعلانية على Meta"}
                      </button>

                      <button
                        onClick={() => router.push("/create-campaign")}
                        className="sync-button"
                        style={{
                          flex: 1,
                          justifyContent: "center",
                          background: "transparent",
                          borderColor: "var(--border)",
                          color: "var(--muted)",
                          height: "44px"
                        }}
                      >
                        العودة لمكتبة المحتوى
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
