import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Validates target redirect URL:
 * - Must start with "/"
 * - Must NOT start with "//"
 * - Defaults to "/dashboard"
 */
export function getSafeRedirectTo(urlStr: string | null | undefined): string {
  if (!urlStr) return "/dashboard";
  if (urlStr.startsWith("/") && !urlStr.startsWith("//")) {
    return urlStr;
  }
  return "/dashboard";
}

/**
 * Helper to construct a redirect response while preserving all refreshed cookies.
 */
export function redirectWithCookies(targetUrl: URL, supabaseResponse: NextResponse): NextResponse {
  const redirectResponse = NextResponse.redirect(targetUrl);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
  });
  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Use getClaims() to check session presence
  const { data: claimsData } = await supabase.auth.getClaims();
  const hasSession = Boolean(claimsData?.claims);

  const pathname = request.nextUrl.pathname;

  // Never redirect API routes to HTML login pages
  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  // Redirect unauthenticated /chatbot routes to /login
  if (!hasSession && (pathname === "/chatbot" || pathname.startsWith("/chatbot/"))) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    const fullRequestedPath = pathname + request.nextUrl.search;
    loginUrl.searchParams.set("redirectTo", fullRequestedPath);
    return redirectWithCookies(loginUrl, supabaseResponse);
  }

  // If authenticated user tries to visit /login, redirect to safe target route or /dashboard
  if (hasSession && pathname === "/login") {
    const rawRedirect = request.nextUrl.searchParams.get("redirectTo");
    const safeRedirect = getSafeRedirectTo(rawRedirect);
    const targetUrl = request.nextUrl.clone();
    targetUrl.pathname = safeRedirect;
    targetUrl.searchParams.delete("redirectTo");
    return redirectWithCookies(targetUrl, supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - static image/asset files (.svg, .png, .jpg, .jpeg, .gif, .webp, .ico)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
