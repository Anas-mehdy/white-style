import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { normalizeTransparency } from "@/lib/campaign-transparency";
import { extractTranslatableProse, mergeTranslatedProse } from "@/lib/campaign-translation/merge";
import { calculateSourceHash, lookupTranslationCache, insertTranslationCache } from "@/lib/campaign-translation/cache";
import { callOpenAiTranslation, OPENAI_TRANSLATION_MODEL } from "@/lib/campaign-translation/translate";

// Pin version mapping the model and schema details
export const TRANSLATOR_VERSION = `ar-transparency-v1-${OPENAI_TRANSLATION_MODEL}`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;

    // 1. Validate UUID format per requirement 6
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!requestId || !uuidRegex.test(requestId)) {
      return NextResponse.json({ error: "معرف الطلب غير صالح (UUID format required)" }, { status: 400 });
    }

    const supabase = await createClient();

    // 2. Fetch current record (authenticates/authorizes access through security cookies & RLS)
    const { data: requestData, error: fetchErr } = await supabase
      .from("campaign_creation_requests")
      .select("*, meta_ad_accounts(name, currency), campaign_strategies(id, tier, selected, status, meta_campaign_id, meta_adset_id, meta_creative_id, meta_ad_id)")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!requestData) {
      return NextResponse.json({ error: "الطلب غير موجود أو غير مصرح بالوصول إليه" }, { status: 404 });
    }

    // 3. Query the strategies
    const { data: strategies, error: strategiesError } = await supabase
      .from("campaign_strategies")
      .select("*")
      .eq("request_id", requestId);

    if (strategiesError) {
      return NextResponse.json({ error: strategiesError.message }, { status: 500 });
    }

    // 4. Normalize the English source object
    const englishTransparency = normalizeTransparency(requestData, strategies || []);

    // 5. Calculate stable SHA-256 hash of normalized English transparency object
    const sourceHash = calculateSourceHash(englishTransparency);

    // 6. Check cache first per requirement 6
    const cachedTranslation = await lookupTranslationCache(
      supabase,
      requestId,
      "ar",
      sourceHash,
      TRANSLATOR_VERSION
    );

    if (cachedTranslation) {
      return NextResponse.json({ translated: cachedTranslation });
    }

    // 7. Extract only translatable prose fields
    const englishProse = extractTranslatableProse(englishTransparency);

    // 8. Call OpenAI translation model
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "مفتاح OpenAI API غير مهيأ على الخادم." }, { status: 500 });
    }

    let translatedProse;
    try {
      translatedProse = await callOpenAiTranslation(apiKey, englishProse);
    } catch (err: any) {
      console.error("OpenAI Translation failure:", err);
      return NextResponse.json(
        { error: `فشلت عملية الترجمة: ${err?.message || err}` },
        { status: 502 }
      );
    }

    // 9. Programmatically merge translated prose fields back into original structural object
    const fullyTranslatedPayload = mergeTranslatedProse(englishTransparency, translatedProse);

    // 10. Cache translation with the complete conflict key
    await insertTranslationCache(
      supabase,
      requestId,
      "ar",
      sourceHash,
      TRANSLATOR_VERSION,
      fullyTranslatedPayload
    );

    return NextResponse.json({ translated: fullyTranslatedPayload });
  } catch (err: any) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
