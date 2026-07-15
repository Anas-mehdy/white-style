import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const mockMode = process.env.CAMPAIGN_CENTER_MOCK_MODE === "true";
    const supabase = await createClient();

    // 1. Fetch current record
    const { data: requestData, error: requestError } = await supabase
      .from("campaign_creation_requests")
      .select("*, meta_ad_accounts(name), campaign_strategies(id, tier, selected, status, meta_campaign_id, meta_adset_id, meta_creative_id, meta_ad_id)")
      .eq("id", requestId)
      .maybeSingle();

    if (requestError) {
      return NextResponse.json({ error: requestError.message }, { status: 500 });
    }

    if (!requestData) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    // 2. Mock Mode Time-Progression Simulations (Serverless compliant)
    if (mockMode) {
      const payload = requestData.request_payload || {};
      const now = Date.now();

      // Case A: Mock Strategy analyzing -> strategy_ready transition after 5 seconds
      if (requestData.status === "analyzing" && payload.mock_strategy_started_at) {
        const startTime = new Date(payload.mock_strategy_started_at).getTime();
        if (now - startTime >= 5000) {
          // Perform transitions
          const mockStrategies = [
            {
              request_id: requestId,
              tier: "conservative",
              campaign_name: "White Style - Conservative Campaign - فستان أبيض",
              objective: "OUTCOMES",
              optimization_goal: "MESSAGES",
              billing_event: "IMPRESSIONS",
              bid_strategy: "LOWEST_COST_WITHOUT_CAP",
              destination_type: "whatsapp",
              daily_budget: 10,
              duration_days: 7,
              age_min: 24,
              age_max: 45,
              gender: "female",
              country_codes: ["IL", "PS"],
              placements: ["facebook", "instagram"],
              targeting_mode: "custom",
              interest_hints: ["فساتين", "ملابس نسائية", "تسوق"],
              confidence: 88,
              reasons: ["استهداف دقيق لجمهور مهتم بالفساتين النسائية", "ميزانية منخفضة لتقليل مخاطر الهدر"],
              warnings: ["وصول محدود للمنشور بسبب تضييق الاستهداف"],
              strategy_payload: { cpa_estimate: 1.85, expected_conversations: 5 },
              selected: false,
              status: "draft"
            },
            {
              request_id: requestId,
              tier: "balanced",
              campaign_name: "White Style - Balanced Campaign - فستان أبيض",
              objective: "OUTCOMES",
              optimization_goal: "MESSAGES",
              billing_event: "IMPRESSIONS",
              bid_strategy: "LOWEST_COST_WITHOUT_CAP",
              destination_type: "whatsapp",
              daily_budget: 15,
              duration_days: 10,
              age_min: 22,
              age_max: 50,
              gender: "female",
              country_codes: ["IL", "PS"],
              placements: ["advantage_plus"],
              targeting_mode: "advantage_plus",
              interest_hints: ["موضة نسائية", "فساتين سهرة", "أناقة"],
              confidence: 94,
              reasons: ["استخدام مواضع تلقائية لتوسيع الوصول وتحسين التوزيع", "موازنة التكلفة والوصول اليومي"],
              warnings: ["مواضع فيسبوك قد تقدم كفاءة أعلى نسبياً"],
              strategy_payload: { cpa_estimate: 1.55, expected_conversations: 10 },
              selected: true,
              status: "draft"
            },
            {
              request_id: requestId,
              tier: "aggressive",
              campaign_name: "White Style - Aggressive Campaign - فستان أبيض",
              objective: "OUTCOMES",
              optimization_goal: "MESSAGES",
              billing_event: "IMPRESSIONS",
              bid_strategy: "LOWEST_COST_WITHOUT_CAP",
              destination_type: "whatsapp",
              daily_budget: 25,
              duration_days: 14,
              age_min: 18,
              age_max: 55,
              gender: "all",
              country_codes: ["IL", "PS"],
              placements: ["advantage_plus"],
              targeting_mode: "broad",
              interest_hints: ["تسوق إلكتروني", "علامات تجارية فاخرة"],
              confidence: 91,
              reasons: ["توسيع الفئة العمرية والنوع لزيادة انتشار العلامة التجارية", "ميزانية مرتفعة لاستغلال الفرص بكثافة"],
              warnings: ["ارتفاع CPA في بداية الحملة حتى يستقر التفاعل"],
              strategy_payload: { cpa_estimate: 2.1, expected_conversations: 12 },
              selected: false,
              status: "draft"
            }
          ];

          // Check if strategies already exist in database
          const { count } = await supabase
            .from("campaign_strategies")
            .select("request_id", { count: "exact", head: true })
            .eq("request_id", requestId);

          if (count === 0) {
            for (const strat of mockStrategies) {
              await supabase.from("campaign_strategies").insert(strat);
            }
          }

          // Generate mock tab analysis outputs
          const mockPayload = {
            ...payload,
            resolver_status: "resolved",
            resolver_method: "content_library",
            content_analysis: {
              platform: "Instagram",
              media_type: "Reel",
              content_summary: "فستان نسائي أبيض أنيق مصنوع من الحرير الطبيعي ومناسب للمناسبات الراقية والأعياد والمواسم.",
              detected_goal: "Sales (المبيعات والمحادثات)",
              detected_language: "Arabic (العربية)",
              confidence: 94
            },
            historical_analysis: {
              historical_cvr_pct: 4.8,
              top_performing_placement: "Instagram Reels",
              average_likes_organic: 342,
              recommendation: "المنشورات المشابهة حققت تفاعلاً أعلى بنسبة 15% على إنستغرام مقارنة بفيسبوك."
            },
            audience_plan: {
              target_demographics: "نساء بعمر 22-45 عام مهتمات بالموضة والفساتين الفاخرة والأناقة والتصميم العصري",
              key_interests: ["فساتين سهرة", "تسوق إلكتروني", "أناقة", "حرير طبيعي"],
              targeting_approach: "استخدام ميزة Advantage+ مع إرشادات استهداف مرنة"
            },
            budget_plan: {
              recommended_daily_budget: 15,
              optimization_goal: "Conversations (بدء محادثات واتساب)",
              estimated_conversion_range: "8-15 محادثة يومياً بميزانية 15$"
            },
            safety_review: {
              status: "approved",
              compliance_score: 100,
              recommended_tier: "balanced",
              notes: "المحتوى آمن تماماً ومتوافق مع شروط وسياسات Meta الإعلانية."
            }
          };

          // Perform database update
          await supabase
            .from("campaign_creation_requests")
            .update({
              status: "strategy_ready",
              request_payload: mockPayload
            })
            .eq("id", requestId);

          // Force reload requestData
          const { data: reloadedReq } = await supabase
            .from("campaign_creation_requests")
            .select("*, meta_ad_accounts(name), campaign_strategies(id, tier, selected, status, meta_campaign_id, meta_adset_id, meta_creative_id, meta_ad_id)")
            .eq("id", requestId)
            .single();
          if (reloadedReq) {
            Object.assign(requestData, reloadedReq);
          }
        }
      }

      // Case B: Mock Campaign building -> ready_for_review transition after 6 seconds
      if (requestData.status === "building" && payload.mock_build_started_at) {
        const startTime = new Date(payload.mock_build_started_at).getTime();
        if (now - startTime >= 6000) {
          // Perform transitions
          await supabase
            .from("campaign_creation_requests")
            .update({ status: "ready_for_review" })
            .eq("id", requestId);

          // Update strategies built status
          await supabase
            .from("campaign_strategies")
            .update({
              status: "built_paused",
              meta_campaign_id: "act_demo_camp_123456",
              meta_adset_id: "act_demo_adset_123456",
              meta_creative_id: "act_demo_creative_123456",
              meta_ad_id: "act_demo_ad_123456",
            })
            .eq("request_id", requestId)
            .eq("tier", payload.mock_build_tier || "balanced");

          // Force reload requestData
          const { data: reloadedReq } = await supabase
            .from("campaign_creation_requests")
            .select("*, meta_ad_accounts(name), campaign_strategies(id, tier, selected, status, meta_campaign_id, meta_adset_id, meta_creative_id, meta_ad_id)")
            .eq("id", requestId)
            .single();
          if (reloadedReq) {
            Object.assign(requestData, reloadedReq);
          }
        }
      }
    }

    // 3. Query the strategies
    const { data: strategies, error: strategiesError } = await supabase
      .from("campaign_strategies")
      .select("*")
      .eq("request_id", requestId);

    if (strategiesError) {
      return NextResponse.json({ error: strategiesError.message }, { status: 500 });
    }

    // 4. Auto-append new execution timeline events
    try {
      const currentTimeline = requestData.execution_timeline || [];
      const newEvents = [...currentTimeline];
      
      const hasEvent = (name: string) => newEvents.some((e: any) => e.event === name);
      const addEvent = (name: string, timestamp = new Date().toISOString()) => {
        if (!hasEvent(name)) {
          newEvents.push({ event: name, timestamp });
          return true;
        }
        return false;
      };

      let updated = false;

      // Request Created
      if (addEvent("Request Created", requestData.created_at)) updated = true;

      const payload = requestData.request_payload || {};

      // Content Analysis Completed
      if (payload.content_analysis) {
        if (addEvent("Content Analysis Completed", requestData.updated_at)) updated = true;
      }
      // Historical Analysis Completed
      if (payload.historical_analysis) {
        if (addEvent("Historical Analysis Completed", requestData.updated_at)) updated = true;
      }
      // Audience Planned
      if (payload.audience_plan) {
        if (addEvent("Audience Planned", requestData.updated_at)) updated = true;
      }
      // Budget Planned
      if (payload.budget_plan) {
        if (addEvent("Budget Planned", requestData.updated_at)) updated = true;
      }
      // Safety Approved
      if (payload.safety_review) {
        if (addEvent("Safety Approved", requestData.updated_at)) updated = true;
      }

      // Strategy Selected
      const selectedStrat = strategies?.find((s: any) => s.selected === true);
      if (selectedStrat || requestData.selected_strategy) {
        if (addEvent("Strategy Selected", requestData.updated_at)) updated = true;
      }

      // Meta Campaign Created
      if (selectedStrat?.meta_campaign_id) {
        if (addEvent("Campaign Created", selectedStrat.updated_at || requestData.updated_at)) updated = true;
      }
      // Meta Ad Set Created
      if (selectedStrat?.meta_adset_id) {
        if (addEvent("Ad Set Created", selectedStrat.updated_at || requestData.updated_at)) updated = true;
      }
      // Meta Creative Uploaded
      if (selectedStrat?.meta_creative_id) {
        if (addEvent("Creative Uploaded", selectedStrat.updated_at || requestData.updated_at)) updated = true;
      }
      // Meta Advertisement Created
      if (selectedStrat?.meta_ad_id) {
        if (addEvent("Advertisement Created", selectedStrat.updated_at || requestData.updated_at)) updated = true;
      }

      // Campaign Running
      if (requestData.status === "published" || requestData.status === "ready_for_review" || requestData.status === "approved") {
        if (addEvent("Campaign Running", requestData.updated_at)) updated = true;
      }

      if (updated) {
        requestData.execution_timeline = newEvents;
        await supabase
          .from("campaign_creation_requests")
          .update({ execution_timeline: newEvents } as any)
          .eq("id", requestId);
      }
    } catch (e) {
      console.error("Failed to automatically update campaign execution timeline:", e);
    }

    return NextResponse.json({
      request: requestData,
      strategies: strategies || [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
