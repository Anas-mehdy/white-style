import { OpenAI } from "openai";
import { translationJsonSchema, TranslatedTransparencyText } from "./schema";

export const OPENAI_TRANSLATION_MODEL = process.env.OPENAI_TRANSLATION_MODEL ?? "gpt-4o-mini-2024-07-18";

/**
 * Calls OpenAI's Responses API to translate englishProse object into Arabic text fields.
 * Incorporates Structured Outputs, store: false, timeout, and output token limits.
 */
export async function callOpenAiTranslation(
  apiKey: string,
  englishProse: TranslatedTransparencyText
): Promise<TranslatedTransparencyText> {
  // Configured with a 15-second timeout per requirement 6
  const openai = new OpenAI({
    apiKey,
    timeout: 15000
  });

  const response = await openai.responses.create({
    model: OPENAI_TRANSLATION_MODEL,
    instructions: `You are a professional Arabic translator specializing in digital marketing, Meta advertising, and campaign optimization.
Translate the provided English prose fields into natural, professional Arabic.
Follow these guidelines:
- Translate all text descriptions to natural, professional Arabic suitable for digital advertising platforms.
- Do NOT perform word-for-word awkward translation; preserve natural Arabic phrasing and professional tone.
- PRESERVE all numbers, ranges (e.g., '$5–$25', '18–45', '90 days'), percentages (e.g., '1.75%'), currencies (e.g., '$3.5', '$0.88'), and identifiers/IDs exactly.
- Preserve tech terms like Meta, WhatsApp, CTR, CTA, CPC when appropriate.
- Do not add any advice or remove warnings.
- Return strict JSON matching the provided schema. Do not output markdown.`,
    input: JSON.stringify(englishProse),
    text: {
      format: {
        type: "json_schema",
        name: "translated_transparency_text",
        strict: true,
        schema: translationJsonSchema
      }
    },
    store: false, // Do not store conversation logs per requirement 1
    max_output_tokens: 1500 // Limit output tokens per requirement 6
  });

  const item = response.output?.[0] as any;
  if (!item) {
    throw new Error("Empty response returned from OpenAI Responses API.");
  }

  if (item.type === "message") {
    // Check for refusal
    const refusalPart = item.content?.find((part: any) => part.type === "refusal");
    if (refusalPart) {
      throw new Error(`OpenAI model refused translation: ${refusalPart.refusal}`);
    }

    // Find the text output
    const textPart = item.content?.find((part: any) => part.type === "output_text");
    if (!textPart || !textPart.text) {
      throw new Error("No text content returned in OpenAI response.");
    }

    const content = textPart.text;
    const parsed = JSON.parse(content);

    // Schema validation checks
    if (
      !parsed.contentAnalysis ||
      !parsed.historicalAnalysis ||
      !parsed.audienceSelection ||
      !parsed.budgeting ||
      !parsed.safetyCheck
    ) {
      throw new Error("Translated JSON failed strict structured outputs schema validation.");
    }

    return parsed as TranslatedTransparencyText;
  } else {
    throw new Error(`Unexpected output item type from OpenAI Responses API: ${item.type}`);
  }
}
