import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { ContentLibraryItem } from "@/components/campaign-center/types";

export const dynamic = "force-dynamic";

const MOCK_CONTENT_ITEMS: ContentLibraryItem[] = [
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params;
    const mockMode = process.env.CAMPAIGN_CENTER_MOCK_MODE === "true";

    if (mockMode) {
      const item = MOCK_CONTENT_ITEMS.find((c) => c.id === contentId);
      if (!item) {
        return NextResponse.json({ error: "المحتوى غير موجود" }, { status: 404 });
      }
      return NextResponse.json(item);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("content_library")
      .select("*")
      .eq("id", contentId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "المحتوى غير موجود" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
