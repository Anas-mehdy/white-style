export interface TranslatedTransparencyText {
  contentAnalysis: {
    summary: string | null;
    detectedObjective: string | null;
    productType: string | null;
  };
  historicalAnalysis: {
    rationale: string | null;
    bestPattern: string | null;
  };
  audienceSelection: {
    rationale: string | null;
  };
  budgeting: {
    rationale: string | null;
  };
  safetyCheck: {
    strategy: string | null;
    status: string | null;
    warnings: string[];
  };
}

export const translationJsonSchema = {
  type: "object",
  properties: {
    contentAnalysis: {
      type: "object",
      properties: {
        summary: { type: ["string", "null"] },
        detectedObjective: { type: ["string", "null"] },
        productType: { type: ["string", "null"] }
      },
      required: ["summary", "detectedObjective", "productType"],
      additionalProperties: false
    },
    historicalAnalysis: {
      type: "object",
      properties: {
        rationale: { type: ["string", "null"] },
        bestPattern: { type: ["string", "null"] }
      },
      required: ["rationale", "bestPattern"],
      additionalProperties: false
    },
    audienceSelection: {
      type: "object",
      properties: {
        rationale: { type: ["string", "null"] }
      },
      required: ["rationale"],
      additionalProperties: false
    },
    budgeting: {
      type: "object",
      properties: {
        rationale: { type: ["string", "null"] }
      },
      required: ["rationale"],
      additionalProperties: false
    },
    safetyCheck: {
      type: "object",
      properties: {
        strategy: { type: ["string", "null"] },
        status: { type: ["string", "null"] },
        warnings: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["strategy", "status", "warnings"],
      additionalProperties: false
    }
  },
  required: [
    "contentAnalysis",
    "historicalAnalysis",
    "audienceSelection",
    "budgeting",
    "safetyCheck"
  ],
  additionalProperties: false
};
