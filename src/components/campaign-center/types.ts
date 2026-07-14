"use client";

export interface ContentLibraryItem {
  id: string;
  account_id: string | null;
  platform: "facebook" | "instagram";
  content_type: "post" | "reel" | "video" | "carousel" | "photo";
  meta_post_id: string;
  page_id: string | null;
  instagram_media_id: string | null;
  caption: string | null;
  permalink: string | null;
  thumbnail_url: string | null;
  media_url: string | null;
  media_type: string | null;
  created_time: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_promoted: boolean;
  promotion_count: number;
  last_campaign_id: string | null;
  status:
    | "NEW"
    | "ANALYZED"
    | "READY"
    | "PROMOTED"
    | "RUNNING"
    | "FINISHED"
    | "ARCHIVED";
  raw_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignCreationRequest {
  id: string;
  request_id?: string;
  organization_id: string;
  target_ad_account_id: string;
  target_meta_account_id: string | null;
  source_platform: string | null;
  source_post_url: string;
  destination_type: 'whatsapp' | 'messenger' | 'website';
  execution_mode: 'dry_run' | 'live';
  status: 'draft' | 'analyzing' | 'resolution_failed' | 'strategy_ready' | 'strategy_review_required' | 'building' | 'ready_for_review' | 'approved' | 'rejected' | 'published' | 'failed';
  requested_daily_budget: number | null;
  idempotency_key: string | null;
  request_payload: {
    resolver_status?: "pending" | "resolved" | "failed";
    resolver_method?: "link" | "content_library";
    content_library_id?: string;
    source_post_id?: string;
    instagram_media_id?: string;
    page_id?: string;
    content_context?: {
      caption?: string;
      media_type?: string;
      thumbnail_url?: string;
      permalink?: string;
    };
    content_analysis?: {
      platform: string;
      media_type: string;
      content_summary: string;
      detected_goal: string;
      detected_language: string;
      confidence: number;
    };
    [key: string]: any;
  } | null;
  error_code: string | null;
  error_message: string | null;
  requested_by: string | null;
  created_at: string;
  updated_at: string;
  meta_ad_accounts?: {
    name: string;
  } | null;
}

export interface CampaignStrategy {
  request_id: string;
  tier: 'conservative' | 'balanced' | 'aggressive';
  campaign_name: string;
  objective: string;
  optimization_goal: string;
  billing_event: string;
  bid_strategy: string | null;
  destination_type: string;
  daily_budget: number;
  duration_days: number | null;
  age_min: number;
  age_max: number;
  gender: string;
  country_codes: string[];
  placements: string[];
  targeting_mode: string;
  interest_hints: string[];
  confidence: number;
  reasons: string[];
  warnings: string[];
  strategy_payload: {
    cpa_estimate?: number;
    expected_conversations?: number;
    advantages?: string[];
    risks?: string[];
    [key: string]: any;
  } | null;
  selected: boolean;
  status: string;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_creative_id: string | null;
  meta_ad_id: string | null;
  build_error_code: string | null;
  build_error_message: string | null;
}
