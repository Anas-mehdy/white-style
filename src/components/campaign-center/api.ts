"use client";

import { CampaignCreationRequest, CampaignStrategy, ContentLibraryItem } from "./types";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  error?: string;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("انتهت مهلة طلب الشبكة. يرجى المحاولة مرة أخرى.");
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

// 1. Fetch Content Library Items
export async function fetchContent(params: {
  platform?: string;
  contentType?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<ContentLibraryItem>> {
  try {
    const query = new URLSearchParams();
    if (params.platform) query.set("platform", params.platform);
    if (params.contentType) query.set("content_type", params.contentType);
    if (params.status) query.set("status", params.status);
    if (params.search) query.set("search", params.search);
    if (params.sortBy) query.set("sort_by", params.sortBy);
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.offset !== undefined) query.set("offset", String(params.offset));

    const res = await fetchWithTimeout(`/api/content?${query.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      return { items: [], pagination: { total: 0, limit: 12, offset: 0 }, error: data.error || "فشل جلب المحتوى" };
    }
    return data;
  } catch (err) {
    return {
      items: [],
      pagination: { total: 0, limit: 12, offset: 0 },
      error: err instanceof Error ? err.message : "فشل جلب المحتوى"
    };
  }
}

// 2. Fetch Single Content Item details
export async function fetchContentDetails(contentId: string): Promise<ApiResponse<ContentLibraryItem>> {
  try {
    const res = await fetchWithTimeout(`/api/content/${contentId}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "فشل جلب تفاصيل المحتوى" };
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "فشل جلب تفاصيل المحتوى" };
  }
}

// 3. Sync Content Library from Meta
export async function syncContent(): Promise<ApiResponse<{ success: boolean; summary: string }>> {
  try {
    const res = await fetchWithTimeout("/api/content/sync", { method: "POST" }, 30000); // 30s timeout for sync
    const data = await res.json();
    if (!res.ok) return { error: data.error || "فشلت مزامنة المحتوى" };
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "فشلت مزامنة المحتوى" };
  }
}

// 4. Create Campaign request (URL or Content Selection)
export async function createRequest(payload: {
  content_library_id?: string;
  target_ad_account_id: string;
  source_post_url?: string;
  destination_type: string;
  requested_daily_budget: number | null;
  execution_mode: string;
  placements: string;
}): Promise<ApiResponse<CampaignCreationRequest>> {
  try {
    const res = await fetchWithTimeout("/api/campaigns/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || "فشل بدء الطلب" };
    }
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "فشل بدء الطلب" };
  }
}

export async function resolveRequest(requestId: string): Promise<ApiResponse<CampaignCreationRequest>> {
  try {
    const res = await fetchWithTimeout("/api/campaigns/" + requestId + "/resolve", { method: "POST" });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "فشل تحليل المنشور" };
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "فشل تحليل المنشور" };
  }
}

export async function generateStrategy(requestId: string): Promise<ApiResponse<CampaignCreationRequest>> {
  try {
    const res = await fetchWithTimeout("/api/campaigns/" + requestId + "/strategy", { method: "POST" });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "فشل توليد الاستراتيجية" };
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "فشل توليد الاستراتيجية" };
  }
}

export async function selectStrategy(requestId: string, tier: 'conservative' | 'balanced' | 'aggressive'): Promise<ApiResponse<CampaignStrategy>> {
  try {
    const res = await fetchWithTimeout("/api/campaigns/" + requestId + "/select-strategy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "فشل اختيار الاستراتيجية" };
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "فشل اختيار الاستراتيجية" };
  }
}

export async function buildCampaign(requestId: string, tier: 'conservative' | 'balanced' | 'aggressive'): Promise<ApiResponse<CampaignCreationRequest>> {
  try {
    const res = await fetchWithTimeout("/api/campaigns/" + requestId + "/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    }, 25000);
    const data = await res.json();
    if (!res.ok) return { error: data.error || "فشل بناء الحملة" };
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "فشل بناء الحملة" };
  }
}

export async function fetchRequests(): Promise<ApiResponse<CampaignCreationRequest[]>> {
  try {
    const res = await fetchWithTimeout("/api/campaigns", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "فشل جلب الطلبات" };
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "فشل جلب الطلبات" };
  }
}

export async function fetchRequestDetails(requestId: string): Promise<ApiResponse<{
  request: CampaignCreationRequest;
  strategies: CampaignStrategy[];
}>> {
  try {
    const res = await fetchWithTimeout("/api/campaigns/" + requestId, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "فشل جلب تفاصيل الطلب" };
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "فشل جلب تفاصيل الطلب" };
  }
}
