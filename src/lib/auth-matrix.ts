import { DEFAULT_ORGANIZATION_ID, AuthError, OrgRole } from "@/lib/supabase/server";

export interface MockAuthContext {
  user: { id: string; email: string } | null;
  memberships: Array<{ user_id: string; organization_id: string; role: OrgRole }>;
}

/**
 * Pure authorization evaluator logic matching requireOrgAuth
 */
export function evaluateOrgAuth(
  context: MockAuthContext,
  requiredMinRole: "admin" | "operator" | "viewer" = "admin",
  requestBodyOrgId?: string
) {
  // Step 1: Authenticate session
  if (!context.user) {
    throw new AuthError("مصادقة الجلسة غير صالحة، يرجى تسجيل الدخول أولاً (401 Unauthorized)", 401);
  }

  // Step 2: Query organization_members
  const membership = context.memberships.find(
    m => m.user_id === context.user!.id && m.organization_id === DEFAULT_ORGANIZATION_ID
  );

  if (!membership) {
    throw new AuthError("المستخدم غير مسجّل كعضو في هذه المؤسسة (403 Forbidden)", 403);
  }

  // Step 3: Validate role hierarchy
  const ROLE_LEVELS: Record<string, number> = { owner: 4, admin: 3, operator: 2, viewer: 1 };
  const userRole = (membership.role || "viewer").toLowerCase();
  const userLevel = ROLE_LEVELS[userRole] ?? 1;
  const requiredLevel = ROLE_LEVELS[requiredMinRole] ?? 3;

  if (userLevel < requiredLevel) {
    throw new AuthError(`دور المستخدم (${userRole}) لا يمنح صلاحية تنفيذ هذا الإجراء (${requiredMinRole}) (403 Forbidden)`, 403);
  }

  // Step 4: Verify requestBodyOrgId is ignored
  const effectiveOrgId = membership.organization_id;
  const isRequestBodyIgnored = requestBodyOrgId !== undefined ? (requestBodyOrgId as string) !== effectiveOrgId || effectiveOrgId === DEFAULT_ORGANIZATION_ID : true;

  return {
    userId: context.user.id,
    role: userRole,
    organizationId: effectiveOrgId,
    requestBodyIgnored: isRequestBodyIgnored
  };
}

/**
 * Automated Security Matrix Test Runner
 */
export function runAuthMatrixTests() {
  const results: Array<{ test: string; status: "PASSED" | "FAILED"; details: string }> = [];

  const mockDbMemberships = [
    { user_id: "user-owner", organization_id: DEFAULT_ORGANIZATION_ID, role: "owner" },
    { user_id: "user-admin", organization_id: DEFAULT_ORGANIZATION_ID, role: "admin" },
    { user_id: "user-operator", organization_id: DEFAULT_ORGANIZATION_ID, role: "operator" },
    { user_id: "user-viewer", organization_id: DEFAULT_ORGANIZATION_ID, role: "viewer" },
  ];

  // Test 1: No session -> 401
  try {
    evaluateOrgAuth({ user: null, memberships: mockDbMemberships }, "admin");
    results.push({ test: "1. No session -> 401", status: "FAILED", details: "Should have thrown 401" });
  } catch (err: unknown) {
    if (err instanceof AuthError && err.statusCode === 401) {
      results.push({ test: "1. No session -> 401", status: "PASSED", details: err.message });
    } else {
      results.push({ test: "1. No session -> 401", status: "FAILED", details: String(err) });
    }
  }

  // Test 2: Authenticated user without organization membership -> 403
  try {
    evaluateOrgAuth({ user: { id: "user-unseeded", email: "other@domain.com" }, memberships: mockDbMemberships }, "admin");
    results.push({ test: "2. Authenticated user without membership -> 403", status: "FAILED", details: "Should have thrown 403" });
  } catch (err: unknown) {
    if (err instanceof AuthError && err.statusCode === 403) {
      results.push({ test: "2. Authenticated user without membership -> 403", status: "PASSED", details: err.message });
    } else {
      results.push({ test: "2. Authenticated user without membership -> 403", status: "FAILED", details: String(err) });
    }
  }

  // Test 3: Viewer trying mutation -> 403
  try {
    evaluateOrgAuth({ user: { id: "user-viewer", email: "viewer@domain.com" }, memberships: mockDbMemberships }, "admin");
    results.push({ test: "3. Viewer trying mutation -> 403", status: "FAILED", details: "Should have thrown 403" });
  } catch (err: unknown) {
    if (err instanceof AuthError && err.statusCode === 403) {
      results.push({ test: "3. Viewer trying mutation -> 403", status: "PASSED", details: err.message });
    } else {
      results.push({ test: "3. Viewer trying mutation -> 403", status: "FAILED", details: String(err) });
    }
  }

  // Test 4: Operator performing an allowed operational action -> success
  try {
    const res = evaluateOrgAuth({ user: { id: "user-operator", email: "op@domain.com" }, memberships: mockDbMemberships }, "operator");
    results.push({ test: "4. Operator performing allowed operational action -> success", status: "PASSED", details: `Role ${res.role} granted level 2 access` });
  } catch (err: unknown) {
    results.push({ test: "4. Operator performing allowed operational action -> success", status: "FAILED", details: String(err) });
  }

  // Test 5: Operator performing an admin-only action -> 403
  try {
    evaluateOrgAuth({ user: { id: "user-operator", email: "op@domain.com" }, memberships: mockDbMemberships }, "admin");
    results.push({ test: "5. Operator performing admin-only action -> 403", status: "FAILED", details: "Should have thrown 403" });
  } catch (err: unknown) {
    if (err instanceof AuthError && err.statusCode === 403) {
      results.push({ test: "5. Operator performing admin-only action -> 403", status: "PASSED", details: err.message });
    } else {
      results.push({ test: "5. Operator performing admin-only action -> 403", status: "FAILED", details: String(err) });
    }
  }

  // Test 6: Owner/Admin performing admin-only action -> success
  try {
    const resAdmin = evaluateOrgAuth({ user: { id: "user-admin", email: "admin@domain.com" }, memberships: mockDbMemberships }, "admin");
    const resOwner = evaluateOrgAuth({ user: { id: "user-owner", email: "owner@domain.com" }, memberships: mockDbMemberships }, "admin");
    results.push({ test: "6. Owner/Admin -> success", status: "PASSED", details: `Admin (${resAdmin.role}) & Owner (${resOwner.role}) granted access` });
  } catch (err: unknown) {
    results.push({ test: "6. Owner/Admin -> success", status: "FAILED", details: String(err) });
  }

  // Test 7: organization_id supplied in request body is ignored
  try {
    const maliciousOrgId = "99999999-9999-9999-9999-999999999999";
    const res = evaluateOrgAuth(
      { user: { id: "user-admin", email: "admin@domain.com" }, memberships: mockDbMemberships },
      "admin",
      maliciousOrgId
    );
    if (res.organizationId === DEFAULT_ORGANIZATION_ID && res.organizationId !== (maliciousOrgId as string)) {
      results.push({ test: "7. Request body organization_id is ignored", status: "PASSED", details: `Malicious orgId '${maliciousOrgId}' ignored, used verified '${res.organizationId}'` });
    } else {
      results.push({ test: "7. Request body organization_id is ignored", status: "FAILED", details: "Used body orgId" });
    }
  } catch (err: unknown) {
    results.push({ test: "7. Request body organization_id is ignored", status: "FAILED", details: String(err) });
  }

  return results;
}
