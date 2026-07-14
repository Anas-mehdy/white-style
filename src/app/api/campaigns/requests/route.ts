import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const TIMEOUT_MS = 15000;

const MOCK_CONTENT_ITEMS = [
  {
    id: "mock-content-1",
    account_id: "demo-account-id",
    platform: "instagram" as const,
    content_type: "reel" as const,
    meta_post_id: "ig-reel-123",
    page_id: "demo-page-id",
    instagram_media_id: "ig-media-reel-123",
    caption: "تألقي بلمسة من الفخامة الإيطالية ✨ فستان أبيض كلاسيكي مصنوع من أجود أنواع الحرير الطبيعي. متوفر الآن في المعرض بتشكيلة حصرية للمناسبات الراقية والأعياد. اطلبيه الآن عبر الواتساب لتستفيدي من خصم الشحن المجاني! 🤍 #موضة #جمال #فساتين #ستايل_أبيض",
    permalink: "https://www.instagram.com/reel/mock1/",
    thumbnail_url: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop&q=60",
    media_url: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop&q=60",
    media_type: "VIDEO",
    created_time: new Date(Date.now() - 3600000 * 2).toISOString(),
    likes_count: 342,
    comments_count: 28,
    shares_count: 14,
    is_promoted: false,
    promotion_count: 0,
    last_campaign_id: null,
    status: "NEW" as const,
    raw_payload: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "mock-content-2",
    account_id: "demo-account-id",
    platform: "instagram" as const,
    content_type: "post" as const,
    meta_post_id: "ig-post-456",
    page_id: "demo-page-id",
    instagram_media_id: "ig-media-post-456",
    caption: "مجموعتنا الجديدة لربيع 2026 صارت متوفرة بالكامل! تفاصيل أنيقة، خامات فاخرة، وتصاميم تواكب الموضة العصرية. كوني متألقة دائماً مع تشكيلة White Style المتميزة. شاركينا رأيك في التعليقات حول التصميم المفضل لديك 👇🤍",
    permalink: "https://www.instagram.com/p/mock2/",
    thumbnail_url: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=500&auto=format&fit=crop&q=60",
    media_url: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=500&auto=format&fit=crop&q=60",
    media_type: "CAROUSEL_ALBUM",
    created_time: new Date(Date.now() - 3600000 * 24).toISOString(),
    likes_count: 1250,
    comments_count: 98,
    shares_count: 45,
    is_promoted: true,
    promotion_count: 1,
    last_campaign_id: "camp-existing-1",
    status: "PROMOTED" as const,
    raw_payload: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "mock-content-3",
    account_id: "demo-account-id",
    platform: "facebook" as const,
    content_type: "post" as const,
    meta_post_id: "fb-post-789",
    page_id: "demo-page-id",
    instagram_media_id: null,
    caption: "يسرنا أن نعلن عن إطلاق عرض خاص لعملائنا في الخليج 🌸 خصم 20% على كامل المنتجات لفترة محدودة. الجودة والسرعة في التوصيل هما عنواننا. اضغط على الزر أدناه للتواصل مباشرة معنا عبر الماسنجر والاستفادة من العرض الحصري اليوم!",
    permalink: "https://www.facebook.com/posts/mock3/",
    thumbnail_url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500&auto=format&fit=crop&q=60",
    media_url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500&auto=format&fit=crop&q=60",
    media_type: "IMAGE",
    created_time: new Date(Date.now() - 3600000 * 48).toISOString(),
    likes_count: 512,
    comments_count: 42,
    shares_count: 32,
    is_promoted: false,
    promotion_count: 0,
    last_campaign_id: null,
    status: "READY" as const,
    raw_payload: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "mock-content-4",
    account_id: "demo-account-id",
    platform: "instagram" as const,
    content_type: "video" as const,
    meta_post_id: "ig-video-999",
    page_id: "demo-page-id",
    instagram_media_id: "ig-media-video-999",
    caption: "خلف الكواليس 🎥 كيف نختار أرقى الأقمشة الإيطالية ونصمم فساتين White Style الفريدة. الدقة في التفاصيل والالتزام بأعلى معايير الجودة هو ما يميزنا. شاهدي الفيديو لتتعرفي على قصتنا كاملة. ✨🧥",
    permalink: "https://www.instagram.com/p/mock4/",
    thumbnail_url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=500&auto=format&fit=crop&q=60",
    media_url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=500&auto=format&fit=crop&q=60",
    media_type: "VIDEO",
    created_time: new Date(Date.now() - 3600000 * 120).toISOString(),
    likes_count: 856,
    comments_count: 36,
    shares_count: 19,
    is_promoted: false,
    promotion_count: 0,
    last_campaign_id: null,
    status: "NEW" as const,
    raw_payload: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      content_library_id,
      target_ad_account_id,
      source_post_url,
      destination_type,
      requested_daily_budget,
      execution_mode,
      placements,
    } = body;

    // Validate parameters depending on flow (content selection vs manual URL paste)
    if (!target_ad_account_id || !destination_type || !placements || (!content_library_id && !source_post_url)) {
      return NextResponse.json({ error: "المعلمات المطلوبة غير متوفرة." }, { status: 400 });
    }

    const mockMode = process.env.CAMPAIGN_CENTER_MOCK_MODE === "true";
    const webhookUrl = process.env.N8N_WS02_REQUEST_WEBHOOK_URL;
    const secret = process.env.N8N_CAMPAIGN_WEBHOOK_SECRET;

    // 1. Mock Mode Simulation
    if (mockMode) {
      const requestId = crypto.randomUUID();
      let sourceUrl = source_post_url || "";
      let sourcePlatform = sourceUrl.includes("instagram") ? "instagram" : "facebook";
      let payload: Record<string, any> = {};

      if (content_library_id) {
        // Query mock content library items or fetch database (if mock mode runs with DB)
        let item = MOCK_CONTENT_ITEMS.find(c => c.id === content_library_id);
        
        if (!item) {
          // If not in in-memory list, attempt to fetch from Supabase
          const supabase = await createClient();
          const { data: dbItem } = await supabase
            .from("content_library")
            .select("*")
            .eq("id", content_library_id)
            .maybeSingle();
          if (dbItem) {
            item = dbItem;
          }
        }

        if (!item) {
          return NextResponse.json({ error: "المحتوى المحدد غير موجود في مكتبة المحتوى." }, { status: 400 });
        }

        sourceUrl = item.permalink || "";
        sourcePlatform = item.platform || "instagram";
        payload = {
          resolver_status: "resolved",
          resolver_method: "content_library",
          content_library_id: item.id,
          source_post_id: item.meta_post_id,
          instagram_media_id: item.instagram_media_id,
          page_id: item.page_id,
          content_context: {
            caption: item.caption,
            media_type: item.media_type,
            thumbnail_url: item.thumbnail_url,
            permalink: item.permalink
          }
        };
      } else {
        payload = {
          resolver_status: "pending",
          resolver_method: "link"
        };
      }

      const mockRequest = {
        id: requestId,
        organization_id: "11111111-1111-4111-8111-111111111111",
        target_ad_account_id,
        target_meta_account_id: "demo-meta-account-id",
        source_platform: sourcePlatform,
        source_post_url: sourceUrl,
        destination_type,
        execution_mode: execution_mode || "dry_run",
        status: "draft",
        requested_daily_budget: requested_daily_budget || null,
        idempotency_key: crypto.randomUUID(),
        request_payload: payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const supabase = await createClient();
      const { error: insErr } = await supabase.from("campaign_creation_requests").insert(mockRequest);
      if (insErr) {
        console.error("Mock insert error:", insErr);
      }

      return NextResponse.json({
        ...mockRequest,
        id: requestId,
        request_id: requestId,
        resolver_status: content_library_id ? "resolved" : "pending",
        next_step: content_library_id ? "strategy" : "resolve",
      });
    }

    // 2. Production webhook call
    if (!webhookUrl || !secret) {
      return NextResponse.json(
        { error: "لم تُضبط إعدادات Intake Webhook (N8N) على الخادم." },
        { status: 503 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": secret,
        },
        body: JSON.stringify({
          content_library_id,
          target_ad_account_id,
          source_post_url,
          destination_type,
          requested_daily_budget,
          execution_mode: execution_mode || "dry_run",
          placements,
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json({ error: "رفض n8n استقبال طلب الحملة." }, { status: 502 });
      }

      let data = await response.json();
      if (Array.isArray(data)) {
        data = data[0] || {};
      }

      const reqId = data.request_id || data.id;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!reqId || !uuidRegex.test(reqId)) {
        return NextResponse.json(
          { error: "لم يتم إرجاع معرف طلب صالح (UUID) من خادم n8n." },
          { status: 502 }
        );
      }

      return NextResponse.json({
        ...data,
        id: reqId,
        request_id: reqId,
        resolver_status: content_library_id ? "resolved" : "pending",
        next_step: content_library_id ? "strategy" : "resolve",
      });
    } catch (err) {
      clearTimeout(timeout);
      const isTimeout = err instanceof Error && err.name === "AbortError";
      return NextResponse.json(
        { error: isTimeout ? "انتهت مهلة استدعاء Intake Webhook في n8n." : "فشل بدء مسار العمل في n8n." },
        { status: 502 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
