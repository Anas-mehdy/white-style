import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { ContentLibraryItem } from "@/components/campaign-center/types";

export const dynamic = "force-dynamic";

// In-memory mock content items for CAMPAIGN_CENTER_MOCK_MODE
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
    created_time: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
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
    created_time: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
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
    created_time: new Date(Date.now() - 3600000 * 48).toISOString(), // 2 days ago
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
    created_time: new Date(Date.now() - 3600000 * 120).toISOString(), // 5 days ago
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get("platform");
    const contentType = searchParams.get("content_type");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sort_by") || "newest"; // newest, oldest, engagement
    
    const limit = Math.min(Number(searchParams.get("limit") || 12), 100);
    const offset = Number(searchParams.get("offset") || 0);

    const mockMode = process.env.CAMPAIGN_CENTER_MOCK_MODE === "true";

    if (mockMode) {
      // Filter mock items in-memory
      let items = [...MOCK_CONTENT_ITEMS];

      if (platform && platform !== "all") {
        items = items.filter(item => item.platform === platform);
      }

      if (contentType && contentType !== "all") {
        if (contentType === "reel") {
          items = items.filter(item => item.content_type === "reel");
        } else if (contentType === "post") {
          items = items.filter(item => item.content_type === "post");
        } else if (contentType === "video") {
          items = items.filter(item => item.content_type === "video");
        } else if (contentType === "carousel") {
          items = items.filter(item => item.content_type === "carousel");
        }
      }

      if (status && status !== "all") {
        if (status === "promoted") {
          items = items.filter(item => item.is_promoted);
        } else if (status === "unpromoted") {
          items = items.filter(item => !item.is_promoted);
        } else {
          items = items.filter(item => item.status === status);
        }
      }

      if (search) {
        const query = search.toLowerCase();
        items = items.filter(item => item.caption?.toLowerCase().includes(query));
      }

      // Sort
      if (sortBy === "oldest") {
        items.sort((a, b) => new Date(a.created_time || 0).getTime() - new Date(b.created_time || 0).getTime());
      } else if (sortBy === "engagement") {
        items.sort((a, b) => (b.likes_count + b.comments_count + b.shares_count) - (a.likes_count + a.comments_count + a.shares_count));
      } else {
        // newest
        items.sort((a, b) => new Date(b.created_time || 0).getTime() - new Date(a.created_time || 0).getTime());
      }

      const total = items.length;
      const paginatedItems = items.slice(offset, offset + limit);

      return NextResponse.json({
        items: paginatedItems,
        pagination: {
          total,
          limit,
          offset,
        }
      });
    }

    // Production mode - read from Supabase content_library table
    const supabase = await createClient();
    let query = supabase.from("content_library").select("*", { count: "exact" });

    // Apply filters
    if (platform && platform !== "all") {
      query = query.eq("platform", platform);
    }

    if (contentType && contentType !== "all") {
      query = query.eq("content_type", contentType);
    }

    if (status && status !== "all") {
      if (status === "promoted") {
        query = query.eq("is_promoted", true);
      } else if (status === "unpromoted") {
        query = query.eq("is_promoted", false);
      } else {
        query = query.eq("status", status);
      }
    }

    if (search) {
      query = query.ilike("caption", `%${search}%`);
    }

    // Apply Sorting
    if (sortBy === "oldest") {
      query = query.order("created_time", { ascending: true });
    } else if (sortBy === "engagement") {
      // Order by engagement sum using order expression (likes_count + comments_count + shares_count)
      // Since it's raw expression, fallback to sorting in JS if DB expression is unsupported,
      // or we can sort by likes_count descending directly as a close approximation.
      query = query.order("likes_count", { ascending: false });
    } else {
      // newest
      query = query.order("created_time", { ascending: false });
    }

    // Pagination bounds
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      items: data || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
      }
    });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
