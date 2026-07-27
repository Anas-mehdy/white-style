export type AdPauseExceptionMode = "never_pause" | "custom_limit";

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
  ad_id: string;
  meta_ad_id: string;
  ad_name: string;
  ad_url?: string | null;
  exception_mode: AdPauseExceptionMode;
  custom_cost_per_conversation?: number | null;
  reason?: string | null;
  is_active: boolean;
}
