const { createClient } = require("@supabase/supabase-js");

const url = "https://wsmbaueobuzilyagtnuq.supabase.co";
const key = "sb_publishable_XLz4oopfKnPOK_qvaxJrCA_rotDO87-";

const supabase = createClient(url, key);

const requestId = "89de3941-1f51-4fba-b85e-9495abc8765c";

async function run() {
  try {
    console.log("1. Testing select query on missing table...");
    try {
      const { data, error } = await supabase
        .from("campaign_translations")
        .select("translated_payload")
        .eq("request_id", requestId)
        .eq("language", "ar")
        .eq("source_hash", "some-hash")
        .eq("translator_version", "some-version")
        .maybeSingle();

      console.log("Select succeeded without throwing.");
      console.log("Returned Error object:", error ? error.message : "None");
    } catch (e) {
      console.log("Select THREW an exception!", e);
    }

    console.log("\n2. Testing upsert query on missing table...");
    try {
      const { error } = await supabase
        .from("campaign_translations")
        .upsert(
          {
            request_id: requestId,
            language: "ar",
            source_hash: "some-hash",
            translator_version: "some-version",
            translated_payload: {},
            updated_at: new Date().toISOString()
          },
          {
            onConflict: "request_id,language,source_hash,translator_version"
          }
        );

      console.log("Upsert succeeded without throwing.");
      console.log("Returned Error object:", error ? error.message : "None");
    } catch (e) {
      console.log("Upsert THREW an exception!", e);
    }

  } catch (e) {
    console.error("Outer catch:", e);
  }
}

run();
