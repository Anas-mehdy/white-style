"use client";

import { CampaignCreationRequest, CampaignStrategy } from "./types";

export interface ApiResponse<T> {
  data?: T;
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

export async function createRequest(payload: {
  target_ad_account_id: string;
  source_post_url: string;
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
