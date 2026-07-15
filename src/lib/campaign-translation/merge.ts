import { AITransparency } from "@/components/campaign-center/types";
import { TranslatedTransparencyText } from "./schema";

/**
 * Programmatically merges the translated Arabic prose fields into the original
 * normalized transparency object, keeping numeric/boolean/array structure untouched.
 */
export function mergeTranslatedProse(
  original: AITransparency,
  translatedText: TranslatedTransparencyText
): AITransparency {
  return {
    contentAnalysis: {
      summary: translatedText.contentAnalysis.summary,
      detectedObjective: translatedText.contentAnalysis.detectedObjective,
      productType: translatedText.contentAnalysis.productType
    },
    historicalAnalysis: {
      rationale: translatedText.historicalAnalysis.rationale,
      bestPattern: translatedText.historicalAnalysis.bestPattern,
      dataUsed: original.historicalAnalysis.dataUsed // Preserved unchanged
    },
    audienceSelection: {
      countries: [...original.audienceSelection.countries], // Preserved unchanged
      locations: [...original.audienceSelection.locations], // Preserved unchanged
      placements: [...original.audienceSelection.placements], // Preserved unchanged
      ageMin: original.audienceSelection.ageMin, // Preserved unchanged
      ageMax: original.audienceSelection.ageMax, // Preserved unchanged
      genders: [...original.audienceSelection.genders], // Preserved unchanged
      rationale: translatedText.audienceSelection.rationale
    },
    budgeting: {
      dailyBudget: original.budgeting.dailyBudget, // Preserved unchanged
      currency: original.budgeting.currency, // Preserved unchanged
      rationale: translatedText.budgeting.rationale
    },
    safetyCheck: {
      strategy: translatedText.safetyCheck.strategy,
      status: translatedText.safetyCheck.status,
      compliancePercentage: original.safetyCheck.compliancePercentage, // Preserved unchanged
      warnings: Array.isArray(translatedText.safetyCheck.warnings)
        ? [...translatedText.safetyCheck.warnings]
        : [...original.safetyCheck.warnings]
    }
  };
}

/**
 * Extracts ONLY the translatable prose fields from the normalized AITransparency object
 * to be sent to OpenAI.
 */
export function extractTranslatableProse(original: AITransparency): TranslatedTransparencyText {
  return {
    contentAnalysis: {
      summary: original.contentAnalysis.summary,
      detectedObjective: original.contentAnalysis.detectedObjective,
      productType: original.contentAnalysis.productType
    },
    historicalAnalysis: {
      rationale: original.historicalAnalysis.rationale,
      bestPattern: original.historicalAnalysis.bestPattern
    },
    audienceSelection: {
      rationale: original.audienceSelection.rationale
    },
    budgeting: {
      rationale: original.budgeting.rationale
    },
    safetyCheck: {
      strategy: original.safetyCheck.strategy,
      status: original.safetyCheck.status,
      warnings: [...original.safetyCheck.warnings]
    }
  };
}
