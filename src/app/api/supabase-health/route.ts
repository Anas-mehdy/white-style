import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();

    if (error) {
      return Response.json(
        { status: "error", service: "supabase", message: error.message },
        { status: 503 },
      );
    }

    return Response.json({
      status: "ok",
      service: "supabase",
      projectRef: "wsmbaueobuzilyagtnuq",
      connected: true,
    });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        service: "supabase",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
