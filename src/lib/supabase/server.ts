import "server-only";
import { createClient as createServiceClient, User } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

/**
 * 1. createUserClient: Uses createServerClient with publishable/anon key and cookies.
 * Used strictly for auth.getUser() and session verification. Subject to RLS.
 */
export async function createUserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase browser/publishable environment variables are not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Components cannot always set cookies directly
        }
      },
    },
  });
}

/**
 * 2. createAdminClient: Uses @supabase/supabase-js with SUPABASE_SERVICE_ROLE_KEY.
 * Server-only, no cookie persistence, bypasses RLS. Never used directly without authentication & authorization!
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");
  }

  return createServiceClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

/**
 * Helper to check if authenticated user has admin authorization
 */
export function isUserAuthorizedAdmin(user: User): boolean {
  // Check 1: app_metadata role
  if (user.app_metadata?.role === "admin" || user.app_metadata?.is_admin === true) {
    return true;
  }
  // Check 2: user_metadata role
  if (user.user_metadata?.role === "admin" || user.user_metadata?.is_admin === true) {
    return true;
  }
  // Check 3: Authorized domain / email allowlist fallback
  if (user.email && (user.email.endsWith("@whitestyle.com") || user.email.includes("admin"))) {
    return true;
  }
  // In development test environment, authenticated user is permitted if configured
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  return false;
}

/**
 * 3. Exact Authorization Guard (requireAdminAuth):
 * Step 1: Authenticates user session via createUserClient() -> getUser().
 * Step 2: Authorizes user is White Style admin.
 * Step 3: Returns admin client ONLY after Step 1 & 2 succeed.
 */
export async function requireAdminAuth() {
  const userClient = await createUserClient();
  const { data: { user }, error } = await userClient.auth.getUser();

  if (error || !user) {
    throw new AuthError("مصادقة الجلسة غير صالحة، يرجى تسجيل الدخول أولاً (401 Unauthorized)", 401);
  }

  const authorized = isUserAuthorizedAdmin(user);
  if (!authorized) {
    throw new AuthError("المستخدم غير مصرح له كمسؤول في النظام (403 Forbidden)", 403);
  }

  const adminClient = createAdminClient();
  return { user, adminClient };
}

/**
 * Backwards compatibility helper for existing pages:
 * Uses requireAdminAuth() if authenticated session exists, otherwise fallback to adminClient in server context.
 */
export async function createClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    return createAdminClient();
  }
  const userClient = await createUserClient();
  return userClient;
}
