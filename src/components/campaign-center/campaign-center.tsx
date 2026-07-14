"use client";

import { useState, useEffect, useRef } from "react";
import { RequestForm } from "./request-form";
import { WorkflowTimeline, TimelineStep } from "./workflow-timeline";
import { ContentAnalysis } from "./content-analysis";
import { StrategySelector } from "./strategy-selector";
import { CampaignPreview } from "./campaign-preview";
import { BuildSummary } from "./build-summary";
import { RecentRequests } from "./recent-requests";
import { CampaignCreationRequest, CampaignStrategy } from "./types";
import {
  createRequest,
  resolveRequest,
  generateStrategy,
  selectStrategy,
  buildCampaign,
  fetchRequests,
  fetchRequestDetails,
} from "./api";
import { PageHeader } from "@/components/dashboard";
import { AlertCircle, BrainCircuit, RefreshCw, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";

interface Account {
  id: string;
  name: string;
  meta_account_id: string;
}

interface CampaignCenterProps {
  accounts: Account[];
}

export function CampaignCenter({ accounts }: CampaignCenterProps) {
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

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pollErrorCount, setPollErrorCount] = useState(0);

  // Polling ref to clear interval
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch recent requests on mount
  useEffect(() => {
    loadRequests();
    return () => stopPolling();
  }, []);

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

  // 2. Polling active request details
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

        // Update selected strategy based on selected column
        const selected = strats.find((s) => s.selected);
        setSelectedStrategy(selected || null);

        // Update requests table list
        setRequests((prev) =>
          prev.map((r) => (r.id === request.id ? request : r))
        );

        // Stop polling if request reaches a terminal or final review state
        const stopStatuses = ["resolution_failed", "ready_for_review", "published", "failed", "approved", "rejected"];
        if (stopStatuses.includes(request.status)) {
          // Exception: If status is strategy_ready but we have no strategies, keep polling or let user retry
          if (request.status === "strategy_ready" && strats.length === 0) {
            // Keep polling for data synchronization skew
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

  // 3. Handle new campaign request submit
  const handleCreateRequest = async (formData: {
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

      const normalizedReq = {
        ...newReq,
        id: reqId,
        request_id: reqId,
      };

      setActiveRequest(normalizedReq);
      setRequests((prev) => [normalizedReq, ...prev]);

      // Start the intake workflow polling
      startPolling(reqId);
      
      // Automatically trigger resolve and strategy sequentially
      triggerWorkflowChain(reqId);
    }
  };

  // Sequential workflow trigger helper
  const triggerWorkflowChain = async (requestId: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!requestId || !uuidRegex.test(requestId)) {
      setErrorMessage("خطأ: معرف الطلب غير صالح (UUID). تم إيقاف عملية التحليل.");
      return;
    }

    // Stage 1: Resolve post identifiers
    setIsResolving(true);
    const resolveRes = await resolveRequest(requestId);
    setIsResolving(false);
    if (resolveRes.error) {
      setErrorMessage(resolveRes.error);
      return;
    }

    // Stage 2: Generate strategy (after resolution succeeded or request status updated)
    setIsGeneratingStrategy(true);
    const strategyRes = await generateStrategy(requestId);
    setIsGeneratingStrategy(false);
    if (strategyRes.error) {
      setErrorMessage(strategyRes.error);
    }
  };

  // 4. Manual retry actions
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
      triggerWorkflowChain(reqId);
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
      setActiveRequest(res.data.request);
      setStrategies(res.data.strategies);
      const selected = res.data.strategies.find((s) => s.selected);
      setSelectedStrategy(selected || null);
      
      if (["draft", "building"].includes(res.data.request.status)) {
        startPolling(res.data.request.id);
      }
    }
  };

  // 5. Select strategy tier
  const handleSelectTier = async (tier: 'conservative' | 'balanced' | 'aggressive') => {
    if (!activeRequest) return;
    setIsSelectingStrategy(true);
    setErrorMessage(null);

    const res = await selectStrategy(activeRequest.id, tier);
    setIsSelectingStrategy(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.data) {
      setSelectedStrategy(res.data);
      // Refresh details to ensure selected column matches
      handleRefreshRequestDetails();
    }
  };

  // 6. Build campaign on Meta
  const handleBuildCampaign = async () => {
    if (!activeRequest || !selectedStrategy) return;
    setIsBuilding(true);
    setErrorMessage(null);

    const res = await buildCampaign(activeRequest.id, selectedStrategy.tier);
    setIsBuilding(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.data) {
      setActiveRequest(res.data);
      startPolling(res.data.id);
    }
  };

  // 7. Select past request from recent requests table
  const handleSelectPastRequest = (req: CampaignCreationRequest) => {
    setErrorMessage(null);
    setActiveRequest(req);
    setStrategies([]);
    setSelectedStrategy(null);
    
    // Fetch latest details & start polling if it is in progress
    fetchRequestDetails(req.id).then((res) => {
      if (res.data) {
        setActiveRequest(res.data.request);
        setStrategies(res.data.strategies);
        const selected = res.data.strategies.find((s) => s.selected);
        setSelectedStrategy(selected || null);
        
        if (["draft", "building"].includes(res.data.request.status)) {
          startPolling(res.data.request.id);
        } else {
          stopPolling();
        }
      }
    });
  };

  // Calculate timeline step states
  const getTimelineSteps = (): TimelineStep[] => {
    const status = activeRequest?.status || "draft";
    
    const steps: TimelineStep[] = [
      { key: "created", label: "تم إنشاء الطلب", state: "completed" },
      { key: "resolved", label: "تم تحليل المنشور ورابطه", state: "pending" },
      { key: "analysed", label: "تحليل المحتوى بالذكاء الاصطناعي", state: "pending" },
      { key: "strategy", label: "الاستراتيجية جاهزة للمراجعة", state: "pending" },
      { key: "building", label: "بناء الحملة الإعلانية", state: "pending" },
      { key: "ready", label: "جاهز للمراجعة والتدقيق", state: "pending" },
    ];

    // Stage 1: Resolve Post
    if (isResolving) {
      steps[1].state = "running";
    } else if (status === "resolution_failed") {
      steps[1].state = "failed";
    } else if (status !== "draft") {
      steps[1].state = "completed";
    }

    // Stage 2: Content Analysis
    if (activeRequest?.request_payload?.content_analysis) {
      steps[2].state = "completed";
    } else if (isResolving) {
      steps[2].state = "pending";
    } else if (status === "resolution_failed") {
      steps[2].state = "failed";
    } else if (status !== "draft") {
      steps[2].state = "completed";
    }

    // Stage 3: Strategy Ready
    if (isGeneratingStrategy) {
      steps[3].state = "running";
    } else if (["strategy_ready", "strategy_review_required", "building", "ready_for_review", "approved", "published"].includes(status)) {
      steps[3].state = "completed";
    } else if (status === "failed") {
      steps[3].state = "failed";
    }

    // Stage 4: Campaign Building
    if (isBuilding || status === "building") {
      steps[4].state = "running";
    } else if (["ready_for_review", "approved", "published"].includes(status)) {
      steps[4].state = "completed";
    } else if (status === "failed") {
      steps[4].state = "failed";
    }

    // Stage 5: Ready for Review
    if (["ready_for_review", "approved", "published"].includes(status)) {
      steps[5].state = "completed";
    } else if (status === "failed") {
      steps[5].state = "failed";
    }

    return steps;
  };

  const steps = getTimelineSteps();

  // Condition check for integration gap (status strategy_ready but no strategy rows exist in campaign_strategies)
  const isStrategyReady = ["strategy_ready", "strategy_review_required"].includes(activeRequest?.status || "");
  const hasNoStrategies = isStrategyReady && strategies.length === 0;

  return (
    <>
      <PageHeader title="إنشاء الحملات الذكية" />

      {errorMessage && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgb(239, 68, 68)",
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "20px",
            color: "rgb(239, 68, 68)",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer", fontWeight: "700" }}
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Main Grid: Left is Form/Details, Right is Timeline */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.85fr) minmax(280px, 0.75fr)", gap: "20px", marginBottom: "24px", alignItems: "start" }}>
        
        {/* Left wider column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <RequestForm
            accounts={accounts}
            onSubmit={handleCreateRequest}
            isLoading={isSubmitting || isResolving || isGeneratingStrategy}
          />

          {!activeRequest ? (
            // Empty State
            <article className="panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center", gap: "16px", background: "var(--surface-soft)" }}>
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--nav-active-bg)", display: "grid", placeItems: "center", color: "var(--nav-active-color)" }}>
                <BrainCircuit size={42} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--foreground)" }}>مركز إنشاء الحملات الإعلانية الذكية بالذكاء الاصطناعي</h3>
              <p style={{ color: "var(--muted)", fontSize: "13px", maxWidth: "420px", margin: 0, lineHeight: "1.6" }}>
                ابدأ بإنشاء أول حملة إعلانية ذكية. أدخل رابط المنشور وتفاصيل الميزانية والوجهة أعلاه ليقوم الذكاء الاصطناعي بالتحليل وبناء حملة مخصصة.
              </p>
            </article>
          ) : (
            // Active Request Flow
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600" }}>الطلب النشط حالياً: <span className="ltr-val" style={{ fontSize: "12px", color: "var(--blue)" }}>{activeRequest.id}</span></h3>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={handleRefreshRequestDetails} className="sync-button" style={{ padding: "6px 12px", fontSize: "12px" }}>
                    <RefreshCw size={12} /> تحديث الحالة
                  </button>
                </div>
              </div>

              {/* Step 1: Content Analysis */}
              {activeRequest.request_payload?.content_analysis && (
                <ContentAnalysis analysis={activeRequest.request_payload.content_analysis} />
              )}

              {/* Warning state: integration gap (no strategy rows exist) */}
              {hasNoStrategies && (
                <div
                  style={{
                    background: "var(--amber-soft)",
                    border: "1px solid var(--amber)",
                    borderRadius: "10px",
                    padding: "16px",
                    color: "var(--amber)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", fontWeight: "600" }}>
                    <AlertCircle size={18} />
                    <span>فجوة مزامنة: الاستراتيجية جاهزة ولكن لم يتم العثور على خطط مقترحة في قاعدة البيانات.</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "12.5px", color: "var(--muted)", lineHeight: "1.6" }}>
                    قد يستغرق سير العمل في n8n بضع ثوانٍ إضافية لحفظ الخطط الثلاث (الخيار المحافظ، المتوازن، الهجومي). يرجى النقر على زر إعادة المحاولة للتحديث وجلب الخطط المخصصة.
                  </p>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={handleRefreshRequestDetails}
                      className="sync-button"
                      style={{
                        borderColor: "var(--amber)",
                        color: "var(--amber)",
                        background: "transparent",
                        padding: "6px 14px",
                        fontSize: "12.5px"
                      }}
                    >
                      <RefreshCw size={14} /> تحديث واستعلام عن الخطط
                    </button>
                    <button
                      onClick={handleManualStrategyRetry}
                      disabled={isGeneratingStrategy}
                      className="sync-button"
                      style={{
                        borderColor: "var(--amber)",
                        color: "white",
                        background: "var(--amber)",
                        padding: "6px 14px",
                        fontSize: "12.5px"
                      }}
                    >
                      {isGeneratingStrategy ? "جاري إعادة التوليد..." : "إعادة تشغيل مولد الاستراتيجية"}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Strategy Selector */}
              {isStrategyReady && strategies.length > 0 && (
                <StrategySelector
                  strategies={strategies}
                  selectedTier={selectedStrategy?.tier || null}
                  onSelectTier={handleSelectTier}
                  disabled={isSelectingStrategy || isBuilding}
                />
              )}

              {/* Step 3: Preview and Build Summary */}
              {selectedStrategy && (
                <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "20px" }}>
                  <CampaignPreview strategy={selectedStrategy} />
                  <BuildSummary
                    request={activeRequest}
                    selectedStrategy={selectedStrategy}
                    onBuild={handleBuildCampaign}
                    isLoading={isBuilding}
                    disabled={isSelectingStrategy || isBuilding || activeRequest.status === "building" || activeRequest.status === "ready_for_review" || activeRequest.status === "published"}
                  />
                </div>
              )}

              {/* Resolution failed card retry */}
              {activeRequest.status === "resolution_failed" && (
                <div className="panel" style={{ border: "1px solid var(--red-soft)", background: "var(--red-soft)", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <h3 style={{ fontSize: "14px", color: "var(--red)", fontWeight: "600", margin: 0 }}>فشل تحليل المنشور</h3>
                  <p style={{ fontSize: "12.5px", margin: 0, color: "var(--muted)" }}>
                    السبب: {activeRequest.error_message || "تعذر العثور على المنشور أو تحليله عبر n8n."}
                  </p>
                  <button onClick={handleManualResolveRetry} className="sync-button" style={{ borderColor: "var(--red)", color: "var(--red)", alignSelf: "flex-start", marginTop: "4px" }}>
                    <RefreshCcw size={12} /> إعادة محاولة التحليل
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right timeline column */}
        <div>
          <WorkflowTimeline steps={steps} />
        </div>
      </div>

      {/* Recent Requests Table at bottom */}
      <RecentRequests
        requests={requests}
        onSelectRequest={handleSelectPastRequest}
        activeRequestId={activeRequest?.id}
      />
    </>
  );
}
