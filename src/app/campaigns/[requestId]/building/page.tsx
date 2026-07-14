"use client";

import { Shell } from "@/components/dashboard";
import { useState, useEffect, useRef, use } from "react";
import { fetchRequestDetails, buildCampaign } from "@/components/campaign-center/api";
import { CampaignCreationRequest, CampaignStrategy } from "@/components/campaign-center/types";
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
  RefreshCw
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
  const [isBuildingRetry, setIsBuildingRetry] = useState(false);

  // Stepper progress index (0 to 5)
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [pollingTimeElapsed, setPollingTimeElapsed] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);

  const progressSteps = [
    { key: "building", label: "تشغيل محرك بناء الحملة (WS-04)" },
    { key: "creating_campaign", label: "إنشاء الحملة الإعلانية على Meta Ads Manager" },
    { key: "creating_adset", label: "إنشاء المجموعة الإعلانية وتفاصيل الاستهداف الجغرافي" },
    { key: "uploading_creative", label: "رفع وتجهيز التصميم والنص الإعلاني (Creative)" },
    { key: "creating_ad", label: "إنشاء الإعلانات وربطها بالواتساب والمحافظ الإعلانية" },
    { key: "completed", label: "الحملة جاهزة وموقوفة مؤقتاً بانتظار مراجعتك البشرية" }
  ];

  // 1. Fetch initial details
  useEffect(() => {
    loadDetails();
    return () => {
      stopPolling();
      stopStepTimer();
    };
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

      const selected = strats.find((s) => s.selected === true);
      if (selected) {
        setSelectedStrategy(selected);
      }

      // Handle Page Routing & Polling state
      handleBuildWorkflowState(reqData);
    }
  };

  const handleBuildWorkflowState = (req: CampaignCreationRequest) => {
    if (req.status === "building") {
      startBuildPolling();
      startStepSimulation();
    } else if (req.status === "ready_for_review" || req.status === "approved" || req.status === "published") {
      // Completed, set stepper to final step
      setActiveStepIdx(5);
    } else if (req.status === "draft" || req.status === "strategy_ready") {
      // Redirect back to strategy review page if not building
      router.push(`/campaigns/${requestId}/strategy`);
    }
  };

  // Step checklist simulation for visual excellence
  const startStepSimulation = () => {
    stopStepTimer();
    setActiveStepIdx(0);
    stepTimerRef.current = setInterval(() => {
      setActiveStepIdx((prev) => {
        if (prev < 4) {
          return prev + 1;
        }
        return prev; // hold at step 4 (creating_ad) until DB status is ready_for_review
      });
    }, 1500);
  };

  const stopStepTimer = () => {
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  };

  // 2. Active GET Polling
  const startBuildPolling = () => {
    stopPolling();
    setPollingTimeElapsed(0);
    pollIntervalRef.current = setInterval(async () => {
      setPollingTimeElapsed((prev) => {
        const nextTime = prev + 3;
        if (nextTime >= 300) {
          stopPolling();
          stopStepTimer();
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
        }

        // Terminal statuses to stop polling
        const stopStatuses = ["ready_for_review", "approved", "published", "failed"];
        if (stopStatuses.includes(reqData.status)) {
          stopPolling();
          stopStepTimer();
          
          if (reqData.status === "ready_for_review" || reqData.status === "approved" || reqData.status === "published") {
            setActiveStepIdx(5); // fast-forward to completed
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

  // 3. Retry Build
  const handleRetryBuild = async () => {
    if (!selectedStrategy || isBuildingRetry) return;
    setIsBuildingRetry(true);
    setErrorMessage(null);
    
    const res = await buildCampaign(requestId, selectedStrategy.tier);
    setIsBuildingRetry(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else {
      // Restart simulation & polling
      startBuildPolling();
      startStepSimulation();
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

      if (reqData.status === "building") {
        startBuildPolling();
        startStepSimulation();
      } else {
        stopPolling();
        stopStepTimer();
        if (reqData.status === "ready_for_review" || reqData.status === "approved" || reqData.status === "published") {
          setActiveStepIdx(5);
        }
      }
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

  const isFailed = request.status === "failed";
  const isBuildingActive = request.status === "building";
  const isReady = ["ready_for_review", "approved", "published"].includes(request.status);

  return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => router.push(`/campaigns/${requestId}/strategy`)}
              disabled={isBuildingActive}
              className="sync-button"
              style={{ padding: "6px 12px", background: "rgba(255,255,255,0.03)", borderColor: "var(--border)", fontSize: "12px", opacity: isBuildingActive ? 0.4 : 1 }}
            >
              <ArrowLeft size={14} style={{ marginLeft: "4px" }} />
              العودة لمراجعة الاستراتيجيات
            </button>
            <h1 style={{ fontSize: "18px", fontWeight: "700" }}>حالة بناء الحملة على Meta</h1>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isSyncing || isBuildingActive}
            className="sync-button"
            style={{ height: "36px", padding: "0 14px", fontSize: "12.5px" }}
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} style={{ marginLeft: "6px" }} />
            تحديث البيانات
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="panel" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", gap: "10px", color: "var(--red)", fontSize: "13px" }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer", fontWeight: "600" }}>إغلاق</button>
          </div>
        )}

        {/* 1. Build Progress Loader Checklist */}
        {(isBuildingActive || isFailed) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "24px", alignItems: "start" }}>
            
            {/* Checklist */}
            <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: "600" }}>سير عملية البناء (WS-04)</h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {progressSteps.map((step, idx) => {
                  const isCompleted = idx < activeStepIdx && !isFailed;
                  const isCurrent = idx === activeStepIdx && !isFailed;
                  const isPending = idx > activeStepIdx || isFailed;

                  let stepColor = "var(--muted)";
                  let icon = <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--border)" }} />;

                  if (isCompleted) {
                    stepColor = "var(--green)";
                    icon = <CheckCircle2 size={16} style={{ color: "var(--green)", fill: "rgba(16, 185, 129, 0.05)" }} />;
                  } else if (isCurrent) {
                    stepColor = "var(--blue)";
                    icon = <Loader2 size={16} className="animate-spin" style={{ color: "var(--blue)" }} />;
                  } else if (isFailed && idx === activeStepIdx) {
                    stepColor = "var(--red)";
                    icon = <AlertCircle size={16} style={{ color: "var(--red)", fill: "rgba(239, 68, 68, 0.05)" }} />;
                  }

                  return (
                    <div key={step.key} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <div style={{ width: "24px", height: "24px", display: "grid", placeItems: "center" }}>
                        {icon}
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: isCurrent ? "600" : "500", color: stepColor }}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {isBuildingActive && (
                <div style={{ fontSize: "11.5px", color: "var(--muted)", borderTop: "1px solid var(--border)", paddingTop: "12px", textAlign: "center" }}>
                  يستغرق هذا الإجراء عادةً من 10 إلى 15 ثانية...
                </div>
              )}
            </div>

            {/* Side Status Detail */}
            <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "start" }}>
                <Info size={18} style={{ color: "var(--blue)", marginTop: "2px" }} />
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: "600", margin: 0 }}>مزامنة فورية مع منصات فيسبوك</h3>
                  <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: "1.6", marginTop: "6px" }}>
                    يتم بناء عناصر الإعلان وهيكليته البرمجية مباشرة على Meta Ads API. تضمن هذه الخطوة بناء الحملة كـ <strong>موقوفة مؤقتاً (PAUSED)</strong> بشكل دائم لضمان التحكم في النشر والمراجعة.
                  </p>
                </div>
              </div>

              {isFailed && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", color: "var(--red)" }}>
                    <ShieldAlert size={16} />
                    <strong style={{ fontSize: "13px" }}>فشل بناء الحملة على Meta</strong>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "4px", fontSize: "12px", color: "var(--red)" }}>
                    <div><strong>رمز الخطأ:</strong> <code>{request.error_code || "BUILD_API_ERROR"}</code></div>
                    <div style={{ marginTop: "4px" }}><strong>السبب:</strong> {request.error_message || "Meta API rejects connection token or budget exceeds daily limit."}</div>
                  </div>
                  <button
                    onClick={handleRetryBuild}
                    disabled={isBuildingRetry}
                    className="sync-button"
                    style={{ borderColor: "var(--red)", color: "var(--red)", alignSelf: "flex-start", background: "rgba(239, 68, 68, 0.02)" }}
                  >
                    {isBuildingRetry ? "جاري إعادة المحاولة..." : "إعادة محاولة بناء الحملة"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Ready For Review Screen (when status is ready_for_review) */}
        {isReady && selectedStrategy && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Success Banner */}
            <div className="panel animate-fade-in" style={{ borderLeft: "4px solid var(--green)", background: "rgba(16, 185, 129, 0.04)" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", color: "var(--green)" }}>
                <CheckCircle2 size={22} />
                <h2 style={{ fontSize: "16px", fontWeight: "700" }}>تم بناء الحملة بنجاح في الحساب الإعلاني!</h2>
              </div>
              <p style={{ fontSize: "13.5px", color: "var(--muted)", marginTop: "6px", lineHeight: "1.6" }}>
                الحملة الآن موجودة في حساب الإعلانات الخاص بك بوضع <strong>موقوف مؤقتاً (PAUSED)</strong> ومستعدة تماماً لبدء المراجعة البشرية والتفعيل.
              </p>
            </div>

            {/* Campaign Specifications Details */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr", gap: "24px", alignItems: "start" }}>
              
              {/* Review Panel */}
              <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "600", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>مواصفات الحملة المشيدة</h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "13px" }}>
                  <div>
                    <span style={{ color: "var(--muted)" }}>اسم الحملة الإعلانية</span>
                    <strong style={{ display: "block", marginTop: "4px", fontSize: "14px" }}>{selectedStrategy.campaign_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>حالة الحملة الحالية</span>
                    <strong style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", color: "var(--amber)" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--amber)" }} />
                      PAUSED (بانتظار المراجعة)
                    </strong>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "13px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                  <div>
                    <span style={{ color: "var(--muted)" }}>معرف الحملة الإعلانية (Campaign ID)</span>
                    <code style={{ display: "block", marginTop: "4px", color: "var(--amber)", fontSize: "11.5px" }}>{selectedStrategy.meta_campaign_id || "act_demo_camp_123456"}</code>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>معرف الإعلان المشيد (Ad ID)</span>
                    <code style={{ display: "block", marginTop: "4px", fontSize: "11.5px" }}>{selectedStrategy.meta_ad_id || "act_demo_ad_123456"}</code>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "13px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                  <div>
                    <span style={{ color: "var(--muted)" }}>الهدف والتوجيه (Objective)</span>
                    <strong style={{ display: "block", marginTop: "4px" }}>{selectedStrategy.objective} / {selectedStrategy.optimization_goal}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>الميزانية اليومية المخصصة</span>
                    <strong className="ltr-val" style={{ display: "block", marginTop: "4px", fontSize: "14px" }}>${selectedStrategy.daily_budget} يومياً</strong>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "13px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                  <div>
                    <span style={{ color: "var(--muted)" }}>المواضع الإعلانية (Placements)</span>
                    <strong style={{ display: "block", marginTop: "4px" }}>{selectedStrategy.placements.join(", ") || "Advantage+ Placements"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>الجمهور المستهدف (Audience)</span>
                    <strong style={{ display: "block", marginTop: "4px" }}>
                      {selectedStrategy.gender === "all" ? "الكل" : "إناث"} (عمر {selectedStrategy.age_min} - {selectedStrategy.age_max}) في {selectedStrategy.country_codes.join(", ")}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action Sidebar */}
              <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", margin: 0 }}>موافقة ونشر</h3>
                <p style={{ fontSize: "12.5px", color: "var(--muted)", lineHeight: "1.5" }}>
                  الخطوة النهائية تتطلب الموافقة البشرية. تفعيل الحملة سيغير حالتها من PAUSED إلى ACTIVE على Facebook.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    disabled
                    className="sync-button"
                    style={{
                      justifyContent: "center",
                      background: "var(--brand-gradient)",
                      color: "white",
                      border: 0,
                      fontWeight: "700",
                      height: "40px",
                      opacity: 0.4,
                      cursor: "not-allowed"
                    }}
                  >
                    الموافقة والنشر (Approve & Publish)
                  </button>

                  <button
                    disabled
                    className="sync-button"
                    style={{
                      justifyContent: "center",
                      background: "transparent",
                      borderColor: "var(--red)",
                      color: "var(--red)",
                      fontWeight: "600",
                      height: "40px",
                      opacity: 0.4,
                      cursor: "not-allowed"
                    }}
                  >
                    رفض الحملة (Reject)
                  </button>

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

                <div style={{ display: "flex", gap: "6px", fontSize: "11px", color: "var(--muted)", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                  <Info size={14} style={{ flexShrink: 0 }} />
                  <span>أزرار التفعيل والرفض الإعلاني ستفعل عند إتمام إعداد نظام الموافقات البشرية والـ Webhook الخاص بـ WS-05.</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </Shell>
  );
}
