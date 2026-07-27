export type AdPauseExceptionMode = "never_pause" | "custom_limit";

export type AdStatusFilter = "active" | "inactive" | "all";

export type AdPeriodFilter = "7d" | "30d" | "90d" | "all";

export interface AdPauseException {
  id: string;
  organization_id: string;
  ad_account_id: string;
  ad_id: string;
  meta_ad_id: string;
  ad_name: string | null;
  ad_url: string | null;
  exception_mode: AdPauseExceptionMode;
  custom_cost_per_conversation: number | null;
  reason: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  meta_ad_accounts?: {
    id: string;
    name: string;
    meta_account_id: string;
  } | null;
}

export interface AdSummary {
  id: string;
  ad_account_id: string;
  meta_ad_id: string;
  name: string;
  effective_status: string | null;
  creative_id: string | null;
  synced_at: string;
  campaign_name?: string | null;
  ad_set_name?: string | null;
  page_id?: string | null;
  page_name?: string | null;
  instagram_id?: string | null;
  instagram_name?: string | null;
  thumbnail_url?: string | null;
  existing_exception?: {
    id: string;
    exception_mode: AdPauseExceptionMode;
    custom_cost_per_conversation: number | null;
    is_active: boolean;
  } | null;
}

export interface AdCreativeGroup {
  key: string;
  creative_id: string | null;
  representative_name: string;
  thumbnail_url: string | null;
  total_ads: number;
  active_ads: number;
  page_count: number;
  page_names: string[];
  ads: AdSummary[];
}

export interface MetaAdOption {
  id: string;
  meta_ad_id: string;
  name: string;
  organization_id: string;
  ad_account_id: string;
  effective_status?: string | null;
}

export interface AdExceptionFormData {
  id?: string;
  organization_id?: string;
  ad_account_id: string;
  selectedAds: AdSummary[];
  exception_mode: AdPauseExceptionMode;
  custom_cost_per_conversation?: number | null;
  reason?: string | null;
  is_active: boolean;
  duplicateAction?: "skip" | "update";
}
