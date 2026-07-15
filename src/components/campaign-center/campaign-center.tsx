"use client";

import { useRouter } from "next/navigation";

import { useState, useEffect, useRef } from "react";

import { WorkflowTimeline, TimelineStep } from "./workflow-timeline";
import { ContentAnalysis } from "./content-analysis";
import { StrategySelector } from "./strategy-selector";
import { CampaignPreview } from "./campaign-preview";
import { BuildSummary } from "./build-summary";
import { RecentRequests } from "./recent-requests";
import { CampaignCreationRequest, CampaignStrategy, ContentLibraryItem } from "./types";
import {
  createRequest,
  resolveRequest,
  generateStrategy,
  selectStrategy,
  buildCampaign,
  fetchRequests,
  fetchRequestDetails,
  fetchContent,
  syncContent,
} from "./api";
import { ContentLibrary } from "./content-library";
import { ContentSyncButton } from "./content-sync-button";
import { ContentDetails } from "./content-details";
import { ContentAIEditor } from "./content-ai-editor";
import { ContentSelectionDrawer } from "./content-selection-drawer";
import { RequestForm } from "./request-form";
import { AlertCircle, BrainCircuit, RefreshCw, RefreshCcw, ArrowRight, Library, Link, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface Account {
  id: string;
  name: string;
  meta_account_id: string;
  connection_status?: string;
}

interface CampaignCenterProps {
  accounts: Account[];
}

export function CampaignCenter({ accounts }: CampaignCenterProps) {
  const router = useRouter();

  // Campaign Requests state
  const [requests, setRequests] = useState<CampaignCreationRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<CampaignCreationRequest | null>(null);
  const [strategies, setStrategies] = useState<CampaignStrategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<CampaignStrategy | null>(null);

  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [isSelectingStrategy, setIsSelectingStrategy] = useState(false);

  // Content Library state
  const [contentItems, setContentItems] = useState<ContentLibraryItem[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isSyncingContent, setIsSyncingContent] = useState(false);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [contentPagination, setContentPagination] = useState({ total: 0, limit: 12, offset: 0 });

  // Filter/Search/Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState({ platform: "all", contentType: "all", status: "all" });
  const [sortBy, setSortBy] = useState("newest");

  // Drawers state
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<ContentLibraryItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [selectedItemForAIEditor, setSelectedItemForAIEditor] = useState<ContentLibraryItem | null>(null);
  const [isAIEditorOpen, setIsAIEditorOpen] = useState(false);

  const [selectedItemForCampaign, setSelectedItemForCampaign] = useState<ContentLibraryItem | null>(null);
  const [isCampaignDrawerOpen, setIsCampaignDrawerOpen] = useState(false);

  // Fallback section toggler
  const [showManualFallback, setShowManualFallback] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pollErrorCount, setPollErrorCount] = useState(0);

  // Polling ref
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch content & requests on mount
  useEffect(() => {
    loadRequests();
    loadContentLibrary();
    return () => stopPolling();
  }, []);

  // 2. Fetch content library items when parameters change
  useEffect(() => {
    loadContentLibrary();
  }, [searchQuery, activeFilters, sortBy, contentPagination.offset]);

  const loadRequests = async () => {
    setIsLoadingRequests(true);
    const res = await fetchRequests();
    setIsLoadingRequests(false);
    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.data) {
      setRequests(res.data);
    }
  };

  const loadContentLibrary = async () => {
    setIsLoadingContent(true);
    const res = await fetchContent({
      search: searchQuery,
      platform: activeFilters.platform,
      contentType: activeFilters.contentType,
      status: activeFilters.status,
      sortBy,
      limit: contentPagination.limit,
      offset: contentPagination.offset,
    });
    setIsLoadingContent(false);
    
    if (res.error) {
      setErrorMessage(res.error);
    } else {
      setContentItems(res.items || []);
      setContentPagination(res.pagination);
    }
  };

  // 3. Polling active request details
  const startPolling = (requestId: string) => {
    stopPolling();
    setPollErrorCount(0);
    pollIntervalRef.current = setInterval(async () => {
      const res = await fetchRequestDetails(requestId);
      if (res.error) {
        setPollErrorCount((prev) => {
          if (prev >= 3) {
            stopPolling();
            setErrorMessage("فشل الاتصال المستمر بالخادم لمتابعة حالة الطلب.");
          }
          return prev + 1;
        });
      } else if (res.data) {
        setPollErrorCount(0);
        const { request, strategies: strats } = res.data;
        setActiveRequest(request);
        setStrategies(strats);

        // Find selected strategy
        const selected = strats.find((s) => s.selected === true);
        if (selected) {
          setSelectedStrategy(selected);
        } else {
          setSelectedStrategy(null);
        }

        // Update requests table list
        setRequests((prev) =>
          prev.map((r) => (r.id === request.id ? request : r))
        );

        // Stop polling if request reaches a terminal or final review state
        const stopStatuses = ["resolution_failed", "ready_for_review", "published", "failed", "approved", "rejected"];
        if (stopStatuses.includes(request.status)) {
          // Exception: If status is strategy_ready but we have no strategies, keep polling for DB synchronization skew
          if (request.status === "strategy_ready" && strats.length === 0) {
            // Keep polling
          } else {
            stopPolling();
          }
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

  // 4. Trigger Meta Content Sync
  const handleContentSync = async () => {
    setIsSyncingContent(true);
    setSyncSummary(null);
    const res = await syncContent();
    setIsSyncingContent(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.data) {
      setSyncSummary(res.data.summary || "تم تحديث المحتوى بنجاح");
      setLastSyncTime(new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      // Reset pagination offset and reload content
      setContentPagination(prev => ({ ...prev, offset: 0 }));
      loadContentLibrary();
    }
  };

  // 5. Handle creation request from Content Library Drawer
  const handleCreateRequestFromLibrary = async (formData: {
    content_library_id: string;
    target_ad_account_id: string;
    destination_type: 'whatsapp' | 'messenger' | 'website';
    requested_daily_budget: number | null;
    execution_mode: 'dry_run' | 'live';
    placements: 'advantage_plus' | 'facebook_only' | 'instagram_only';
  }) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setActiveRequest(null);
    setStrategies([]);
    setSelectedStrategy(null);
    setIsCampaignDrawerOpen(false);

    const res = await createRequest(formData);
    setIsSubmitting(false);

    if (res.error) {
      setErrorMessage(res.error);
      return;
    }

    if (res.data) {
      const newReq = Array.isArray(res.data) ? res.data[0] : res.data;
      const reqId = newReq?.id || newReq?.request_id;
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!reqId || !uuidRegex.test(reqId)) {
        setErrorMessage("خطأ: لم يتم تلقي معرف طلب صالح (UUID) من الخادم. تعذر بدء المزامنة.");
        return;
      }

      router.push(`/campaigns/${reqId}/strategy`);
    }
  };

  // 6. Handle Manual Link Creation submit (Fallback Option)
  const handleCreateManualRequest = async (formData: {
    target_ad_account_id: string;
    source_post_url: string;
    destination_type: 'whatsapp' | 'messenger' | 'website';
    requested_daily_budget: number | null;
    execution_mode: 'dry_run' | 'live';
    placements: 'advantage_plus' | 'facebook_only' | 'instagram_only';
  }) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setActiveRequest(null);
    setStrategies([]);
    setSelectedStrategy(null);

    const res = await createRequest(formData);
    setIsSubmitting(false);

    if (res.error) {
      setErrorMessage(res.error);
      return;
    }

    if (res.data) {
      const newReq = Array.isArray(res.data) ? res.data[0] : res.data;
      const reqId = newReq?.id || newReq?.request_id;
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!reqId || !uuidRegex.test(reqId)) {
        setErrorMessage("خطأ: لم يتم تلقي معرف طلب صالح (UUID) من الخادم. تعذر بدء المزامنة.");
        return;
      }

      router.push(`/campaigns/${reqId}/strategy`);
    }
  };

  const triggerResolveWorkflow = async (requestId: string) => {
    setIsResolving(true);
    const resolveRes = await resolveRequest(requestId);
    setIsResolving(false);

    if (resolveRes.error) {
      setErrorMessage(resolveRes.error);
      return;
    }

    // After resolution succeeded, trigger WS-03 Strategist explicitly
    triggerStrategyGeneration(requestId);
  };

  const triggerStrategyGeneration = async (requestId: string) => {
    setIsGeneratingStrategy(true);
    const strategyRes = await generateStrategy(requestId);
    setIsGeneratingStrategy(false);

    if (strategyRes.error) {
      setErrorMessage(strategyRes.error);
    }
  };

  // 7. Manual retry actions
  const handleManualResolveRetry = async () => {
    if (!activeRequest) return;
    const reqId = activeRequest.id || activeRequest.request_id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!reqId || !uuidRegex.test(reqId)) {
      setErrorMessage("خطأ: معرف الطلب غير صالح (UUID). تعذر إعادة محاولة التحليل.");
      return;
    }

    setErrorMessage(null);
    setIsResolving(true);
    const res = await resolveRequest(reqId);
    setIsResolving(false);
    if (res.error) {
      setErrorMessage(res.error);
    } else {
      startPolling(reqId);
      triggerStrategyGeneration(reqId);
    }
  };

  const handleManualStrategyRetry = async () => {
    if (!activeRequest) return;
    const reqId = activeRequest.id || activeRequest.request_id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!reqId || !uuidRegex.test(reqId)) {
      setErrorMessage("خطأ: معرف الطلب غير صالح (UUID). تعذر إعادة محاولة توليد الاستراتيجية.");
      return;
    }

    setErrorMessage(null);
    setIsGeneratingStrategy(true);
    const res = await generateStrategy(reqId);
    setIsGeneratingStrategy(false);
    if (res.error) {
      setErrorMessage(res.error);
    } else {
      startPolling(reqId);
    }
  };

  const handleRefreshRequestDetails = async () => {
    if (!activeRequest) return;
    setErrorMessage(null);
    const res = await fetchRequestDetails(activeRequest.id);
    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.data) {
      const { request, strategies: strats } = res.data;
      setActiveRequest(request);
      setStrategies(strats);

      const selected = strats.find((s) => s.selected === true);
      if (selected) {
        setSelectedStrategy(selected);
      }
    }
  };

  // 8. Select Strategy
  const handleSelectStrategy = async (tier: 'conservative' | 'balanced' | 'aggressive') => {
    if (!activeRequest) return;
    setErrorMessage(null);
    setIsSelectingStrategy(true);
    const res = await selectStrategy(activeRequest.id, tier);
    setIsSelectingStrategy(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.data) {
      setSelectedStrategy(res.data);
      // Refresh requests data
      handleRefreshRequestDetails();
    }
  };

  // 9. Build campaign
  const handleBuildCampaign = async () => {
    if (!activeRequest || !selectedStrategy) return;
    setErrorMessage(null);
    setIsBuilding(true);
    const res = await buildCampaign(activeRequest.id, selectedStrategy.tier);
    setIsBuilding(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.data) {
      setActiveRequest(res.data);
      startPolling(activeRequest.id);
    }
  };

  // 10. Selection details helper from table row
  const handleSelectRequestFromTable = async (req: CampaignCreationRequest) => {
    const buildStatuses = ["building", "ready_for_review", "approved", "published"];
    if (buildStatuses.includes(req.status)) {
      router.push(`/campaigns/${req.id}/building`);
      return;
    }

    let isExpert = false;
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        isExpert = data.expert_mode ?? false;
      }
    } catch (e) {
      console.error("Error reading expert mode settings in table click:", e);
    }

    if (isExpert) {
      router.push(`/campaigns/${req.id}/strategy`);
    } else {
      router.push(`/campaigns/${req.id}/building`);
    }
  };

  // 11. Workflow timeline mapper
  const getTimelineSteps = (): TimelineStep[] => {
    if (!activeRequest) return [];

    const status = activeRequest.status;
    const isLibraryResolved = activeRequest.request_payload?.resolver_status === "resolved";

    const isCreatedCompleted = true;
    
    const isResolvedCompleted = isLibraryResolved || ["strategy_ready", "strategy_review_required", "building", "ready_for_review", "published", "failed", "approved"].includes(status);
    const isResolvedRunning = !isLibraryResolved && status === "draft" && isResolving;
    const isResolvedFailed = status === "resolution_failed";

    const isStrategyCompleted = ["strategy_ready", "strategy_review_required", "building", "ready_for_review", "published", "failed", "approved"].includes(status);
    const isStrategyRunning = status === "draft" && isLibraryResolved && isGeneratingStrategy;
    const isStrategyFailed = false;

    const isStrategyReadyCompleted = ["strategy_ready", "building", "ready_for_review", "published", "approved"].includes(status) && strategies.length > 0;
    const isStrategyReadyWarning = status === "strategy_ready" && strategies.length === 0;

    const isBuildingCompleted = ["ready_for_review", "published", "approved"].includes(status);
    const isBuildingRunning = status === "building" || isBuilding;
    const isBuildingFailed = status === "failed" && activeRequest.error_code === "build_failed";

    const isReadyCompleted = ["ready_for_review", "published", "approved"].includes(status);

    return [
      { key: "created", label: "بدء طلب الحملة إلكترونياً", state: "completed" },
      {
        key: "resolved",
        label: isLibraryResolved ? "منشور محدد من المكتبة (تخطي الحل)" : "تحليل وحل رابط المنشور المستهدف",
        state: isResolvedFailed ? "failed" : isResolvedRunning ? "running" : isResolvedCompleted ? "completed" : "pending"
      },
      {
        key: "strategy",
        label: "توليد استراتيجيات الذكاء الاصطناعي",
        state: isStrategyRunning ? "running" : isStrategyCompleted ? "completed" : "pending"
      },
      {
        key: "strategy_ready",
        label: "الاستراتيجية جاهزة للمراجعة والقبول",
        state: isStrategyReadyWarning ? "failed" : isStrategyReadyCompleted ? "completed" : "pending"
      },
      {
        key: "building",
        label: "جاري بناء الحملة في الحساب الإعلاني",
        state: isBuildingFailed ? "failed" : isBuildingRunning ? "running" : isBuildingCompleted ? "completed" : "pending"
      },
      {
        key: "ready",
        label: "الحملة جاهزة للمراجعة كـ PAUSED",
        state: isReadyCompleted ? "completed" : "pending"
      }
    ];
  };

  // Card triggers
  const handleSelectForCampaign = async (item: ContentLibraryItem, forceNewAttempt = false) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setActiveRequest(null);
    setStrategies([]);
    setSelectedStrategy(null);

    let selectedAccountId = "";
    let isExpert = false;
    let alreadyPromoted = false;
    let existingRequestId = "";
    let recommendedAction = "create_new";

    try {
      const [contextRes, settingsRes] = await Promise.all([
        fetch(`/api/content/${item.id}/promotion-context`, { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" })
      ]);

      if (contextRes.ok) {
        const context = await contextRes.json();
        selectedAccountId = context.recommended_ad_account_id;
        alreadyPromoted = context.already_promoted;
        existingRequestId = context.existing_request_id;
        recommendedAction = context.recommended_action || "create_new";
      }
      
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        isExpert = settings.expert_mode ?? false;
      }
    } catch (err) {
      console.error("Error loading promotion context / settings:", err);
    }

    if (forceNewAttempt) {
      recommendedAction = "create_new";
    }

    // Connected-account fallback
    if (!selectedAccountId) {
      const connected = accounts.filter(a => a.connection_status === "connected");
      if (connected.length > 0) {
        selectedAccountId = connected[0].id;
      } else if (accounts.length > 0) {
        selectedAccountId = accounts[0].id;
      }
    }

    if (!selectedAccountId) {
      setErrorMessage("لا يوجد حساب إعلاني متصل لبدء الحملة. يرجى مراجعة صفحة الإعدادات.");
      setIsSubmitting(false);
      return;
    }

    // Action A: Open Existing Request
    if (recommendedAction === "open_existing" && existingRequestId) {
      alert("هذا المنشور لديه طلب ترويج سابق. سيتم نقلك لمتابعته.");
      router.push(`/campaigns/${existingRequestId}/building`);
      setIsSubmitting(false);
      return;
    }

    // Action B: Retry Failed Request
    if (recommendedAction === "retry" && existingRequestId) {
      try {
        console.log(`[Smart Promote Retry] Triggering controlled reset retry for request ${existingRequestId}`);
        const retryRes = await fetch(`/api/campaigns/${existingRequestId}/retry`, {
          method: "POST"
        });
        
        if (!retryRes.ok) {
          const data = await retryRes.json();
          throw new Error(data.error || "فشلت إعادة تهيئة المحاولة");
        }
        
        router.push(`/campaigns/${existingRequestId}/building`);
      } catch (err) {
        console.error("Error retrying request:", err);
        setErrorMessage(err instanceof Error ? err.message : "فشلت إعادة محاولة الترويج.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Action C: Promote Again / New Request Attempt
    const attemptId = self.crypto.randomUUID();
    const idempotencyKey = `campaign:11111111-1111-4111-8111-111111111111:${item.id}:${attemptId}`;

    // Create the request using our V2 parameters
    const res = await createRequest({
      content_library_id: item.id,
      target_ad_account_id: selectedAccountId,
      destination_type: "whatsapp",
      requested_daily_budget: null,
      execution_mode: "live",
      placements: "advantage_plus",
      expert_mode: isExpert,
      idempotency_key: idempotencyKey,
    } as any);

    setIsSubmitting(false);

    if (res.error) {
      setErrorMessage(res.error);
      return;
    }

    if (res.data) {
      const newReq = Array.isArray(res.data) ? res.data[0] : res.data;
      const reqId = newReq?.id || newReq?.request_id;
      const nextStep = newReq?.next_step || (res.data as any)?.next_step;
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!reqId || !uuidRegex.test(reqId)) {
        setErrorMessage("خطأ: لم يتم تلقي معرف طلب صالح (UUID) من الخادم. تعذر بدء المزامنة.");
        return;
      }

      if (isExpert) {
        router.push(`/campaigns/${reqId}/strategy`);
      } else {
        const query = nextStep ? `?next_step=${nextStep}` : "";
        router.push(`/campaigns/${reqId}/building${query}`);
      }
    }
  };

  const handleShowDetails = (item: ContentLibraryItem) => {
    setSelectedItemForDetails(item);
    setIsDetailsOpen(true);
  };

  const handleShowAIEditor = (item: ContentLibraryItem) => {
    setSelectedItemForAIEditor(item);
    setIsAIEditorOpen(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 1. Page Header (Standard Layout) */}
      {!activeRequest ? (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
              <Library size={22} style={{ color: "var(--blue)" }} />
              مركز التسويق بالذكاء الاصطناعي (AI Marketing Center)
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>
              قم بإدارة حملاتك الترويجية ذاتية القيادة بالكامل. يحلل الذكاء الاصطناعي تفاعل المحتوى ويشيد الخطط الإعلانية وينشرها تلقائياً على Meta.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
            <ContentSyncButton
              onSync={handleContentSync}
              isSyncing={isSyncingContent}
              lastSyncTime={lastSyncTime}
            />
            {syncSummary && !isSyncingContent && (
              <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                {syncSummary}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <button
            onClick={() => {
              stopPolling();
              setActiveRequest(null);
              setStrategies([]);
              setSelectedStrategy(null);
              loadRequests();
            }}
            className="sync-button"
            style={{
              padding: "6px 12px",
              background: "rgba(255,255,255,0.03)",
              borderColor: "var(--border)",
              fontSize: "12.5px"
            }}
          >
            <ArrowRight size={14} style={{ marginLeft: "6px" }} />
            العودة لمكتبة المحتوى
          </button>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "700" }}>متابعة معالجة الطلب</h1>
            <span className="ltr-val" style={{ fontSize: "11.5px", color: "var(--muted)" }}>ID: {activeRequest.id}</span>
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="panel" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", gap: "10px", color: "var(--red)" }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: "13px" }}>
            {errorMessage}
          </div>
          <button onClick={() => setErrorMessage(null)} style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>إغلاق</button>
        </div>
      )}

      {/* 2. Active Request Details Panel (if set) */}
      {activeRequest ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 3fr", gap: "24px", alignItems: "stretch" }}>
          {/* Sticky Left Sidebar Timeline */}
          <div>
            <WorkflowTimeline steps={getTimelineSteps()} />
            
            {/* Context/Refresh options */}
            <div className="panel" style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px", background: "var(--surface-soft)" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "600" }}>حالة المعالجة الحالية:</span>
              <strong style={{ fontSize: "13.5px" }}>{activeRequest.status.toUpperCase()}</strong>
              
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                <button onClick={handleRefreshRequestDetails} className="sync-button" style={{ fontSize: "11.5px", padding: "4px 10px" }}>
                  <RefreshCcw size={12} style={{ marginLeft: "4px" }} />
                  تحديث البيانات
                </button>
                
                {activeRequest.status === "resolution_failed" && (
                  <button onClick={handleManualResolveRetry} className="sync-button" style={{ borderColor: "var(--red)", color: "var(--red)", fontSize: "11.5px", padding: "4px 10px" }}>
                    إعادة محاولة التحليل
                  </button>
                )}

                {activeRequest.status === "draft" && !isGeneratingStrategy && (
                  <button onClick={handleManualStrategyRetry} className="sync-button" style={{ borderColor: "var(--blue)", color: "var(--blue)", fontSize: "11.5px", padding: "4px 10px" }}>
                    إعادة توليد الخطة
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Main Flow Details Area */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Case A: Resolution Failed */}
            {activeRequest.status === "resolution_failed" && (
              <div className="panel" style={{ borderLeft: "4px solid var(--red)" }}>
                <h3 style={{ color: "var(--red)", fontSize: "15px", fontWeight: "700", marginBottom: "8px" }}>فشل تحليل المنشور المستهدف</h3>
                <p style={{ fontSize: "13px", lineHeight: "1.6" }}>
                  حدث خطأ أثناء الاتصال بمحدد المنشورات لحل هذا الرابط.
                </p>
                {activeRequest.error_message && (
                  <pre style={{ background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "4px", fontSize: "12px", color: "var(--red)", marginTop: "10px" }}>
                    {activeRequest.error_message}
                  </pre>
                )}
              </div>
            )}

            {/* Case B: Content Analysis block (if available inside payload) */}
            {activeRequest.request_payload?.content_analysis && (
              <ContentAnalysis analysis={activeRequest.request_payload.content_analysis} />
            )}

            {/* Case C: Strategy Node ready but strategy_ready without rows (Gap Warning) */}
            {activeRequest.status === "strategy_ready" && strategies.length === 0 && (
              <div className="panel" style={{ border: "1px solid var(--amber)", background: "rgba(245, 158, 11, 0.05)", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", color: "var(--amber)" }}>
                  <AlertTriangle size={18} />
                  <h3 style={{ fontSize: "14.5px", fontWeight: "700" }}>الاستراتيجيات قيد الحفظ</h3>
                </div>
                <p style={{ fontSize: "12.5px", color: "var(--muted)", lineHeight: "1.6" }}>
                  أشار نظام الذكاء الاصطناعي بأن الخطة جاهزة، ولكن لم تكتمل عملية كتابة الاستراتيجيات إلى قاعدة البيانات بعد. يرجى الضغط على زر التحديث أو الانتظار قليلاً.
                </p>
                <button
                  onClick={handleRefreshRequestDetails}
                  className="sync-button"
                  style={{
                    alignSelf: "flex-start",
                    borderColor: "var(--amber)",
                    color: "var(--amber)",
                    fontSize: "12px",
                    background: "rgba(245, 158, 11, 0.03)"
                  }}
                >
                  <RefreshCcw size={12} style={{ marginLeft: "4px" }} />
                  تحديث فوري للاستراتيجيات
                </button>
              </div>
            )}

            {/* Case D: Strategy Selector (show when rows exist) */}
            {strategies.length > 0 && (
              <StrategySelector
                strategies={strategies}
                selectedTier={selectedStrategy?.tier || null}
                onSelectTier={handleSelectStrategy}
                disabled={isSelectingStrategy || ["building", "ready_for_review", "published", "approved"].includes(activeRequest.status)}
              />
            )}

            {/* Case E: Preview & Build block */}
            {selectedStrategy && (
              <>
                <CampaignPreview strategy={selectedStrategy} />
                <BuildSummary
                  request={activeRequest}
                  selectedStrategy={selectedStrategy}
                  onBuild={handleBuildCampaign}
                  isLoading={isBuilding || activeRequest.status === "building"}
                  disabled={isBuilding || ["building", "ready_for_review", "published", "approved"].includes(activeRequest.status)}
                />
              </>
            )}
          </div>
        </div>
      ) : (
        /* 3. Content Library Grid view (Default Layout) */
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <ContentLibrary
            items={contentItems}
            isLoading={isLoadingContent}
            onSelectForCampaign={handleSelectForCampaign}
            onShowDetails={handleShowDetails}
            onShowAIEditor={handleShowAIEditor}
            onSyncTrigger={handleContentSync}
            isSyncing={isSyncingContent}
            pagination={contentPagination}
            onPageChange={(newOffset) => setContentPagination((prev) => ({ ...prev, offset: newOffset }))}
            onSearch={setSearchQuery}
            onFilterChange={(f) => {
              setActiveFilters(f);
              setContentPagination((prev) => ({ ...prev, offset: 0 }));
            }}
            onSortChange={(s) => {
              setSortBy(s);
              setContentPagination((prev) => ({ ...prev, offset: 0 }));
            }}
          />


        </div>
      )}

      {/* 5. Drawers Area */}
      {/* Content details Drawer */}
      <ContentDetails
        item={selectedItemForDetails}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedItemForDetails(null);
        }}
      />

      {/* AI Editor Drawer */}
      <ContentAIEditor
        item={selectedItemForAIEditor}
        isOpen={isAIEditorOpen}
        onClose={() => {
          setIsAIEditorOpen(false);
          setSelectedItemForAIEditor(null);
        }}
      />

      {/* Selected Campaign Config Form Drawer */}
      <ContentSelectionDrawer
        item={selectedItemForCampaign}
        isOpen={isCampaignDrawerOpen}
        onClose={() => {
          setIsCampaignDrawerOpen(false);
          setSelectedItemForCampaign(null);
        }}
        accounts={accounts}
        onSubmit={handleCreateRequestFromLibrary}
        isLoading={isSubmitting}
      />

      {/* 6. Recent Requests Table (kept at the bottom) */}
      <RecentRequests
        requests={requests}
        onSelectRequest={handleSelectRequestFromTable}
        activeRequestId={activeRequest?.id}
      />
    </div>
  );
}
