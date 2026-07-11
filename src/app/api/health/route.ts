export async function GET() {
  return Response.json({
    status: "ok",
    service: "white-style-smart-agent",
    mode: "local-demo",
    timestamp: new Date().toISOString(),
  });
}
