/* eslint-disable @typescript-eslint/no-explicit-any */
import { CampaignCreationRequest, CampaignStrategy, AITransparency } from "@/components/campaign-center/types";

/**
 * Safely parses JSON values, supporting nested serialization, strings, arrays, and objects.
 */
export function safeParseJson(val: any): any {
  if (val === null || val === undefined) {
    return null;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "") return null;
    try {
      const parsed = JSON.parse(trimmed);
      return safeParseJson(parsed); // Handle double-serialized JSON
    } catch {
      return val;
    }
  }
  return val;
}

/**
 * Normalizes a value to a non-empty trimmed string or null.
 */
export function normalizeString(val: any): string | null {
  if (val === null || val === undefined) {
    return null;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed !== "" ? trimmed : null;
  }
  if (typeof val === "number" || typeof val === "boolean") {
    return String(val);
  }
  return null;
}

/**
 * Normalizes a number, supporting numeric strings, preserving 0, and rejecting NaN/Infinity.
 */
export function normalizeNumber(val: any): number | null {
  if (val === null || val === undefined || val === "") {
    return null;
  }
  if (typeof val === "number") {
    return !isNaN(val) && isFinite(val) ? val : null;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed);
    return !isNaN(parsed) && isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Converts value to clean string array (trims, removes nulls, and deduplicates).
 */
export function normalizeStringArray(val: any): string[] {
  const parsed = safeParseJson(val);
  if (parsed === null || parsed === undefined) {
    return [];
  }
  if (Array.isArray(parsed)) {
    const items = parsed
      .map((item) => normalizeString(item))
      .filter((item): item is string => item !== null);
    return Array.from(new Set(items));
  }
  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    if (trimmed === "") return [];
    // If it's a comma-separated string, split it
    if (trimmed.includes(",")) {
      return Array.from(
        new Set(
          trimmed
            .split(",")
            .map((item) => normalizeString(item))
            .filter((item): item is string => item !== null)
        )
      );
    }
    return [trimmed];
  }
  return [];
}

/**
 * Selects the first genuinely non-empty normalized string array.
 */
export function firstNonEmptyStringArray(...candidates: any[]): string[] {
  for (const candidate of candidates) {
    const normalized = normalizeStringArray(candidate);
    if (normalized.length > 0) {
      return normalized;
    }
  }
  return [];
}

/**
 * Combines, flattens, trims, and deduplicates all warning/checks string arrays.
 */
export function combineStringArrays(...candidates: any[]): string[] {
  const combined: string[] = [];
  for (const candidate of candidates) {
    const normalized = normalizeStringArray(candidate);
    combined.push(...normalized);
  }
  return Array.from(new Set(combined));
}

/**
 * Extracts a readable trimmed string from mixed objects, arrays, or text fields.
 */
export function normalizeTextFromMixedValue(value: any): string | null {
  const parsed = safeParseJson(value);
  if (parsed === null || parsed === undefined) {
    return null;
  }
  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    return trimmed !== "" ? trimmed : null;
  }
  if (typeof parsed === "number" || typeof parsed === "boolean") {
    return String(parsed);
  }
  if (Array.isArray(parsed)) {
    const items = parsed
      .map((item) => normalizeTextFromMixedValue(item))
      .filter((item): item is string => item !== null);
    return items.length > 0 ? items.join("، ") : null;
  }
  if (typeof parsed === "object") {
    // Check common text fields in AI outputs
    const textKeys = [
      "text",
      "summary",
      "message",
      "reasons",
      "notes",
      "caption",
      "recommendation",
      "review_summary",
      "rationale"
    ];
    for (const key of textKeys) {
      if (key in parsed) {
        const extracted = normalizeTextFromMixedValue(parsed[key]);
        if (extracted !== null) {
          return extracted;
        }
      }
    }
  }
  return null;
}

/**
 * Dedicated geographic extractor for Meta ad structures.
 * Segregates country codes from region/city/location names.
 */
