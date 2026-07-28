const { OpenAI } = require("openai");

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.log("No OPENAI_API_KEY in environment variables.");
  process.exit(0);
}

const client = new OpenAI({ apiKey });

// Copied schema
const translationJsonSchema = {
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

async function run() {
  try {
    console.log("Calling OpenAI Responses API...");
    const response = await client.responses.create({
      model: "gpt-4o-mini-2024-07-18",
      instructions: "Translate to Arabic.",
      input: JSON.stringify({
        contentAnalysis: { summary: "Test summary", detectedObjective: "MESSAGES", productType: "fashion" },
        historicalAnalysis: { rationale: "Test rationale", bestPattern: "Test pattern" },
        audienceSelection: { rationale: "Test rationale" },
        budgeting: { rationale: "Test rationale" },
        safetyCheck: { strategy: "Test strategy", status: "Approved", warnings: ["Test warning"] }
      }),
      text: {
        format: {
          type: "json_schema",
          name: "translated_transparency_text",
          strict: true,
          schema: translationJsonSchema
        }
      },
      store: false,
      max_output_tokens: 1500
    });

    console.log("Success!");
    console.log("Output text:", JSON.stringify(response.output?.[0], null, 2));
  } catch (e) {
    console.error("OpenAI direct call failed:", e);
  }
}

run();
