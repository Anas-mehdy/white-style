const { OpenAI } = require("openai");

try {
  const client = new OpenAI({ apiKey: "test" });
  console.log("Create method type on client.responses:", typeof client.responses.create);
} catch (e) {
  console.error("Error inspecting OpenAI:", e);
}
