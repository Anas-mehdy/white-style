import {
  translateObjective,
  translateGender,
  translatePlacement,
  translateCountry,
  translateStatus,
  translateCategory,
  formatFallbackValue
} from "./src/lib/campaign-translation/dictionaries";
import {
  extractTranslatableProse,
  mergeTranslatedProse
} from "./src/lib/campaign-translation/merge";
import {
  canonicalJsonStringify,
  calculateSourceHash
} from "./src/lib/campaign-translation/cache";
import { AITransparency } from "./src/components/campaign-center/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log("Starting translation unit tests...");

  // 1. Test local dictionaries
  console.log("Running local dictionary tests...");
  assert(translateGender("female") === "إناث", "gender translation failed");
  assert(translateGender("male") === "ذكور", "gender translation failed");
  assert(translateGender("all") === "الكل", "gender translation failed");
  assert(translateGender("unknown") === "unknown", "gender fallback failed");
  assert(translateGender(null) === "غير متوفر", "gender null failed");

  assert(translateCountry("PS") === "فلسطين", "country PS failed");
  assert(translateCountry("IL") === "إسرائيل", "country IL failed"); // Technically accurate and geographically correct per requirement 8

  assert(translatePlacement("instagram_reels") === "ريلز إنستغرام", "placement reels failed");
  assert(translatePlacement("facebook_feed") === "آخر أخبار فيسبوك", "placement feed failed");
  assert(translatePlacement("advantage_plus") === "Advantage+ مواضع تلقائية", "placement advantage+ failed");

  assert(translateObjective("messages") === "الرسائل والمحادثات", "objective messages failed");
  assert(translateObjective("outcomes") === "النتائج والمبيعات", "objective outcomes failed");

  assert(translateStatus("approved") === "معتمد", "status approved failed");
  assert(translateStatus("pending_review") === "بانتظار المراجعة", "status pending_review failed");

  assert(translateCategory("fashion_and_apparel") === "الأزياء والملابس", "category fashion failed");

  assert(formatFallbackValue({ key: "val" }) === '{"key":"val"}', "fallback object format failed");
  assert(formatFallbackValue(null) === "غير متوفر", "fallback null failed");

  // 2. Test stable canonical hashing
  console.log("Running stable canonical hashing tests...");
  const obj1 = { b: 2, a: 1, c: [1, 2, { z: 9, y: 8 }] };
  const obj2 = { a: 1, c: [1, 2, { y: 8, z: 9 }], b: 2 };
  
  const str1 = canonicalJsonStringify(obj1);
  const str2 = canonicalJsonStringify(obj2);
  
  assert(str1 === str2, "canonical serialization is not stable across keys insertion order");
  assert(calculateSourceHash(obj1) === calculateSourceHash(obj2), "SHA-256 hash is not stable");

  // 3. Test prose extraction & merge values preservation
  console.log("Running merge and value preservation tests...");
  const originalTransparency: AITransparency = {
    contentAnalysis: {
      summary: "This is a summary about fashion dresses for females.",
      detectedObjective: "MESSAGES",
      productType: "fashion_and_apparel"
    },
    historicalAnalysis: {
      rationale: "Past campaigns showed 1.75% CTR for females aged 18–45 with daily spend of $3.5.",
      bestPattern: "Instagram Reels with cost $0.88 per chat",
      dataUsed: true
    },
    audienceSelection: {
      countries: ["PS", "IL"],
      locations: ["Ramallah", "Jerusalem"],
      placements: ["instagram_reels", "facebook_feed"],
      ageMin: 18,
      ageMax: 45,
      genders: ["female"],
      rationale: "Optimized for age 18-45 in PS and IL with placements in instagram_reels."
    },
    budgeting: {
      dailyBudget: 10,
      currency: "USD",
      rationale: "Recommended budget is $10 USD daily (range $5–$25)."
    },
    safetyCheck: {
      strategy: "Review status is approved with 95% compliance score.",
      status: "approved",
      compliancePercentage: 95,
      warnings: ["High cost warning", "Advantage+ audience recommendation warning"]
    }
  };

  const englishProse = extractTranslatableProse(originalTransparency);

  // Validate translatable prose content
  assert(englishProse.contentAnalysis.summary === originalTransparency.contentAnalysis.summary, "extract prose failed");
  assert(englishProse.historicalAnalysis.bestPattern === originalTransparency.historicalAnalysis.bestPattern, "extract prose failed");
  assert(englishProse.safetyCheck.status === originalTransparency.safetyCheck.status, "extract prose failed");

  // Mock OpenAI translation response preserving numbers, currencies, percentages, and IDs per requirement 7
  const mockTranslatedProse = {
    contentAnalysis: {
      summary: "هذا ملخص حول فساتين الموضة للإناث.",
      detectedObjective: "الرسائل والمحادثات",
      productType: "الأزياء والملابس"
    },
    historicalAnalysis: {
      rationale: "أظهرت الحملات السابقة نسبة CTR بلغت 1.75% للإناث من عمر 18–45 بإنفاق يومي قدره $3.5.",
      bestPattern: "ريلز إنستغرام بتكلفة $0.88 لكل محادثة"
    },
    audienceSelection: {
      rationale: "تم التحسين للفئة العمرية 18-45 في PS و IL مع وضع الإعلانات في ريلز إنستغرام."
    },
    budgeting: {
      rationale: "الميزانية اليومية الموصى بها هي $10 USD (نطاق $5–$25)."
    },
    safetyCheck: {
      strategy: "حالة المراجعة معتمدة بنسبة امتثال بلغت 95%.",
      status: "معتمد",
      warnings: ["تحذير التكلفة العالية", "تحذير توصية جمهور Advantage+"]
    }
  };

  // Merge back
  const merged = mergeTranslatedProse(originalTransparency, mockTranslatedProse);

  // Assertions verifying that all numbers, codes, budgets, ages, placements, and flags are copied directly from original
  assert(merged.budgeting.dailyBudget === 10, "dailyBudget was not preserved");
  assert(merged.audienceSelection.ageMin === 18, "ageMin was not preserved");
  assert(merged.audienceSelection.ageMax === 45, "ageMax was not preserved");
  assert(merged.safetyCheck.compliancePercentage === 95, "compliancePercentage was not preserved");
  assert(merged.historicalAnalysis.dataUsed === true, "dataUsed was not preserved");
  assert(merged.audienceSelection.countries[0] === "PS", "country code was not preserved");
  assert(merged.audienceSelection.locations[0] === "Ramallah", "location name was not preserved");
  assert(merged.audienceSelection.placements[0] === "instagram_reels", "placement surface was not preserved");
  
  // Assertions verifying that prose fields are correctly replaced by translated Arabic
  assert(merged.contentAnalysis.summary === "هذا ملخص حول فساتين الموضة للإناث.", "summary translation merge failed");
  assert(merged.historicalAnalysis.rationale?.includes("1.75%") === true, "numbers/ranges should be preserved correctly");
  assert(merged.historicalAnalysis.rationale?.includes("$3.5") === true, "currencies should be preserved correctly");
  assert(merged.historicalAnalysis.rationale?.includes("18–45") === true, "ranges should be preserved correctly");
  assert(merged.historicalAnalysis.bestPattern?.includes("$0.88") === true, "decimal currency should be preserved correctly");
  assert(merged.budgeting.rationale?.includes("$5–$25") === true, "budget range should be preserved correctly");
  assert(merged.safetyCheck.warnings[0] === "تحذير التكلفة العالية", "warning list translation merge failed");

  // 4. Test Mock Server-Side Translation Call and Error Handlers
  console.log("Running mock OpenAI translation call tests...");
  
  // Mock Responses API output structure
  const fakeResponseRefusal = {
    output: [
      {
        type: "message",
        message: {
          refusal: "I cannot translate this content because it violates policy."
        }
      }
    ]
  };

  const fakeResponseInvalidSchema = {
    output: [
      {
        type: "message",
        message: {
          content: '{"badKey": "val"}'
        }
      }
    ]
  };

  const fakeResponseValid = {
    output: [
      {
        type: "message",
        message: {
          content: JSON.stringify(mockTranslatedProse)
        }
      }
    ]
  };

  // Test structured parsing and validations
  function simulateOpenAiResponseParsing(fakeResponse: any) {
    const item = fakeResponse.output?.[0];
    if (!item) throw new Error("Empty response returned from OpenAI Responses API.");
    if (item.type === "message" && item.message?.refusal) {
      throw new Error(`OpenAI model refused translation: ${item.message.refusal}`);
    }
    const content = item.message?.content;
    if (!content) throw new Error("No text content returned in OpenAI response.");
    const parsed = JSON.parse(content);
    if (
      !parsed.contentAnalysis ||
      !parsed.historicalAnalysis ||
      !parsed.audienceSelection ||
      !parsed.budgeting ||
      !parsed.safetyCheck
    ) {
      throw new Error("Translated JSON failed strict structured outputs schema validation.");
    }
    return parsed;
  }

  // Verify refusal throws
  try {
    simulateOpenAiResponseParsing(fakeResponseRefusal);
    assert(false, "refusal did not throw");
  } catch (err: any) {
    assert(err.message.includes("OpenAI model refused translation"), "refusal error message mismatch");
  }

  // Verify invalid schema throws
  try {
    simulateOpenAiResponseParsing(fakeResponseInvalidSchema);
    assert(false, "invalid schema did not throw");
  } catch (err: any) {
    assert(err.message.includes("Translated JSON failed strict structured outputs schema validation"), "schema validation error mismatch");
  }

  // Verify valid parsing
  const parsedResponse = simulateOpenAiResponseParsing(fakeResponseValid);
  assert(parsedResponse.contentAnalysis.summary === "هذا ملخص حول فساتين الموضة للإناث.", "valid response parsing failed");

  // 5. Test Cache lookup & invalidation simulator
  console.log("Running cache simulator tests...");
  const mockDbCache = new Map<string, any>();
  
  function getCacheKey(reqId: string, lang: string, hash: string, version: string): string {
    return `${reqId}:${lang}:${hash}:${version}`;
  }

  function simulateCacheLookup(reqId: string, lang: string, hash: string, version: string) {
    const key = getCacheKey(reqId, lang, hash, version);
    return mockDbCache.get(key) || null;
  }

  function simulateCacheInsert(reqId: string, lang: string, hash: string, version: string, payload: any) {
    const key = getCacheKey(reqId, lang, hash, version);
    mockDbCache.set(key, payload);
  }

  const reqId = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
  const lang = "ar";
  const version = "ar-transparency-v1-gpt4omini";

  // Simulate first miss
  const hash1 = calculateSourceHash(originalTransparency);
  let cacheHit = simulateCacheLookup(reqId, lang, hash1, version);
  assert(cacheHit === null, "cache hit on empty cache");

  // Simulate save & hit
  simulateCacheInsert(reqId, lang, hash1, version, mockTranslatedProse);
  cacheHit = simulateCacheLookup(reqId, lang, hash1, version);
  assert(cacheHit !== null && cacheHit.contentAnalysis.summary === "هذا ملخص حول فساتين الموضة للإناث.", "cache hit retrieval failed");

  // Simulate source hash invalidation (English source changed)
  const changedTransparency = { ...originalTransparency, budgeting: { ...originalTransparency.budgeting, dailyBudget: 25 } };
  const hash2 = calculateSourceHash(changedTransparency);
  cacheHit = simulateCacheLookup(reqId, lang, hash2, version);
  assert(cacheHit === null, "cache was not invalidated on source change");

  // Simulate translator version invalidation (Model/prompt/rules changed)
  const newVersion = "ar-transparency-v2-gpt4o";
  cacheHit = simulateCacheLookup(reqId, lang, hash1, newVersion);
  assert(cacheHit === null, "cache was not invalidated on translator version change");

  // Simulate simultaneous cache misses safe upsert (multiple writers write the same conflict key)
  simulateCacheInsert(reqId, lang, hash1, version, mockTranslatedProse);
  simulateCacheInsert(reqId, lang, hash1, version, mockTranslatedProse); // Safe overwrite
  cacheHit = simulateCacheLookup(reqId, lang, hash1, version);
  assert(cacheHit.contentAnalysis.summary === "هذا ملخص حول فساتين الموضة للإناث.", "cache overwrite failed");

  console.log("All translation unit tests passed successfully!");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
