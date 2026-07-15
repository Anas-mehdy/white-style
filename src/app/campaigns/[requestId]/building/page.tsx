"use client";

import { Shell } from "@/components/dashboard";
import { useState, useEffect, useRef, use, useMemo } from "react";
import { fetchRequestDetails, buildCampaign, generateStrategy, selectStrategy } from "@/components/campaign-center/api";
import { CampaignCreationRequest, CampaignStrategy, AITransparency } from "@/components/campaign-center/types";
import { StrategyCard } from "@/components/campaign-center/strategy-card";
import { normalizeTransparency } from "@/lib/campaign-transparency";
import {
  translateObjective,
  translateGender,
  translatePlacement,
  translateCountry,
  translateStatus,
  translateCategory,
  formatFallbackValue
} from "@/lib/campaign-translation/dictionaries";
import { 
  X, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  Play, 
  FileCheck, 
  Trash2, 
  ArrowLeft,
  Settings, 
  ShieldAlert,
  Info,
  Calendar,
  Layers,
  RefreshCw,
  Terminal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  DollarSign,
  MapPin,
  Users,
  Compass
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { formatArabicDate } from "@/lib/readable-helpers";

interface PageProps {
  params: Promise<{ requestId: string }>;
}

export default function Page({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextStepParam = searchParams ? searchParams.get("next_step") : null;
  const { requestId } = use(params);

  const [request, setRequest] = useState<CampaignCreationRequest | null>(null);
  const [strategies, setStrategies] = useState<CampaignStrategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<CampaignStrategy | null>(null);

  const transparency = useMemo(() => {
    if (!request) return null;
    const trans = normalizeTransparency(request, strategies);
    
    // Whitelisted development diagnostics logging
    if (process.env.NODE_ENV === "development") {
      const discoveredSections = [];
      if (trans.contentAnalysis.summary) discoveredSections.push("contentAnalysis");
      if (trans.historicalAnalysis.rationale) discoveredSections.push("historicalAnalysis");
      if (trans.audienceSelection.rationale) discoveredSections.push("audienceSelection");
      if (trans.budgeting.dailyBudget !== null) discoveredSections.push("budgeting");
      if (trans.safetyCheck.strategy) discoveredSections.push("safetyCheck");

      console.log("[CLIENT_DEV_DIAGNOSTICS_TRANSPARENCY]", {
        requestId: request.id,
        selectedStrategyId: selectedStrategy?.tier || null,
        discoveredSections,
        transparency: trans
      });
    }
    
    return trans;
  }, [request, strategies, selectedStrategy]);

  const [showArabicTranslation, setShowArabicTranslation] = useState<boolean>(true);
  const [translatedTransparency, setTranslatedTransparency] = useState<AITransparency | null>(null);
  const [translationLoading, setTranslationLoading] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  useEffect(() => {
    if (!request) return;
    if (request.status === "analyzing") return;

    let active = true;

    async function fetchTranslation() {
      setTranslationLoading(true);
      setTranslationError(null);
      try {
        const response = await fetch(`/api/campaigns/${requestId}/translate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        });
        if (!active) return;
        
        let result: any = null;
        try {
          result = await response.json();
        } catch {
          console.error("[TRANSLATION_HTTP_ERROR]", response.status, response.statusText);
        }

        if (response.ok && result?.translated) {
          setTranslatedTransparency(result.translated);
        } else {
          const errMsg = result?.error || `خطأ في الخادم (Status: ${response.status})`;
          console.error("[TRANSLATION_API_ERROR]", errMsg);
          setTranslationError(errMsg);
        }
      } catch (err: any) {
        if (active) {
          console.error("[TRANSLATION_CONN_ERROR]", err);
          setTranslationError(err?.message || "خطأ في الاتصال بالخادم");
        }
      } finally {
        if (active) {
          setTranslationLoading(false);
        }
      }
    }

    fetchTranslation();

    return () => {
      active = false;
    };
  }, [requestId, request?.id, request?.status, request?.updated_at]);
  const displayTransparency = (showArabicTranslation && translatedTransparency)
    ? translatedTransparency
    : transparency;

  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBuildingRetry, setIsBuildingRetry] = useState(false);

  // V2 Settings & Automation state
  const [expertMode, setExpertMode] = useState<boolean | null>(null);
  const [isAutoBuilding, setIsAutoBuilding] = useState<boolean>(false);
  const [isLogOpen, setIsLogOpen] = useState<boolean>(false);
  const [isDecisionOpen, setIsDecisionOpen] = useState<boolean>(false);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [isStaleDataState, setIsStaleDataState] = useState<boolean>(false);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);

  const strategyTriggeredRef = useRef(false);
  const buildTriggeredRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const progressSteps = [
    { key: "created", label: "إنشاء طلب الترويج الذكي (Request Created)" },
    { key: "resolver", label: "استقبال وحل المحتوى من المكتبة (Content Library Intake)" },
    { key: "content_analysis", label: "تحليل المحتوى بالذكاء الاصطناعي (Content AI Analysis)" },
    { key: "historical_analysis", label: "التحليل التاريخي والمنصات (Historical Data Query)" },
    { key: "audience_plan", label: "تخطيط الجمهور المستهدف (Target Audience Planning)" },
    { key: "budget_plan", label: "توزيع وتخطيط الموازنة الإعلانية (Budget Strategy Allocation)" },
    { key: "safety_review", label: "مراجعة الأمان والامتثال للسياسات (Safety & Compliance Review)" },
    { key: "strategy_selected", label: "تحديد واختيار استراتيجية Meta الأنسب (Strategy Engine Run)" },
    { key: "meta_campaign", label: "إنشاء الحملة الإعلانية (Creating Meta Campaign)" },
    { key: "meta_adset", label: "تهيئة المجموعة الإعلانية والاستهداف (Configuring Meta Ad Set)" },
    { key: "meta_creative", label: "رفع وتجهيز التصميم والنص الإعلاني (Uploading Ad Creative)" },
    { key: "meta_ad", label: "نشر الإعلان وتفعيل التتبع (Deploying Live Advertisement)" }
  ];

  // 1. Fetch initial details & Settings on mount
  useEffect(() => {
    async function loadSettingsAndDetails() {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setExpertMode(data.expert_mode ?? false);
        } else {
          setExpertMode(false);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
        setExpertMode(false);
      }
      await loadDetails();
    }

    loadSettingsAndDetails();

    return () => {
      stopPolling();
    };
  }, [requestId]);

  // useEffect for automatic campaign building trigger
  useEffect(() => {
    if (!request || loading) return;

    const req = request;
    const strats = strategies;
    
    // Resolve selected strategy tier robustly
    const selectedTier = resolveSelectedTier(req, strats);
    
    // Safety checks
    const safetyReviewObj = req.request_payload?.safety_review;
    const safetyApproved = safetyReviewObj ? safetyReviewObj.approved === true : true;
    const isSafetyRejected = safetyReviewObj && safetyReviewObj.approved === false;
    
    const validModes = ["dry_run", "review", "live"];
    const isValidMode = validModes.includes(req.execution_mode || "");
    
    const selectedStrat = strats?.find((s) => s.selected === true) ?? null;
    const selectedCount = strats?.filter((s) => s.selected === true).length || 0;
    
    const hasMetaIds = !!selectedStrat?.meta_campaign_id ||
                       !!selectedStrat?.meta_adset_id ||
                       !!selectedStrat?.meta_creative_id ||
                       !!selectedStrat?.meta_ad_id ||
                       !!req.selected_strategy; // check any Meta IDs exist

    const isDryRunCompleted = req.request_payload?.build_progress?.stage === "dry_run_completed";

    // Trace auto-build conditions diagnostics
    console.log("[WS04_TRIGGER_DIAGNOSTICS]", {
      requestId: req.id,
      status: req.status,
      expertMode,
      selectedTier,
      safetyApproved,
      isSafetyRejected,
      selectedCount,
      hasMetaIds,
      isDryRunCompleted,
      alreadyTriggered: buildTriggeredRef.current,
      isAutoBuilding
    });

    // Check conditions
    if (
      expertMode === false &&
      req.status === "strategy_ready" &&
      selectedTier &&
      safetyApproved &&
      !isSafetyRejected &&
      !hasMetaIds &&
      !isDryRunCompleted &&
      !isAutoBuilding &&
      !["building", "ready_for_review", "approved", "published", "failed"].includes(req.status)
    ) {
      if (!buildTriggeredRef.current) {
        // Set guard ref immediately before sending the API request
        buildTriggeredRef.current = true;
        triggerAutoBuild(selectedTier);
      }
    }
  }, [request, strategies, expertMode, isAutoBuilding, buildError]);

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

      console.log("[BUILDING_REQUEST_LOADED]", {
        requestId,
        status: reqData.status,
        resolverStatus: reqData.request_payload?.resolver_status,
        expertMode: reqData.expert_mode,
      });

      console.log("[STRATEGY_TRIGGER_CONDITION]", {
        isDraft: reqData.status === "draft",
        isResolved:
          reqData.request_payload?.resolver_status === "resolved",
        alreadyTriggered: strategyTriggeredRef.current,
      });

      const selected = strats.find((s) => s.selected === true);
      if (selected) {
        setSelectedStrategy(selected);
      }

      handleBuildWorkflowState(reqData, strats);
    }
  };

  const resolveSelectedTier = (req: CampaignCreationRequest, strats: CampaignStrategy[]) => {
    const selectedStrat = strats?.find(
      (strategy) =>
        strategy.selected === true ||
        strategy.status === "selected"
    ) ?? null;
    return (
      req.selected_strategy ??
      selectedStrat?.tier ??
      req.recommended_tier ??
      req.request_payload?.selected_strategy_tier ??
      req.request_payload?.safety_review?.recommended_tier ??
      req.request_payload?.campaign_strategy?.recommended_tier ??
      null
    );
  };

  const handleBuildWorkflowState = (req: CampaignCreationRequest, strats: CampaignStrategy[]) => {
    // If request status is terminal or ready, stop polling
    const terminalStatuses = ["ready_for_review", "approved", "published", "failed"];
    
    if (req.status === "building") {
      startBuildPolling();
    } else if (terminalStatuses.includes(req.status)) {
      stopPolling();
    } else if (req.status === "draft" || req.status === "analyzing") {
      // Keep polling to watch resolution and AI strategy generation progress
      startBuildPolling();

      // Check V2 Auto-Trigger for WS-03 Strategy Generation
      const payload = req.request_payload || {};
      const hasNoStrategies = strats.length === 0;
      
      const isDraft = req.status === "draft";
      const isResolved = payload.resolver_status === "resolved";
      const hasNextStepStrategy = nextStepParam === "strategy";

      if (isDraft && (isResolved || hasNextStepStrategy)) {
        if (hasNoStrategies) {
          if (!strategyTriggeredRef.current) {
            setIsStaleDataState(false);
            triggerAutoStrategy();
          }
        } else {
          console.warn("[STALE_STRATEGY_ROWS_ON_DRAFT_REQUEST] Draft request has existing strategies!");
          setIsStaleDataState(true);
        }
      } else {
        setIsStaleDataState(false);
      }
    } else if (req.status === "strategy_ready") {
      setIsStaleDataState(false);
      // Auto-triggering and strategy selections are handled declaratively by useEffect and UI panels
    }
  };

  const triggerAutoStrategy = async () => {
    if (strategyTriggeredRef.current) return;
    strategyTriggeredRef.current = true;
    setStrategyError(null);

    console.log("[STRATEGY_TRIGGER_SEND]", requestId);
    try {
      const response = await generateStrategy(requestId);
      console.log("[STRATEGY_TRIGGER_ACCEPTED]", response);
      await loadDetails();
    } catch (err) {
      console.error("[Auto-Strategy] Failed to trigger strategy:", err);
      setStrategyError(err instanceof Error ? err.message : String(err));
    }
  };

  const triggerAutoBuild = async (tier: string) => {
    setIsAutoBuilding(true);
    setBuildError(null);
    setErrorMessage(null);
    
    console.log("[WS04_TRIGGER_SEND]", {
      requestId,
      selectedTier: tier
    });

    try {
      const response = await buildCampaign(requestId, tier as any);
      console.log("[WS04_TRIGGER_ACCEPTED]", response);
      setIsAutoBuilding(false);
      await loadDetails();
    } catch (err) {
      console.error("[Auto-Build] Failed to trigger build campaign:", err);
      setIsAutoBuilding(false);
      setBuildError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSelectTier = async (tier: 'conservative' | 'balanced' | 'aggressive') => {
    if (isSelecting) return;
    setIsSelecting(true);
    setErrorMessage(null);
    try {
      const res = await selectStrategy(requestId, tier);
      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.data) {
        const updated = await fetchRequestDetails(requestId);
        if (updated.data) {
          setRequest(updated.data.request);
          setStrategies(updated.data.strategies);
        }
      }
    } catch (e) {
      setErrorMessage("فشل في اختيار الاستراتيجية.");
    } finally {
      setIsSelecting(false);
    }
  };

  // 2. Active 3-Seconds GET Polling
  const startBuildPolling = () => {
    stopPolling();
    pollIntervalRef.current = setInterval(async () => {
      const res = await fetchRequestDetails(requestId);
      if (res.data) {
        const { request: reqData, strategies: strats } = res.data;
        setRequest(reqData);
        setStrategies(strats);

        console.log("[BUILDING_REQUEST_LOADED]", {
          requestId,
          status: reqData.status,
          resolverStatus: reqData.request_payload?.resolver_status,
          expertMode: reqData.expert_mode,
        });

        console.log("[STRATEGY_TRIGGER_CONDITION]", {
          isDraft: reqData.status === "draft",
          isResolved:
            reqData.request_payload?.resolver_status === "resolved",
          alreadyTriggered: strategyTriggeredRef.current,
        });

        const selected = strats.find((s) => s.selected === true);
        if (selected) {
          setSelectedStrategy(selected);
        }

        // Also check auto-strategy trigger in polling loop just in case resolver completes while polling
        const payload = reqData.request_payload || {};
        const hasNoStrategies = strats.length === 0;

        const isDraft = reqData.status === "draft";
        const isResolved = payload.resolver_status === "resolved";
        const hasNextStepStrategy = nextStepParam === "strategy";

        if (isDraft && (isResolved || hasNextStepStrategy)) {
          if (hasNoStrategies) {
            if (!strategyTriggeredRef.current) {
              setIsStaleDataState(false);
              triggerAutoStrategy();
            }
          } else {
            console.warn("[STALE_STRATEGY_ROWS_ON_DRAFT_REQUEST] Draft request has existing strategies!");
            setIsStaleDataState(true);
          }
        } else {
          setIsStaleDataState(false);
        }

        // Check auto-build in polling loop if state changes to strategy_ready
        if (reqData.status === "strategy_ready") {
          setIsStaleDataState(false);
        }

        const stopStatuses = ["ready_for_review", "approved", "published", "failed"];
        if (stopStatuses.includes(reqData.status)) {
          stopPolling();
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

  // 3. Manual Retry Build
  const handleRetryBuild = async () => {
    if (!selectedStrategy || isBuildingRetry) return;
    setIsBuildingRetry(true);
    setErrorMessage(null);
    
    const res = await buildCampaign(requestId, selectedStrategy.tier);
    setIsBuildingRetry(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else {
      startBuildPolling();
      if (res.data) {
        setRequest(res.data);
      }
    }
  };

  const handleRefresh = async () => {
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

      handleBuildWorkflowState(reqData, strats);
    }
  };

  // Helper to compute progress checklist based on Meta IDs and internal status
  const getStepStatus = (idx: number): "completed" | "running" | "pending" | "failed" => {
    if (!request) return "pending";
    const status = request.status;
    const payload = request.request_payload || {};
    const selectedStrat = strategies.find(s => s.selected === true) || selectedStrategy;

    // Meta IDs as the primary Source of Truth
    const hasAd = !!selectedStrat?.meta_ad_id;
    const hasCreative = !!selectedStrat?.meta_creative_id || hasAd;
    const hasAdset = !!selectedStrat?.meta_adset_id || hasCreative;
    const hasCampaign = !!selectedStrat?.meta_campaign_id || hasAdset;

    const isFailed = status === "failed";

    switch (idx) {
      case 0: // Request Created
        return "completed";
      
      case 1: // Content Library Intake
        if (status === "resolution_failed") return "failed";
        if (payload.resolver_status === "resolved" || nextStepParam === "strategy" || status !== "draft") return "completed";
        return "running";
      
      case 2: // Content AI Analysis
        if (payload.content_analysis || ["strategy_ready", "strategy_review_required", "building", "ready_for_review", "published", "approved"].includes(status)) return "completed";
        if (strategyError) return "failed";
        if (status === "analyzing") return "running";
        return "pending";

      case 3: // Historical Data Query
        if (payload.historical_analysis || ["strategy_ready", "strategy_review_required", "building", "ready_for_review", "published", "approved"].includes(status)) return "completed";
        if (payload.content_analysis || status === "analyzing") return "running";
        return "pending";

      case 4: // Target Audience Planning
        if (payload.audience_plan || ["strategy_ready", "strategy_review_required", "building", "ready_for_review", "published", "approved"].includes(status)) return "completed";
        if (payload.historical_analysis || status === "analyzing") return "running";
        return "pending";

      case 5: // Budget Strategy Allocation
        if (payload.budget_plan || ["strategy_ready", "strategy_review_required", "building", "ready_for_review", "published", "approved"].includes(status)) return "completed";
        if (payload.audience_plan || status === "analyzing") return "running";
        return "pending";

      case 6: // Safety & Compliance Review
        if (payload.safety_review || ["strategy_ready", "strategy_review_required", "building", "ready_for_review", "published", "approved"].includes(status)) return "completed";
        if (payload.budget_plan || status === "analyzing") return "running";
        return "pending";

      case 7: // Strategy Engine Run
        if (request.selected_strategy || selectedStrat || ["strategy_ready", "strategy_review_required", "building", "ready_for_review", "approved", "published"].includes(status)) return "completed";
        if (payload.safety_review || status === "analyzing") return "running";
        return "pending";

      case 8: // Creating Meta Campaign
        if (hasCampaign) return "completed";
        if (status === "building" || isAutoBuilding) return "running";
        if (isFailed && !hasCampaign) return "failed";
        if (buildError) return "failed";
        return "pending";

      case 9: // Configuring Meta Ad Set
        if (hasAdset) return "completed";
        if (buildError) return "failed";
        if (hasCampaign) return "running";
        if (isFailed && !hasAdset && hasCampaign) return "failed";
        return "pending";

      case 10: // Uploading Ad Creative
        if (hasCreative) return "completed";
        if (buildError) return "failed";
        if (hasAdset) return "running";
        if (isFailed && !hasCreative && hasAdset) return "failed";
        return "pending";

      case 11: // Deploying Live Advertisement
        if (hasAd || ["ready_for_review", "approved", "published"].includes(status)) return "completed";
        if (buildError) return "failed";
        if (hasCreative) return "running";
        if (isFailed && !hasAd && hasCreative) return "failed";
        return "pending";

      default:
        return "pending";
    }
  };

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
          <h2 style={{ fontSize: "16px", fontWeight: "600" }}>تعذر تحميل تفاصيل البناء</h2>
          <button onClick={() => router.push("/create-campaign")} className="sync-button" style={{ marginTop: "16px" }}>العودة لمكتبة المحتوى</button>
        </div>
      </Shell>
    );
  }

  const isFailed = request.status === "failed" || request.status === "resolution_failed";
  const isBuildingActive = ["draft", "analyzing", "strategy_ready", "strategy_review_required", "building"].includes(request.status);
  const isReady = ["ready_for_review", "approved", "published"].includes(request.status);

  // Format events logs
  const timelineLogs = request.execution_timeline || [];

  return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => router.push("/create-campaign")}
              disabled={isBuildingActive && !isFailed}
              className="sync-button"
              style={{ padding: "6px 12px", background: "rgba(255,255,255,0.03)", borderColor: "var(--border)", fontSize: "12px", opacity: isBuildingActive && !isFailed ? 0.4 : 1 }}
            >
              <ArrowLeft size={14} style={{ marginLeft: "4px" }} />
              مركز التسويق بالذكاء الاصطناعي
            </button>
            <h1 style={{ fontSize: "18px", fontWeight: "700" }}>مركز التحكم والترويج التلقائي الذكي</h1>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isSyncing || (isBuildingActive && !isFailed)}
            className="sync-button"
            style={{ height: "36px", padding: "0 14px", fontSize: "12.5px" }}
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} style={{ marginLeft: "6px" }} />
            تحديث البيانات
          </button>
        </div>

        {/* State Machine Status Alert Banner */}
        {(() => {
          const status = request.status;
          const payload = request.request_payload || {};
          const resolverStatus = payload.resolver_status;
          const selectedTier = resolveSelectedTier(request, strategies);
          
          let alertTitle = "";
          let alertDesc = "";
          let alertType: "info" | "warning" | "success" | "error" = "info";

          if (isStaleDataState) {
            alertTitle = "تم اكتشاف بيانات متبقية من محاولة سابقة";
            alertDesc = "يوجد استراتيجيات سابقة مسجلة لهذا الطلب المسودة. يرجى النقر على زر تنظيف البيانات وإعادة التشغيل أدناه للبدء من جديد.";
            alertType = "warning";
          } else if (isFailed) {
            alertTitle = "تعذر تشييد الحملة تلقائياً";
            alertDesc = request.error_message || "حدث خطأ أثناء محاولة الاتصال بخدمات Meta الإعلانية. يرجى مراجعة سجل العمليات التقني أدناه.";
            alertType = "error";
          } else if (isReady) {
            alertTitle = "تم ترويج وبناء الحملة بنجاح على Meta ✅";
            alertDesc = "الحملة الإعلانية بكامل تفاصيلها منشأة وموقوفة مؤقتاً (PAUSED) لضمان الأمان والمراجعة التامة.";
            alertType = "success";
          } else if (status === "building") {
            alertTitle = "جاري تشييد عناصر الحملة الإعلانية على فيسبوك...";
            alertDesc = "يتم الآن إنشاء المجموعات الإعلانية وتصميمات الإعلانات وتعيين الاستهداف على مدير إعلانات Meta Ads Manager.";
            alertType = "info";
          } else if (isAutoBuilding) {
            alertTitle = "جاري بدء بناء الحملة على Meta...";
            alertDesc = "يقوم النظام بالاتصال بخدمات فيسبوك الرسمية لتسجيل الحملة الإعلانية وإرسال المكونات.";
            alertType = "info";
          } else if (status === "strategy_ready") {
            if (expertMode === true) {
              alertTitle = "مراجعة واعتماد الاستراتيجية المطلوبة (Expert Mode)";
              alertDesc = "يرجى تحديد فئة الاستهداف والميزانية المناسبة من الخيارات المعروضة أدناه لاعتماد الحملة.";
              alertType = "warning";
            } else {
              alertTitle = "تم اختيار الاستراتيجية تلقائيًا، جارٍ بدء بناء الحملة...";
              alertDesc = "تم تحليل المنشور بنجاح واختيار فئة الاستهداف الموصى بها. جاري تشغيل وحدة بناء الحملة تلقائياً.";
              alertType = "success";
            }
          } else if (status === "analyzing" || (status === "draft" && resolverStatus === "resolved")) {
            alertTitle = "جاري تشغيل تحليل الذكاء الاصطناعي...";
            alertDesc = "يقوم محرك الذكاء الاصطناعي بتحليل جودة المنشور وتجهيز خيارات الميزانية والاستهداف الموصى بها (WS-03).";
            alertType = "info";
          } else {
            alertTitle = "جاري استقبال وحل رابط المنشور...";
            alertDesc = "يقوم المحرك بقراءة بيانات المنشور والصور والتعليقات لبدء التحليل (WS-02).";
            alertType = "info";
          }

          let alertBg = "rgba(59,130,246,0.08)";
          let alertBorder = "rgba(59,130,246,0.2)";
          let alertColor = "var(--blue)";
          
          if (alertType === "warning") {
            alertBg = "rgba(245,158,11,0.08)";
            alertBorder = "rgba(245,158,11,0.2)";
            alertColor = "var(--amber)";
          } else if (alertType === "success") {
            alertBg = "rgba(16, 185, 129, 0.08)";
            alertBorder = "rgba(16, 185, 129, 0.2)";
            alertColor = "var(--green)";
          } else if (alertType === "error") {
            alertBg = "rgba(239,68,68,0.08)";
            alertBorder = "rgba(239,68,68,0.2)";
            alertColor = "var(--red)";
          }

          return (
            <div className="panel" style={{ background: alertBg, border: `1px solid ${alertBorder}`, borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", gap: "6px", direction: "rtl", textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: alertColor }}>
                <Info size={20} />
                <strong style={{ fontSize: "14px" }}>{alertTitle}</strong>
              </div>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0, lineHeight: "1.5" }}>
                {alertDesc}
              </p>
            </div>
          );
        })()}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="panel" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", gap: "10px", color: "var(--red)", fontSize: "13px" }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer", fontWeight: "600" }}>إغلاق</button>
          </div>
        )}

        {/* 1. Build Progress Loader Checklist */}
        {isBuildingActive && (
          <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: "24px", alignItems: "start" }}>
            
            {/* Checklist */}
            <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: "700", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Loader2 size={16} className="animate-spin" style={{ color: "var(--blue)" }} />
                  سير العملية الذاتية المستقلة (Smart V2 Engine)
                </h2>
                <span className="badge badge--info" style={{ fontSize: "11px" }}>جاري التنفيذ التلقائي</span>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "4px 0" }}>
                {strategyError && (
                  <div className="panel" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "16px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px", direction: "rtl", textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--red)" }}>
                      <AlertCircle size={20} />
                      <strong style={{ fontSize: "14px" }}>تعذر بدء تحليل الذكاء الاصطناعي (WS-03).</strong>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
                      التفاصيل: {strategyError}
                    </p>
                    <button
                      onClick={() => {
                        strategyTriggeredRef.current = false;
                        setStrategyError(null);
                        triggerAutoStrategy();
                      }}
                      className="sync-button"
                      style={{
                        background: "var(--brand-gradient)",
                        borderColor: "transparent",
                        color: "white",
                        alignSelf: "flex-start",
                        fontWeight: "700",
                        fontSize: "12px",
                        padding: "6px 16px"
                      }}
                    >
                      إعادة تشغيل التحليل
                    </button>
                  </div>
                )}

                {isStaleDataState && (
                  <div className="panel" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "8px", padding: "16px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px", direction: "rtl", textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--amber)" }}>
                      <AlertCircle size={20} />
                      <strong style={{ fontSize: "14px" }}>تم اكتشاف بيانات متبقية من محاولة سابقة.</strong>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
                      تم العثور على استراتيجيات مخزنة لحملة مسبقة على طلب مسودة جديد. (STALE_STRATEGY_ROWS_ON_DRAFT_REQUEST)
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          setIsSyncing(true);
                          const retryRes = await fetch(`/api/campaigns/${requestId}/retry`, {
                            method: "POST"
                          });
                          if (!retryRes.ok) {
                            const data = await retryRes.json();
                            throw new Error(data.error || "فشل تنظيف البيانات");
                          }
                          setIsStaleDataState(false);
                          strategyTriggeredRef.current = false;
                          buildTriggeredRef.current = false;
                          await loadDetails();
                        } catch (err) {
                          console.error("Error repairing stale data state:", err);
                          setErrorMessage(err instanceof Error ? err.message : "فشلت عملية المزامنة والتنظيف.");
                        } finally {
                          setIsSyncing(false);
                        }
                      }}
                      className="sync-button"
                      style={{
                        background: "var(--brand-gradient)",
                        borderColor: "transparent",
                        color: "white",
                        alignSelf: "flex-start",
                        fontWeight: "700",
                        fontSize: "12px",
                        padding: "6px 16px"
                      }}
                    >
                      تنظيف البيانات وإعادة التشغيل (Clear & Restart)
                    </button>
                  </div>
                )}

                {buildError && (
                  <div className="panel" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "16px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px", direction: "rtl", textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--red)" }}>
                      <AlertCircle size={20} />
                      <strong style={{ fontSize: "14px" }}>تعذر بدء إنشاء الحملة على Meta.</strong>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
                      التفاصيل: {buildError}
                    </p>
                    <button
                      onClick={() => {
                        buildTriggeredRef.current = false;
                        setBuildError(null);
                        const selectedTier = resolveSelectedTier(request!, strategies);
                        if (selectedTier) {
                          triggerAutoBuild(selectedTier);
                        }
                      }}
                      className="sync-button"
                      style={{
                        background: "var(--brand-gradient)",
                        borderColor: "transparent",
                        color: "white",
                        alignSelf: "flex-start",
                        fontWeight: "700",
                        fontSize: "12px",
                        padding: "6px 16px"
                      }}
                    >
                      إعادة محاولة إنشاء الحملة
                    </button>
                  </div>
                )}

                {progressSteps.map((step, idx) => {
                  const stepState = getStepStatus(idx);

                  let stepColor = "var(--muted)";
                  let icon = <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--border)" }} />;

                  if (stepState === "completed") {
                    stepColor = "var(--green)";
                    icon = <CheckCircle2 size={16} style={{ color: "var(--green)", fill: "rgba(16, 185, 129, 0.05)" }} />;
                  } else if (stepState === "running") {
                    stepColor = "var(--blue)";
                    icon = <Loader2 size={16} className="animate-spin" style={{ color: "var(--blue)" }} />;
                  } else if (stepState === "failed") {
                    stepColor = "var(--red)";
                    icon = <AlertCircle size={16} style={{ color: "var(--red)", fill: "rgba(239, 68, 68, 0.05)" }} />;
                  }

                  const stepLabel = (idx === 2 && request!.status === "draft" && request!.request_payload?.resolver_status === "resolved")
                    ? "جاري بدء محرك الاستراتيجية..."
                    : (idx === 7 && request!.status === "strategy_ready")
                      ? "تم اختيار الاستراتيجية تلقائيًا، جارٍ بدء بناء الحملة..."
                      : step.label;

                  return (
                    <div key={step.key} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <div style={{ width: "24px", height: "24px", display: "grid", placeItems: "center", flexShrink: 0 }}>
                        {icon}
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: stepState === "running" ? "700" : "500", color: stepColor }}>
                        {stepLabel}
                      </span>
                    </div>
                  );
                })}

                {/* Case 1: Expert Mode strategy cards selection */}
                {expertMode === true && request.status === "strategy_ready" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", borderTop: "1px solid var(--border)", paddingTop: "18px", marginTop: "14px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--foreground)" }}>
                      <Sparkles size={16} style={{ color: "var(--amber)", display: "inline-block", marginLeft: "6px", verticalAlign: "middle" }} />
                      مراجعة واعتماد الاستراتيجية المطلوبة (Expert Mode)
                    </h3>
                    <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: 0, lineHeight: "1.5" }}>
                      الرجاء تحديد فئة الاستهداف اليومية والميزانية المناسبة لاعتمادها وبدء البناء التلقائي على Meta.
                    </p>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginTop: "8px" }}>
                      {strategies.map((strat) => (
                        <StrategyCard
                          key={strat.tier}
                          strategy={strat}
                          isSelected={selectedStrategy?.tier === strat.tier}
                          onSelect={() => handleSelectTier(strat.tier)}
                          disabled={isSelecting}
                        />
                      ))}
                    </div>

                    <button
                      onClick={async () => {
                        const tier = selectedStrategy?.tier || resolveSelectedTier(request, strategies);
                        if (tier) {
                          buildTriggeredRef.current = true;
                          await triggerAutoBuild(tier);
                        }
                      }}
                      disabled={isAutoBuilding}
                      className="sync-button"
                      style={{
                        background: "var(--brand-gradient)",
                        borderColor: "transparent",
                        color: "white",
                        fontWeight: "700",
                        padding: "10px 24px",
                        justifyContent: "center",
                        marginTop: "12px",
                        fontSize: "13px",
                        cursor: "pointer"
                      }}
                    >
                      {isAutoBuilding ? "جاري بدء البناء..." : "اعتماد الاستراتيجية وإنشاء الحملة"}
                    </button>
                  </div>
                )}

                {/* Case 2: Auto Mode Manual Fallback Build Button */}
                {expertMode === false && request.status === "strategy_ready" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid var(--border)", paddingTop: "18px", marginTop: "14px" }}>
                    <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: 0, lineHeight: "1.5" }}>
                      إذا لم يبدأ بناء الحملة تلقائياً خلال لحظات، يمكنك تفعيل عملية البناء يدوياً باستخدام الزر أدناه:
                    </p>
                    <button
                      onClick={async () => {
                        const tier = resolveSelectedTier(request, strategies);
                        if (tier) {
                          buildTriggeredRef.current = true;
                          await triggerAutoBuild(tier);
                        }
                      }}
                      disabled={isAutoBuilding}
                      className="sync-button"
                      style={{
                        background: "var(--brand-gradient)",
                        borderColor: "transparent",
                        color: "white",
                        fontWeight: "700",
                        padding: "10px 24px",
                        justifyContent: "center",
                        fontSize: "13px",
                        cursor: "pointer"
                      }}
                    >
                      {isAutoBuilding ? "جاري بدء البناء..." : "متابعة وإنشاء الحملة"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Context */}
            <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "start" }}>
                <Sparkles size={18} style={{ color: "var(--green)", marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: "600", margin: 0 }}>نظام الترويج بلمسة واحدة</h3>
                  <p style={{ fontSize: "12.5px", color: "var(--muted)", lineHeight: "1.6", marginTop: "6px" }}>
                    يقوم الذكاء الاصطناعي بتحليل جودة المنشور وتوليد استهداف Meta الدقيق تلقائياً. لن تحتاج لإدخال أي ميزانيات أو جماهير يدوياً.
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "start", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                <Terminal size={18} style={{ color: "var(--blue)", marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: "600", margin: 0 }}>مراقبة المزامنة المباشرة</h3>
                  <p style={{ fontSize: "12.5px", color: "var(--muted)", lineHeight: "1.6", marginTop: "6px" }}>
                    يتم بناء الإعلان مباشرة على خوادم فيسبوك الرسمية. عند إتمام البناء، ستظهر تفاصيل الحملة مباشرة هنا.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Failure Diagnostic Screen */}
        {isFailed && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="panel" style={{ border: "1px solid rgba(239, 68, 68, 0.3)", background: "rgba(239, 68, 68, 0.02)" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", color: "var(--red)", borderBottom: "1px solid rgba(239, 68, 68, 0.15)", paddingBottom: "12px", marginBottom: "14px" }}>
                <ShieldAlert size={22} />
                <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>حدث خطأ أثناء محاولة بناء الحملة تلقائياً</h2>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13.5px" }}>
                <div>
                  <span style={{ color: "var(--muted)" }}>المرحلة التي تعطلت:</span>
                  <strong style={{ display: "block", marginTop: "2px", color: "var(--foreground)" }}>
                    {request.error_code === "resolution_failed" ? "تحليل وحل الرابط الأصلي" : "مزامنة وبناء عناصر الحملة على Meta Ads Manager"}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted)" }}>سبب المشكلة التقني:</span>
                  <p style={{ margin: "2px 0 0 0", color: "var(--red)", fontWeight: "500", lineHeight: "1.5" }}>
                    {request.error_message || "Meta API rejects connection token or budget exceeds daily limit."}
                  </p>
                </div>
                <div>
                  <span style={{ color: "var(--muted)" }}>الإجراء المقترح:</span>
                  <p style={{ margin: "2px 0 0 0", color: "var(--muted)", lineHeight: "1.5" }}>
                    يرجى التحقق من صحة مفاتيح اتصال الحساب الإعلاني (Access Token) في الإعدادات، أو التأكد من عدم تجاوز الحد الائتماني اليومي للحساب، ثم انقر على زر إعادة البناء أدناه.
                  </p>
                </div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px", display: "flex", gap: "10px", alignItems: "center", fontSize: "12px", color: "var(--muted)" }}>
                  <span>معرف الطلب المرجعي:</span>
                  <code>{requestId}</code>
                </div>
              </div>

              {selectedStrategy && (
                <button
                  onClick={handleRetryBuild}
                  disabled={isBuildingRetry}
                  className="sync-button"
                  style={{
                    marginTop: "16px",
                    background: "var(--brand-gradient)",
                    borderColor: "transparent",
                    color: "white",
                    fontWeight: "700",
                    padding: "8px 20px"
                  }}
                >
                  {isBuildingRetry ? "جاري إعادة المحاولة..." : "إعادة محاولة بناء الحملة"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3. Ready For Review / Success Screen */}
        {isReady && selectedStrategy && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Success Panel with Framer Motion Scale Animation */}
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
              }}
              className="panel" 
              style={{ borderLeft: "4px solid var(--green)", background: "rgba(16, 185, 129, 0.03)", display: "flex", gap: "16px", alignItems: "center", padding: "20px" }}
            >
              <motion.div
                variants={{
                  hidden: { scale: 0 },
                  visible: { scale: 1, transition: { type: "spring", stiffness: 200, damping: 10 } }
                }}
                style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)", display: "grid", placeItems: "center", flexShrink: 0 }}
              >
                <CheckCircle2 size={30} style={{ color: "var(--green)" }} />
              </motion.div>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: "700", margin: 0, color: "var(--green)" }}>تم ترويج وبناء الحملة بنجاح على Meta ✅</h2>
                <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0 0", lineHeight: "1.6" }}>
                  الحملة الإعلانية بكامل تفاصيلها (الاستهداف والمحتوى) منشأة الآن على حساب الإعلانات الخاص بك بوضع <strong>موقوف مؤقتاً (PAUSED)</strong> لضمان المراجعة والأمان المالي التام.
                </p>
              </div>
            </motion.div>

            {/* Campaign Specifications details */}
            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: "24px", alignItems: "start" }}>
              
              <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", borderBottom: "1px solid var(--border)", paddingBottom: "10px", margin: 0 }}>مواصفات الحملة المشيدة</h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "13px" }}>
                  <div>
                    <span style={{ color: "var(--muted)" }}>اسم الحملة الإعلانية</span>
                    <strong style={{ display: "block", marginTop: "4px", fontSize: "14px" }}>{selectedStrategy.campaign_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>حالة الحملة الحالية</span>
                    <strong style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", color: "var(--amber)" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--amber)" }} />
                      PAUSED (جاهزة للمراجعة والتفعيل)
                    </strong>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "13px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                  <div>
                    <span style={{ color: "var(--muted)" }}>معرف الحملة الإعلانية (Meta Campaign ID)</span>
                    <code style={{ display: "block", marginTop: "4px", color: "var(--amber)", fontSize: "11.5px" }}>{selectedStrategy.meta_campaign_id}</code>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>معرف الإعلان المشيد (Meta Ad ID)</span>
                    <code style={{ display: "block", marginTop: "4px", fontSize: "11.5px" }}>{selectedStrategy.meta_ad_id || "—"}</code>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "13px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                  <div>
                    <span style={{ color: "var(--muted)" }}>الهدف الإعلاني والتكامل</span>
                    <strong style={{ display: "block", marginTop: "4px" }}>{selectedStrategy.objective} / {selectedStrategy.optimization_goal}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>الميزانية اليومية للذكاء الاصطناعي</span>
                    <strong className="ltr-val" style={{ display: "block", marginTop: "4px", fontSize: "14px" }}>${selectedStrategy.daily_budget} يومياً</strong>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "13px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                  <div>
                    <span style={{ color: "var(--muted)" }}>المواضع الإعلانية النشطة</span>
                    <strong style={{ display: "block", marginTop: "4px" }}>{selectedStrategy.placements.join(", ") || "Advantage+ Placements"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>توزيع الاستهداف والجمهور</span>
                    <strong style={{ display: "block", marginTop: "4px" }}>
                      {selectedStrategy.gender === "all" ? "الكل" : "إناث"} (عمر {selectedStrategy.age_min} - {selectedStrategy.age_max}) في {selectedStrategy.country_codes.join(", ")}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action Sidebar */}
              <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", margin: 0 }}>خيارات التحكم والنشر</h3>
                <p style={{ fontSize: "12.5px", color: "var(--muted)", lineHeight: "1.6" }}>
                  تم تشييد الحملة بالكامل. يمكنك مراجعتها عبر حساب Meta Ads Manager أو الرجوع لبدء ترويج آخر.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <a
                    href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${request.target_meta_account_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sync-button"
                    style={{
                      justifyContent: "center",
                      background: "var(--brand-gradient)",
                      color: "white",
                      border: 0,
                      fontWeight: "700",
                      height: "40px",
                      textDecoration: "none"
                    }}
                  >
                    <ExternalLink size={14} style={{ marginLeft: "6px" }} />
                    عرض الحملة على فيسبوك
                  </a>

                  <button
                    onClick={() => router.push("/create-campaign")}
                    className="sync-button"
                    style={{
                      justifyContent: "center",
                      background: "rgba(255,255,255,0.03)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                      fontWeight: "600",
                      height: "40px"
                    }}
                  >
                    العودة لمكتبة المحتوى
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. AI Decision Transparency Section */}
        {displayTransparency && (
          <div className="panel" style={{ border: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column", padding: "16px", gap: "12px" }}>
            <button
              onClick={() => setIsDecisionOpen(!isDecisionOpen)}
              style={{
                width: "100%",
                background: "transparent",
                border: 0,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "var(--foreground)",
                fontWeight: "700",
                fontSize: "14px",
                cursor: "pointer",
                padding: "2px 0"
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={16} style={{ color: "var(--green)" }} />
                لماذا اختار الذكاء الاصطناعي هذه الاستراتيجية؟ (AI Decision Transparency)
              </span>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                {isDecisionOpen ? "إخفاء التفاصيل ▲" : "عرض التفاصيل ▼"}
              </span>
            </button>

            {isDecisionOpen && (
              <div style={{ marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "20px", fontSize: "13px" }}>
                
                {/* Translation Toggle & Alerts Bar */}
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "10px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setShowArabicTranslation(true)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "4px",
                        border: "1px solid " + (showArabicTranslation ? "var(--green)" : "var(--border)"),
                        background: showArabicTranslation ? "rgba(16,185,129,0.08)" : "transparent",
                        color: showArabicTranslation ? "var(--green)" : "var(--muted)",
                        fontSize: "11px",
                        cursor: "pointer",
                        fontWeight: showArabicTranslation ? "bold" : "normal"
                      }}
                    >
                      عرض الترجمة العربية
                    </button>
                    <button
                      onClick={() => setShowArabicTranslation(false)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "4px",
                        border: "1px solid " + (!showArabicTranslation ? "var(--green)" : "var(--border)"),
                        background: !showArabicTranslation ? "rgba(16,185,129,0.08)" : "transparent",
                        color: !showArabicTranslation ? "var(--green)" : "var(--muted)",
                        fontSize: "11px",
                        cursor: "pointer",
                        fontWeight: !showArabicTranslation ? "bold" : "normal"
                      }}
                    >
                      عرض النص الأصلي (English)
                    </button>
                  </div>
                  
                  {showArabicTranslation && translationLoading && (
                    <span style={{ fontSize: "11.5px", color: "var(--amber)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Loader2 size={12} className="animate-spin" style={{ color: "var(--amber)" }} />
                      جارٍ تجهيز الترجمة العربية...
                    </span>
                  )}

                  {showArabicTranslation && translationError && (
                    <span style={{ fontSize: "11.5px", color: "rgb(252,165,165)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <AlertCircle size={12} />
                      تعذّر تحميل الترجمة العربية، تم عرض النص الأصلي.
                    </span>
                  )}
                </div>

                {/* 1. Content Analysis */}
                <div style={{ display: "flex", gap: "12px", alignItems: "start" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(59,130,246,0.08)", display: "grid", placeItems: "center", color: "var(--blue)", fontSize: "11px", fontWeight: "bold", flexShrink: 0 }}>١</div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <strong style={{ color: "var(--foreground)", fontSize: "13.5px" }}>تحليل محتوى المنشور (Content Analysis):</strong>
                    {!displayTransparency.contentAnalysis.summary && !displayTransparency.contentAnalysis.detectedObjective && !displayTransparency.contentAnalysis.productType ? (
                      <span style={{ color: "var(--muted)", fontStyle: "italic" }}>لم تتوفر بيانات كافية لهذا التحليل.</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {displayTransparency.contentAnalysis.summary ? (
                          <span style={{ color: "var(--muted)", lineHeight: "1.6" }}>{displayTransparency.contentAnalysis.summary}</span>
                        ) : (
                          <span style={{ color: "var(--muted)", fontStyle: "italic" }}>غير متوفر</span>
                        )}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                          {displayTransparency.contentAnalysis.detectedObjective && (
                            <span className="badge" style={{ background: "rgba(59,130,246,0.08)", color: "var(--blue)", padding: "3px 8px", borderRadius: "4px", fontSize: "11px" }}>
                              الهدف المكتشف: {translateObjective(displayTransparency.contentAnalysis.detectedObjective)}
                            </span>
                          )}
                          {displayTransparency.contentAnalysis.productType && (
                            <span className="badge" style={{ background: "rgba(255,255,255,0.04)", color: "var(--muted)", padding: "3px 8px", borderRadius: "4px", fontSize: "11px" }}>
                              نوع الفئة: {translateCategory(displayTransparency.contentAnalysis.productType)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Historical Query */}
                <div style={{ display: "flex", gap: "12px", alignItems: "start" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(59,130,246,0.08)", display: "grid", placeItems: "center", color: "var(--blue)", fontSize: "11px", fontWeight: "bold", flexShrink: 0 }}>٢</div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <strong style={{ color: "var(--foreground)", fontSize: "13.5px" }}>التحليل التاريخي والمنصة (Historical Query):</strong>
                    {!displayTransparency.historicalAnalysis.rationale && !displayTransparency.historicalAnalysis.bestPattern && displayTransparency.historicalAnalysis.dataUsed === null ? (
                      <span style={{ color: "var(--muted)", fontStyle: "italic" }}>لم تتوفر بيانات كافية لهذا التحليل.</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {displayTransparency.historicalAnalysis.rationale ? (
                          <span style={{ color: "var(--muted)", lineHeight: "1.6" }}>{displayTransparency.historicalAnalysis.rationale}</span>
                        ) : (
                          <span style={{ color: "var(--muted)", fontStyle: "italic" }}>غير متوفر</span>
                        )}
                        {displayTransparency.historicalAnalysis.bestPattern && (
                          <div style={{ color: "var(--muted)", fontSize: "12px", background: "rgba(255,255,255,0.02)", padding: "8px", borderRadius: "4px", border: "1px solid var(--border)", marginTop: "4px" }}>
                            <strong>النمط الأفضل أداءً:</strong> {displayTransparency.historicalAnalysis.bestPattern}
                          </div>
                        )}
                        <div style={{ marginTop: "4px" }}>
                          {displayTransparency.historicalAnalysis.dataUsed === true && (
                            <span className="badge" style={{ background: "rgba(16,185,129,0.08)", color: "var(--green)", padding: "3px 8px", borderRadius: "4px", fontSize: "11px" }}>
                              ✓ تم استخدام البيانات التاريخية للحساب لتحسين النتائج
                            </span>
                          )}
                          {displayTransparency.historicalAnalysis.dataUsed === false && (
                            <span className="badge" style={{ background: "rgba(251,191,36,0.08)", color: "var(--amber)", padding: "3px 8px", borderRadius: "4px", fontSize: "11px" }}>
                              ⚠ لم يتم استخدام بيانات تاريخية (لا توجد بيانات كافية للحساب)
                            </span>
                          )}
                          {displayTransparency.historicalAnalysis.dataUsed === null && (
                            <span className="badge" style={{ background: "rgba(255,255,255,0.04)", color: "var(--muted)", padding: "3px 8px", borderRadius: "4px", fontSize: "11px" }}>
                              حالة البيانات التاريخية: غير متوفر
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Audience Selection */}
                <div style={{ display: "flex", gap: "12px", alignItems: "start" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(59,130,246,0.08)", display: "grid", placeItems: "center", color: "var(--blue)", fontSize: "11px", fontWeight: "bold", flexShrink: 0 }}>٣</div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <strong style={{ color: "var(--foreground)", fontSize: "13.5px" }}>تخطيط الجمهور المستهدف (Audience Selection):</strong>
                    {!displayTransparency.audienceSelection.rationale && 
                     displayTransparency.audienceSelection.countries.length === 0 && 
                     displayTransparency.audienceSelection.locations.length === 0 && 
                     displayTransparency.audienceSelection.placements.length === 0 && 
                     displayTransparency.audienceSelection.ageMin === null && 
                     displayTransparency.audienceSelection.ageMax === null && 
                     displayTransparency.audienceSelection.genders.length === 0 ? (
                      <span style={{ color: "var(--muted)", fontStyle: "italic" }}>لم تتوفر بيانات كافية لهذا التحليل.</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {displayTransparency.audienceSelection.rationale ? (
                          <span style={{ color: "var(--muted)", lineHeight: "1.6" }}>{displayTransparency.audienceSelection.rationale}</span>
                        ) : (
                          <span style={{ color: "var(--muted)", fontStyle: "italic" }}>غير متوفر</span>
                        )}
                        
                        {/* Demographics Summary */}
                        <div style={{ display: "flex", gap: "16px", background: "rgba(255,255,255,0.02)", padding: "8px 12px", borderRadius: "4px", fontSize: "12.5px" }}>
                          <div>
                            <span style={{ color: "var(--muted)" }}>الفئة العمرية: </span>
                            <strong>
                              {displayTransparency.audienceSelection.ageMin !== null && displayTransparency.audienceSelection.ageMax !== null
                                ? `${displayTransparency.audienceSelection.ageMin} - ${displayTransparency.audienceSelection.ageMax}`
                                : "غير متوفر"}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted)" }}>الجنس: </span>
                            <strong>
                              {displayTransparency.audienceSelection.genders.length > 0
                                ? displayTransparency.audienceSelection.genders.map(g => translateGender(g)).join("، ")
                                : "غير متوفر"}
                            </strong>
                          </div>
                        </div>

                        {/* Country and Locations */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <span style={{ color: "var(--muted)", fontSize: "12px" }}>النطاق الجغرافي المستهدف:</span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {displayTransparency.audienceSelection.countries.length > 0 ? (
                              displayTransparency.audienceSelection.countries.map((c, i) => (
                                <span key={i} style={{ background: "rgba(59,130,246,0.1)", color: "var(--blue)", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <MapPin size={10} />
                                  {translateCountry(c)}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "12px" }}>الدول: غير متوفر</span>
                            )}

                            {displayTransparency.audienceSelection.locations.length > 0 ? (
                              displayTransparency.audienceSelection.locations.map((loc, i) => (
                                <span key={i} style={{ background: "rgba(255,255,255,0.04)", color: "var(--foreground)", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <Compass size={10} style={{ color: "var(--muted)" }} />
                                  {loc}
                                </span>
                              ))
                            ) : null}
                          </div>
                        </div>

                        {/* Placements (Distinct from locations) */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <span style={{ color: "var(--muted)", fontSize: "12px" }}>مواضع ظهور الإعلانات (Meta Placements):</span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {displayTransparency.audienceSelection.placements.length > 0 ? (
                              displayTransparency.audienceSelection.placements.map((p, i) => (
                                <span key={i} style={{ background: "rgba(139,92,246,0.1)", color: "rgb(196,181,253)", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <Layers size={10} />
                                  {translatePlacement(p)}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "12px" }}>غير متوفر</span>
                            )}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Budgeting */}
                <div style={{ display: "flex", gap: "12px", alignItems: "start" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(59,130,246,0.08)", display: "grid", placeItems: "center", color: "var(--blue)", fontSize: "11px", fontWeight: "bold", flexShrink: 0 }}>٤</div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <strong style={{ color: "var(--foreground)", fontSize: "13.5px" }}>توزيع الموازنة والتقديرات المالية (Budgeting):</strong>
                    {displayTransparency.budgeting.dailyBudget === null && !displayTransparency.budgeting.rationale ? (
                      <span style={{ color: "var(--muted)", fontStyle: "italic" }}>لم تتوفر بيانات كافية لهذا التحليل.</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "var(--muted)" }}>الميزانية اليومية الموصى بها: </span>
                          <strong style={{ fontSize: "14px", color: "var(--amber)", display: "inline-flex", alignItems: "center", gap: "2px" }} className="ltr-val">
                            {displayTransparency.budgeting.dailyBudget !== null ? `${displayTransparency.budgeting.dailyBudget}` : "غير متوفر"}{" "}
                            {displayTransparency.budgeting.currency || ""}
                          </strong>
                        </div>
                        {displayTransparency.budgeting.rationale ? (
                          <span style={{ color: "var(--muted)", lineHeight: "1.6" }}>{displayTransparency.budgeting.rationale}</span>
                        ) : (
                          <span style={{ color: "var(--muted)", fontStyle: "italic" }}>غير متوفر</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Safety Check */}
                <div style={{ display: "flex", gap: "12px", alignItems: "start" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(59,130,246,0.08)", display: "grid", placeItems: "center", color: "var(--blue)", fontSize: "11px", fontWeight: "bold", flexShrink: 0 }}>٥</div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <strong style={{ color: "var(--foreground)", fontSize: "13.5px" }}>مراجعة الأمان والامتثال لسياسات Meta (Safety Check):</strong>
                    {!displayTransparency.safetyCheck.strategy && !displayTransparency.safetyCheck.status && displayTransparency.safetyCheck.compliancePercentage === null && displayTransparency.safetyCheck.warnings.length === 0 ? (
                      <span style={{ color: "var(--muted)", fontStyle: "italic" }}>لم تتوفر بيانات كافية لهذا التحليل.</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        
                        {/* Status and Score Row */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                          <span style={{ color: "var(--muted)" }}>حالة الأمان والامتثال:</span>
                          
                          {/* Status Badge */}
                          {displayTransparency.safetyCheck.status ? (
                            <span className="badge" style={{
                              background: 
                                displayTransparency.safetyCheck.status === "Approved" || displayTransparency.safetyCheck.status === "approved" || displayTransparency.safetyCheck.status === "معتمد" || displayTransparency.safetyCheck.status === "مقبول"
                                  ? "rgba(16,185,129,0.08)"
                                  : (displayTransparency.safetyCheck.status === "Pending Review" || displayTransparency.safetyCheck.status === "pending" || displayTransparency.safetyCheck.status === "pending_review" || displayTransparency.safetyCheck.status === "بانتظار المراجعة"
                                      ? "rgba(251,191,36,0.08)"
                                      : "rgba(239,68,68,0.08)"),
                              color: 
                                displayTransparency.safetyCheck.status === "Approved" || displayTransparency.safetyCheck.status === "approved" || displayTransparency.safetyCheck.status === "معتمد" || displayTransparency.safetyCheck.status === "مقبول"
                                  ? "var(--green)"
                                  : (displayTransparency.safetyCheck.status === "Pending Review" || displayTransparency.safetyCheck.status === "pending" || displayTransparency.safetyCheck.status === "pending_review" || displayTransparency.safetyCheck.status === "بانتظار المراجعة"
                                      ? "var(--amber)"
                                      : "rgb(252,165,165)"),
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: "600"
                            }}>
                              {translateStatus(displayTransparency.safetyCheck.status)}
                            </span>
                          ) : (
                            <span style={{ color: "var(--muted)", fontStyle: "italic" }}>غير متوفر</span>
                          )}

                          {/* Compliance Score Badge */}
                          {displayTransparency.safetyCheck.compliancePercentage !== null ? (
                            <span className="badge ltr-val" style={{ background: "rgba(255,255,255,0.04)", color: "var(--foreground)", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                              {displayTransparency.safetyCheck.compliancePercentage}% امتثال
                            </span>
                          ) : (
                            <span style={{ color: "var(--muted)", fontStyle: "italic" }}>غير متوفر</span>
                          )}
                        </div>

                        {displayTransparency.safetyCheck.strategy ? (
                          <span style={{ color: "var(--muted)", lineHeight: "1.6" }}>{displayTransparency.safetyCheck.strategy}</span>
                        ) : (
                          <span style={{ color: "var(--muted)", fontStyle: "italic" }}>غير متوفر</span>
                        )}

                        {/* Safety Warnings List */}
                        {displayTransparency.safetyCheck.warnings.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                            <span style={{ color: "rgb(252,165,165)", fontSize: "11.5px", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                              <ShieldAlert size={12} />
                              التنبيهات والملاحظات الإرشادية ({displayTransparency.safetyCheck.warnings.length}):
                            </span>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingRight: "8px" }}>
                              {displayTransparency.safetyCheck.warnings.map((warn, i) => (
                                <div key={i} style={{ color: "var(--muted)", fontSize: "12px", display: "flex", gap: "6px", alignItems: "start" }}>
                                  <span style={{ color: "var(--amber)" }}>•</span>
                                  <span style={{ lineHeight: "1.5" }}>{warn}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* 5. Campaign Technical Execution Timeline (Monospace Terminal Log) */}
        <div className="panel" style={{ border: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column", padding: "16px" }}>
          <button
            onClick={() => setIsLogOpen(!isLogOpen)}
            style={{
              width: "100%",
              background: "transparent",
              border: 0,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "var(--foreground)",
              fontWeight: "700",
              fontSize: "14px",
              cursor: "pointer",
              padding: "2px 0"
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Terminal size={16} style={{ color: "var(--blue)" }} />
              سجل العمليات التقني والتدقيق (Technical Execution Audit Log)
            </span>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              {isLogOpen ? "إخفاء السجل ▲" : "عرض السجل ▼"}
            </span>
          </button>

          {isLogOpen && (
            <div style={{ marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
              <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: "6px", padding: "14px", fontFamily: "monospace", fontSize: "12px", color: "#c9d1d9", direction: "ltr", textAlign: "left", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto" }}>
                {timelineLogs.length === 0 ? (
                  <div style={{ color: "var(--muted)", fontStyle: "italic" }}>No execution events logged yet.</div>
                ) : (
                  timelineLogs.map((log: any, idx: number) => {
                    const time = new Date(log.timestamp).toLocaleTimeString();
                    return (
                      <div key={idx} style={{ display: "flex", gap: "10px" }}>
                        <span style={{ color: "#8b949e" }}>[{time}]</span>
                        <span style={{ color: "#58a6ff" }}>{log.event}</span>
                        <span style={{ color: "#3fb950" }}>- Success</span>
                      </div>
                    );
                  })
                )}
                {isBuildingActive && (
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ color: "#8b949e" }}>[{new Date().toLocaleTimeString()}]</span>
                    <span style={{ color: "#e3b341" }}>Waiting for further updates...</span>
                    <Loader2 size={12} className="animate-spin" style={{ color: "#e3b341" }} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </Shell>
  );
}
