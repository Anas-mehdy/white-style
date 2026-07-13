-- Migration: Create agent_decisions_final_status view
-- Created At: 2026-07-13

CREATE OR REPLACE VIEW public.agent_decisions_final_status
WITH (security_invoker = true)
AS
WITH action_summary AS (
  SELECT
    a.decision_id,

    bool_or(a.status = 'verified') AS has_verified,
    bool_or(a.status = 'executing') AS has_executing,
    bool_or(a.status = 'queued') AS has_queued,

    (
      array_agg(
        a.status
        ORDER BY a.created_at DESC, a.id DESC
      )
    )[1] AS latest_status,

    (
      array_agg(
        a.error_code
        ORDER BY a.created_at DESC, a.id DESC
      )
    )[1] AS latest_error_code,

    (
      array_agg(
        a.error_message
        ORDER BY a.created_at DESC, a.id DESC
      )
    )[1] AS latest_error_message,

    max(a.executed_at) AS last_executed_at,
    max(a.created_at) AS last_action_at,
    max(a.verified_at) AS last_verified_at,

    -- Deterministic timestamps for KPI logic and final_status_at calculation
    (
      array_agg(
        coalesce(a.verified_at, a.executed_at, a.created_at)
        ORDER BY a.created_at DESC, a.id DESC
      ) FILTER (WHERE a.status = 'verified')
    )[1] AS verified_action_at,

    (
      array_agg(
        coalesce(a.executed_at, a.created_at)
        ORDER BY a.created_at DESC, a.id DESC
      ) FILTER (WHERE a.status = 'failed')
    )[1] AS failed_action_at,

    (
      array_agg(
        coalesce(a.executed_at, a.created_at)
        ORDER BY a.created_at DESC, a.id DESC
      ) FILTER (WHERE a.status = 'skipped')
    )[1] AS skipped_action_at,

    (
      array_agg(
        coalesce(a.executed_at, a.created_at)
        ORDER BY a.created_at DESC, a.id DESC
      ) FILTER (WHERE a.status IN ('executing', 'queued'))
    )[1] AS in_progress_action_at

  FROM public.agent_actions a
  GROUP BY a.decision_id
)
SELECT
  d.id,
  d.organization_id,
  d.ad_account_id,
  d.campaign_id,
  d.ad_set_id,
  d.ad_id,
  d.decision,
  d.confidence,
  d.autonomous,
  d.reason,
  d.rule_version,
  d.input_snapshot,
  d.proposed_change,
  d.expires_at,
  d.created_at,

  -- Treat verified as highest priority final state
  CASE
    WHEN s.has_verified THEN 'executed'
    WHEN s.has_executing OR s.has_queued THEN 'pending'
    WHEN s.latest_status = 'failed' THEN 'failed'
    WHEN s.latest_status = 'skipped' THEN 'skipped'
    ELSE 'pending'
  END AS final_execution_status,

  -- final_status_at must correspond to the action that determines the final status
  CASE
    WHEN s.has_verified THEN s.verified_action_at
    WHEN s.has_executing OR s.has_queued THEN s.in_progress_action_at
    WHEN s.latest_status = 'failed' THEN s.failed_action_at
    WHEN s.latest_status = 'skipped' THEN s.skipped_action_at
    ELSE d.created_at
  END AS final_status_at,

  s.latest_status,
  
  -- If final execution status is executed, the final error code/message must be null
  CASE WHEN s.has_verified THEN NULL ELSE s.latest_error_code END AS latest_error_code,
  CASE WHEN s.has_verified THEN NULL ELSE s.latest_error_message END AS latest_error_message,

  s.last_executed_at,
  s.last_action_at,
  s.last_verified_at,
  s.verified_action_at,
  s.failed_action_at,
  s.skipped_action_at,
  s.in_progress_action_at,

  -- Expose flattened related columns from Meta tables directly
  acc.name AS ad_account_name,
  acc.currency AS currency,
  acc.meta_account_id AS meta_account_id,
  
  ad.name AS ad_name,
  ad.meta_ad_id AS meta_ad_id,
  
  adset.name AS ad_set_name,
  adset.daily_budget AS ad_set_daily_budget,
  adset.meta_adset_id AS meta_adset_id,
  
  camp.name AS campaign_name,
  camp.daily_budget AS campaign_daily_budget,
  camp.meta_campaign_id AS meta_campaign_id

FROM public.agent_decisions d
LEFT JOIN action_summary s ON s.decision_id = d.id
LEFT JOIN public.meta_ad_accounts acc ON d.ad_account_id = acc.id
LEFT JOIN public.meta_ads ad ON d.ad_id = ad.id
LEFT JOIN public.meta_ad_sets adset ON d.ad_set_id = adset.id
LEFT JOIN public.meta_campaigns camp ON d.campaign_id = camp.id;

-- Grant select access only to authenticated and service_role
GRANT SELECT ON public.agent_decisions_final_status TO authenticated;
GRANT SELECT ON public.agent_decisions_final_status TO service_role;
