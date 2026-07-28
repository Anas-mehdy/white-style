const { createClient } = require("@supabase/supabase-js");

const url = "https://wsmbaueobuzilyagtnuq.supabase.co";
const key = "sb_publishable_XLz4oopfKnPOK_qvaxJrCA_rotDO87-";

const supabase = createClient(url, key);

async function run() {
  try {
    console.log("1. Signing in anonymously to Supabase...");
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

    if (authError) {
      console.error("Auth error:", authError);
      return;
    }

    const token = authData.session?.access_token;
    console.log("Successfully signed in. Token obtained:", token ? "Yes (length: " + token.length + ")" : "No");

    if (!token) return;

    const urlEndpoint = "https://white-style.vercel.app/api/campaigns/89de3941-1f51-4fba-b85e-9495abc8765c/translate";
    console.log("2. Hitting Vercel translation endpoint with token...");

    const res = await fetch(urlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    console.log("Response Status:", res.status, res.statusText);
    const bodyText = await res.text();
    console.log("Response Body:", bodyText);
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
