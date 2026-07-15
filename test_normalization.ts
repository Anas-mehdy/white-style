import {
  safeParseJson,
  normalizeNumber,
  normalizeStringArray,
  firstNonEmptyStringArray,
  combineStringArrays,
  normalizeTextFromMixedValue,
  extractGeographicLocations,
  resolveSelectedStrategy,
  normalizeTransparency,
} from "./src/lib/campaign-transparency";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function runTests() {
  console.log("Starting normalization unit tests...\n");

  // 1. JSON parsing tests
  console.log("Running JSON parsing tests...");
  assert(safeParseJson(null) === null, "null returns null");
  assert(safeParseJson('{"a": 1}').a === 1, "valid JSON parsed");
  assert(safeParseJson('"{\\"b\\": 2}"').b === 2, "nested JSON string parsed");
  assert(safeParseJson("invalid-json") === "invalid-json", "malformed JSON returns raw string");

  // 2. Numeric normalization tests
  console.log("Running numeric normalization tests...");
  assert(normalizeNumber(0) === 0, "preserves number 0");
  assert(normalizeNumber("0") === 0, "preserves numeric string '0'");
  assert(normalizeNumber("10") === 10, "parses numeric string '10'");
  assert(normalizeNumber("") === null, "empty string returns null");
  assert(normalizeNumber("  ") === null, "whitespace string returns null");
  assert(normalizeNumber("abc") === null, "non-numeric string returns null");
  assert(normalizeNumber(NaN) === null, "NaN returns null");
  assert(normalizeNumber(Infinity) === null, "Infinity returns null");

  // 3. String array normalization tests
  console.log("Running string array normalization tests...");
  assert(
    JSON.stringify(normalizeStringArray(["a", "  ", null, "b", "a"])) === JSON.stringify(["a", "b"]),
    "filters and deduplicates string array"
  );
  assert(
    JSON.stringify(normalizeStringArray('["x", "y"]')) === JSON.stringify(["x", "y"]),
    "parses and normalizes JSON string array"
  );
  assert(
    JSON.stringify(normalizeStringArray("scalar")) === JSON.stringify(["scalar"]),
    "scalar string converted to single item array"
  );

  // 4. String array fallbacks tests (firstNonEmptyStringArray)
  console.log("Running string array fallbacks tests...");
  assert(
    JSON.stringify(firstNonEmptyStringArray([], ["fallback"])) === JSON.stringify(["fallback"]),
    "empty first array triggers fallback"
  );
  assert(
    JSON.stringify(firstNonEmptyStringArray(["primary"], ["fallback"])) === JSON.stringify(["primary"]),
    "populated first array does not trigger fallback"
  );

  // 5. Warnings combination tests
  console.log("Running warnings combination tests...");
  const combinedWarnings = combineStringArrays(
    ["warn1", "warn2"],
    '["warn2", "warn3"]',
    "warn4",
    null,
    ["warn1"]
  );
  assert(
    JSON.stringify(combinedWarnings) === JSON.stringify(["warn1", "warn2", "warn3", "warn4"]),
    "flattens, parses, filters, and deduplicates warning arrays"
  );

  // 6. Rationale/Text mixed value normalizer tests
  console.log("Running rationale/text mixed value tests...");
  assert(normalizeTextFromMixedValue(null) === null, "null value returns null");
  assert(normalizeTextFromMixedValue("  hello  ") === "hello", "trims string");
  assert(
    normalizeTextFromMixedValue(["reason1", null, "reason2"]) === "reason1، reason2",
    "joins arrays with Arabic separator"
  );
  assert(
    normalizeTextFromMixedValue({ text: "extracted text" }) === "extracted text",
    "extracts text from object property 'text'"
  );
  assert(
    normalizeTextFromMixedValue({ notes: "extracted notes" }) === "extracted notes",
    "extracts text from object property 'notes'"
  );
  assert(
    normalizeTextFromMixedValue({ unmatched: "val" }) === null,
    "returns null and never outputs [object Object] for unmatched objects"
  );

  // 7. Geographic extraction tests
  console.log("Running geographic extraction tests...");
  const geoPayload = {
    countries: ["US", { country_code: "PS" }],
    regions: [{ name: "West Bank", key: "wb" }],
    cities: [{ name: "Ramallah" }],
    zips: [],
  };
  const extractedGeo = extractGeographicLocations(geoPayload, ["PS", "IL"]);
  assert(
    JSON.stringify(extractedGeo.countries) === JSON.stringify(["US", "PS"]),
    "extracts countries including nested country_code objects"
  );
  assert(
    JSON.stringify(extractedGeo.locations) === JSON.stringify(["West Bank", "Ramallah"]),
    "extracts locations name/key and keeps them distinct from placements"
  );

  // Placements check (they must not be treated as locations)
  const placementsPayload = ["facebook_feed", "instagram_reels"];
  const extractedPlacementsGeo = extractGeographicLocations(placementsPayload);
  assert(
    extractedPlacementsGeo.locations.length === 0,
    "placements are not treated as locations"
  );

  // 8. Selected strategy deterministic choice tests
  console.log("Running selected strategy deterministic choice tests...");
  const strategiesList = [
    { tier: "conservative", selected: false, status: "proposed" },
    { tier: "balanced", selected: true, status: "selected" },
    { tier: "aggressive", selected: false, status: "proposed" },
  ];
  const resolvedStrat = resolveSelectedStrategy({ selected_strategy: "conservative" }, strategiesList);
  assert(resolvedStrat.tier === "balanced", "picks strategy where selected is true first");

  const resolvedStratByTier = resolveSelectedStrategy(
    { selected_strategy: "conservative" },
    [
      { tier: "conservative", selected: false, status: "proposed" },
      { tier: "aggressive", selected: false, status: "proposed" },
    ]
  );
  assert(resolvedStratByTier.tier === "conservative", "falls back to request.selected_strategy if none is selected");

  // 9. Full normalization tests (dataUsed, compliancePercentage, safety status, etc.)
  console.log("Running full transparency normalization tests...");
  const mockRequest = {
    id: "req-123",
    country_codes: ["PS"],
    requested_daily_budget: 15,
    request_payload: {
      content_analysis: {
        recommended_goal: "MESSAGES",
        product_category: "Clothing",
      },
      historical_analysis: {
        data_quality: "moderate",
        performance_summary: "historical success text",
      },
      audience_plan: {
        age_min: "20",
        age_max: 45,
        gender: "female",
        rationale: ["target rationale 1", "target rationale 2"],
      },
      safety_review: {
        approved: true,
        compliance_score: 95,
        final_strategy: {
          review_summary: "safe to build",
        },
      },
    },
  };

  const mockStrategies = [
    {
      tier: "balanced",
      daily_budget: 10,
      country_codes: ["PS"],
      placements: ["instagram_reels"],
      currency: "USD",
    },
  ];

  const result = normalizeTransparency(mockRequest, mockStrategies);

  // Assertions for correctly mapped transparency fields
  assert(result.contentAnalysis.detectedObjective === "MESSAGES", "contentAnalysis objective mapped");
  assert(result.contentAnalysis.productType === "Clothing", "contentAnalysis productType mapped");
  assert(result.historicalAnalysis.dataUsed === true, "historicalAnalysis dataUsed mapped to true when moderate");
  assert(result.historicalAnalysis.rationale === "historical success text", "historicalAnalysis rationale mapped");
  assert(result.audienceSelection.ageMin === 20, "audienceSelection ageMin converted to number");
  assert(result.audienceSelection.ageMax === 45, "audienceSelection ageMax preserved");
  assert(
    JSON.stringify(result.audienceSelection.placements) === JSON.stringify(["instagram_reels"]),
    "audienceSelection placements mapped"
  );
  assert(result.audienceSelection.rationale === "target rationale 1، target rationale 2", "rationale array joined to string");
  assert(result.budgeting.dailyBudget === 10, "budgeting dailyBudget mapped from selectedStrategy");
  assert(result.budgeting.currency === "USD", "budgeting currency mapped");
  assert(result.safetyCheck.compliancePercentage === 95, "safetyCheck compliancePercentage mapped correctly");
  assert(result.safetyCheck.status === "Approved", "safetyCheck status mapped from approved === true");
  assert(result.safetyCheck.strategy === "safe to build", "safetyCheck strategy mapped");

  // Check dataUsed === false when data_quality is "none"
  const noneRequest = {
    request_payload: {
      historical_analysis: {
        data_quality: "none",
      },
    },
  };
  const resultNone = normalizeTransparency(noneRequest, []);
  assert(resultNone.historicalAnalysis.dataUsed === false, "dataUsed is false when data_quality is 'none'");

  // Check dataUsed === null when data_quality is undefined
  const undefinedRequest = {
    request_payload: {},
  };
  const resultUndefined = normalizeTransparency(undefinedRequest, []);
  assert(resultUndefined.historicalAnalysis.dataUsed === null, "dataUsed is null when data_quality is undefined");

  console.log("\nAll normalization unit tests passed successfully!");
}

try {
  runTests();
} catch (e) {
  console.error("\nUnit Test Failed!");
  console.error(e);
  process.exit(1);
}