export function extractGeographicLocations(
  geoLocations: any,
  fallbackCountryCodes?: any
): { countries: string[]; locations: string[] } {
  const countriesSet = new Set<string>();
  const locationsSet = new Set<string>();

  const parsed = safeParseJson(geoLocations);

  const knownPlacements = new Set([
    "facebook_feed",
    "facebook_reels",
    "facebook_stories",
    "instagram_feed",
    "instagram_reels",
    "instagram_stories",
    "advantage_plus",
    "advantage_plus_placements",
    "advantage_plus_audience",
    "audience_network",
    "messenger"
  ]);

  const processItem = (item: any) => {
    if (item === null || item === undefined) return;
    if (typeof item === "string") {
      const val = item.trim();
      const valLower = val.toLowerCase();
      if (val.length === 2 && /^[A-Z]{2}$/i.test(val)) {
        countriesSet.add(val.toUpperCase());
      } else if (
        val !== "" &&
        !knownPlacements.has(valLower) &&
        !valLower.startsWith("facebook_") &&
        !valLower.startsWith("instagram_")
      ) {
        locationsSet.add(val);
      }
    } else if (typeof item === "object") {
      if (typeof item.country_code === "string") {
        const cc = item.country_code.trim();
        if (cc !== "") countriesSet.add(cc.toUpperCase());
      }
      if (typeof item.name === "string" && item.name.trim() !== "") {
        const nameVal = item.name.trim();
        const nameLower = nameVal.toLowerCase();
        if (
          !knownPlacements.has(nameLower) &&
          !nameLower.startsWith("facebook_") &&
          !nameLower.startsWith("instagram_")
        ) {
          locationsSet.add(nameVal);
        }
      } else if (typeof item.key === "string" && item.key.trim() !== "") {
        const keyVal = item.key.trim();
        const keyLower = keyVal.toLowerCase();
        if (
          !knownPlacements.has(keyLower) &&
          !keyLower.startsWith("facebook_") &&
          !keyLower.startsWith("instagram_")
        ) {
          locationsSet.add(keyVal);
        }
      }
    }
  };

  if (Array.isArray(parsed)) {
    parsed.forEach(processItem);
  } else if (parsed && typeof parsed === "object") {
    // If it's the standard Meta geo_locations object structure
    const keys = ["countries", "regions", "cities", "zips", "location_names"];
    keys.forEach((key) => {
      if (key in parsed) {
        const subVal = safeParseJson(parsed[key]);
        if (Array.isArray(subVal)) {
          subVal.forEach(processItem);
        } else {
          processItem(subVal);
        }
      }
    });
  } else {
    processItem(parsed);
  }

  // Apply fallback country codes if no countries found
  if (countriesSet.size === 0 && fallbackCountryCodes) {
    normalizeStringArray(fallbackCountryCodes).forEach((cc) => {
      if (cc.length === 2) {
        countriesSet.add(cc.toUpperCase());
      }
    });
  }

  return {
    countries: Array.from(countriesSet),
    locations: Array.from(locationsSet),
  };
}

/**
 * Resolves the selected strategy deterministically from the list of strategies.
 */
export function resolveSelectedStrategy(request: any, strategies: any[]): any | null {
  const req = request || {};
  const strats = strategies || [];

  // 1. Try to find the strategy where selected === true
  let selected = strats.find((s) => s.selected === true || s.status === "selected");
  if (selected) return selected;

  // 2. Try to find by request's selected_strategy tier
  if (req.selected_strategy) {
    selected = strats.find((s) => s.tier === req.selected_strategy);
    if (selected) return selected;
  }

  // 3. Try to find by recommended_tier
  const recommendedTier =
    req.recommended_tier ??
    req.request_payload?.selected_strategy_tier ??
    req.request_payload?.safety_review?.recommended_tier ??
    req.request_payload?.campaign_strategy?.recommended_tier;

  if (recommendedTier) {
    selected = strats.find((s) => s.tier === recommendedTier);
    if (selected) return selected;
  }

  // 4. Default to 'balanced' or first strategy
  selected = strats.find((s) => s.tier === "balanced");
  if (selected) return selected;

  return strats[0] || null;
}

/**
 * Maps raw database response fields to a normalized AITransparency object.
 */
