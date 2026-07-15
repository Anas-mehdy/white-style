import crypto from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Recursively serializes any value sorting all object keys to produce
 * a canonical stable JSON string representation.
 */
export function canonicalJsonStringify(obj: any): string {
  if (obj === null || obj === undefined) return "null";
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJsonStringify).join(",") + "]";
  }
  if (typeof obj === "object") {
    const keys = Object.keys(obj).sort();
    const parts = keys.map((key) => {
      return JSON.stringify(key) + ":" + canonicalJsonStringify(obj[key]);
    });
    return "{" + parts.join(",") + "}";
  }
  return JSON.stringify(obj);
}

/**
 * Calculates a SHA-256 hash from a stable canonical JSON serialization.
 */
export function calculateSourceHash(obj: any): string {
  const serialized = canonicalJsonStringify(obj);
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

export async function lookupTranslationCache(
  supabase: SupabaseClient,
  requestId: string,
  language: string,
  sourceHash: string,
  translatorVersion: string
): Promise<any | null> {
  const { data, error } = await supabase
    .from("campaign_translations")
    .select("translated_payload")
    .eq("request_id", requestId)
    .eq("language", language)
    .eq("source_hash", sourceHash)
    .eq("translator_version", translatorVersion)
    .maybeSingle();

  if (error) {
    console.error("Failed to lookup translation cache:", error);
    return null;
  }
  return data?.translated_payload ?? null;
}

export async function insertTranslationCache(
  supabase: SupabaseClient,
  requestId: string,
  language: string,
  sourceHash: string,
  translatorVersion: string,
  translatedPayload: any
): Promise<void> {
  const { error } = await supabase
    .from("campaign_translations")
    .upsert(
      {
        request_id: requestId,
        language: language,
        source_hash: sourceHash,
        translator_version: translatorVersion,
        translated_payload: translatedPayload,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "request_id,language,source_hash,translator_version"
      }
    );

  if (error) {
    console.error("Failed to insert translation cache:", error);
  }
}
