import "server-only";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const DEFAULT_ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

export type OrgRole = "owner" | "admin" | "operator" | "viewer" | string;

export interface VerifiedMembership {
  user_id: string;
  organization_id: string;
  role: OrgRole;
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
 * Server-only, no cookie persistence, bypasses RLS.
 * NEVER used directly without authentication & organization_members authorization verification!
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
 * Role hierarchy helper
 */
const ROLE_LEVELS: Record<string, number> = {
  owner: 4,
  admin: 3,
  operator: 2,
  viewer: 1
};

/**
 * 3. Exact Authorization Guard using organization_members ONLY as the authorization source.
 * Step 1: Authenticate with createUserClient().auth.getUser() -> return 401 if unauthenticated.
 * Step 2: Create server-only admin client.
 * Step 3: Query organization_members for user_id = authenticated user.id AND organization_id = DEFAULT_ORGANIZATION_ID.
 * Step 4: Validate role hierarchy against requiredMinRole (403 if unauthorized).
 * Step 5: Return organizationId from the verified membership row (membership.organization_id).
 */
export async function requireOrgAuth(requiredMinRole: "admin" | "operator" | "viewer" = "admin") {
  // Step 1: Authenticate request session using publishable SSR user client
  const userClient = await createUserClient();
  const { data: { user }, error: authError } = await userClient.auth.getUser();

  if (authError || !user) {
    throw new AuthError("مصادقة الجلسة غير صالحة، يرجى تسجيل الدخول أولاً (401 Unauthorized)", 401);
  }

  // Step 2: Create admin client to query organization_members
  const adminClient = createAdminClient();

  // Step 3: Query organization_members using user.id and DEFAULT_ORGANIZATION_ID
  const { data: membership, error: memError } = await adminClient
    .from("organization_members")
    .select("user_id, organization_id, role")
    .eq("user_id", user.id)
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .maybeSingle();

  if (memError) {
    console.error("[requireOrgAuth] Database membership query error:", memError);
    throw new AuthError("خطأ في الاتصال بنظام المصادقة لقاعدة البيانات", 500);
  }

  if (!membership) {
    throw new AuthError("المستخدم غير مسجّل كعضو في هذه المؤسسة (403 Forbidden)", 403);
  }

  const userRole = (membership.role || "viewer").toLowerCase();
  const userLevel = ROLE_LEVELS[userRole] ?? 1;
  const requiredLevel = ROLE_LEVELS[requiredMinRole] ?? 3;

  if (userLevel < requiredLevel) {
    throw new AuthError(`دور المستخدم (${userRole}) لا يمنح صلاحية تنفيذ هذا الإجراء (${requiredMinRole}) (403 Forbidden)`, 403);
  }

  const verifiedMembership: VerifiedMembership = {
    user_id: membership.user_id,
    organization_id: membership.organization_id,
    role: membership.role
  };

  // Step 6: Return organizationId from the verified membership, not directly from constant
  return {
    user,
    membership: verifiedMembership,
    organizationId: membership.organization_id,
    adminClient
  };
}

/**
 * Administrative Operations Guard (Requires role 'owner' or 'admin')
 */
export async function requireAdminAuth() {
  return requireOrgAuth("admin");
}

/**
 * Operational Actions Guard (Allows role 'owner', 'admin', or 'operator')
 */
export async function requireOperatorAuth() {
  return requireOrgAuth("operator");
}

/**
 * Backwards compatibility helper
 */
export async function createClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    return createAdminClient();
  }
  return createUserClient();
}