export function normalizeTransparency(request: any, strategies: any[]): AITransparency {
  const req = request || {};
  const strats = strategies || [];
  const selectedStrategy = resolveSelectedStrategy(req, strats) || {};

  const payload = safeParseJson(req.request_payload) || {};
  const content_analysis = safeParseJson(payload.content_analysis) || {};
  const historical_analysis = safeParseJson(payload.historical_analysis) || {};
  const audience_plan = safeParseJson(payload.audience_plan) || {};
  const budget_plan = safeParseJson(payload.budget_plan) || {};
  const safety_review = safeParseJson(payload.safety_review) || {};
  const campaign_strategy = safeParseJson(payload.campaign_strategy) || {};

  // 1. Content Analysis
  const contentSummary = normalizeTextFromMixedValue(
    campaign_strategy.content_analysis_summary ??
    content_analysis.content_summary ??
    payload.content_context?.caption
  );
  const detectedObjective = normalizeString(
    content_analysis.recommended_goal ??
    content_analysis.detected_goal ??
    campaign_strategy.objective ??
    selectedStrategy.objective
  );
  const productType = normalizeString(
    content_analysis.product_category ??
    content_analysis.content_type
  );

  // 2. Historical Analysis
  const historicalRationale = normalizeTextFromMixedValue(
    historical_analysis.performance_summary ??
    campaign_strategy.historical_analysis_summary ??
    historical_analysis.recommendation
  );
  const bestPattern = normalizeTextFromMixedValue(
    historical_analysis.budget_implication ??
    historical_analysis.top_performing_placement
  );

  // Strict boolean or null for dataUsed
  let dataUsed: boolean | null = null;
  const dataQuality = normalizeString(historical_analysis.data_quality);
  if (dataQuality !== null) {
    if (dataQuality.toLowerCase() === "none") {
      dataUsed = false;
    } else {
      dataUsed = true;
    }
  } else if (
    historical_analysis.baseline_cost_per_conversation !== undefined ||
    historical_analysis.baseline_ctr !== undefined
  ) {
    dataUsed = true;
  }

  // 3. Audience Selection
  const fallbackCountryCodes = firstNonEmptyStringArray(
    selectedStrategy.country_codes,
    req.country_codes
  );
  const geoObj = extractGeographicLocations(
    audience_plan.geo_locations ??
    audience_plan.locations ??
    audience_plan.location_names ??
    selectedStrategy.geo_locations ??
    selectedStrategy.locations,
    fallbackCountryCodes
  );

  const countries = normalizeStringArray(
    firstNonEmptyStringArray(
      geoObj.countries,
      audience_plan.country_codes,
      selectedStrategy.country_codes
    )
  );
  const locations = normalizeStringArray(geoObj.locations);

  const placements = normalizeStringArray(
    firstNonEmptyStringArray(
      audience_plan.placements,
      selectedStrategy.placements
    )
  );

  const ageMin = normalizeNumber(audience_plan.age_min ?? selectedStrategy.age_min);
  const ageMax = normalizeNumber(audience_plan.age_max ?? selectedStrategy.age_max);
  const genders = normalizeStringArray(
    firstNonEmptyStringArray(
      audience_plan.gender,
      selectedStrategy.gender
    )
  );
  const audienceRationale = normalizeTextFromMixedValue(
    audience_plan.rationale ??
    audience_plan.target_demographics ??
    selectedStrategy.reasons
  );

  // 4. Budgeting
  const dailyBudget = normalizeNumber(
    budget_plan.recommended_daily_budget ??
    budget_plan.balanced_budget ??
    selectedStrategy.daily_budget ??
    req.requested_daily_budget
  );
  const currency = normalizeString(
    budget_plan.currency ??
    selectedStrategy.currency ??
    req.currency ??
    req.meta_ad_accounts?.currency
  );
  const budgetRationale = normalizeTextFromMixedValue(
    budget_plan.budget_basis ??
    budget_plan.guardrail_notes ??
    budget_plan.estimated_conversion_range
  );

  // 5. Safety Check
  const safetyStrategy = normalizeTextFromMixedValue(
    safety_review.final_strategy?.review_summary ??
    safety_review.notes
  );

  let safetyStatus: string | null = null;
  if (safety_review.status !== undefined && safety_review.status !== null) {
    safetyStatus = normalizeString(safety_review.status);
  } else if (safety_review.approved === true) {
    safetyStatus = "Approved";
  } else if (safety_review.approved === false) {
    safetyStatus = "Pending Review";
  }

  const compliancePercentage = normalizeNumber(
    safety_review.compliance_score ??
    safety_review.compliance_percentage
  );

  const safetyWarnings = combineStringArrays(
    safety_review.warnings,
    safety_review.violations,
    safety_review.required_human_checks,
    selectedStrategy.warnings,
    selectedStrategy.safety_warnings
  );

  return {
    contentAnalysis: {
      summary: contentSummary,
      detectedObjective: detectedObjective,
      productType: productType,
    },
    historicalAnalysis: {
      rationale: historicalRationale,
      bestPattern: bestPattern,
      dataUsed: dataUsed,
    },
    audienceSelection: {
      countries,
      locations,
      placements,
      ageMin,
      ageMax,
      genders,
      rationale: audienceRationale,
    },
    budgeting: {
      dailyBudget,
      currency: currency !== null ? currency : null,
      rationale: budgetRationale,
    },
    safetyCheck: {
      strategy: safetyStrategy,
      status: safetyStatus,
      compliancePercentage,
      warnings: safetyWarnings,
    },
  };
}
