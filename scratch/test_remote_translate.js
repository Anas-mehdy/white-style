async function run() {
  const url = "https://white-style.vercel.app/api/campaigns/89de3941-1f51-4fba-b85e-9495abc8765c/translate";
  try {
    console.log("Hitting Vercel translation endpoint...");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    console.log("Response Status:", res.status, res.statusText);
    const text = await res.text();
    console.log("Response Body:", text);
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

run();
