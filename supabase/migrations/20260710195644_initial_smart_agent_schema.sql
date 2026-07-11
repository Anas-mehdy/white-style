create type public.member_role as enum ('owner', 'admin', 'operator', 'viewer');
create type public.agent_mode as enum ('observe', 'autopilot', 'paused');
create type public.decision_type as enum ('hold', 'watch', 'pause', 'decrease_budget', 'increase_budget');
create type public.execution_status as enum ('queued', 'executing', 'verified', 'failed', 'rolled_back', 'skipped');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'Asia/Hebron',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.meta_ad_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meta_account_id text not null,
  name text not null,
  currency text not null default 'USD',
  timezone_name text not null default 'Asia/Hebron',
  connection_status text not null default 'pending' check (connection_status in ('pending', 'connected', 'expired', 'error')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, meta_account_id)
);

create table public.meta_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ad_account_id uuid not null references public.meta_ad_accounts(id) on delete cascade,
  meta_campaign_id text not null,
  name text not null,
  objective text,
  effective_status text,
  budget_mode text check (budget_mode in ('campaign', 'ad_set', 'unknown')),
  daily_budget numeric(14, 2),
  raw_payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  unique (ad_account_id, meta_campaign_id)
);

create table public.meta_ad_sets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ad_account_id uuid not null references public.meta_ad_accounts(id) on delete cascade,
  campaign_id uuid not null references public.meta_campaigns(id) on delete cascade,
  meta_adset_id text not null,
  name text not null,
  effective_status text,
  daily_budget numeric(14, 2),
  learning_stage text,
  raw_payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  unique (ad_account_id, meta_adset_id)
);

create table public.meta_ads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ad_account_id uuid not null references public.meta_ad_accounts(id) on delete cascade,
  campaign_id uuid not null references public.meta_campaigns(id) on delete cascade,
  ad_set_id uuid not null references public.meta_ad_sets(id) on delete cascade,
  meta_ad_id text not null,
  name text not null,
  effective_status text,
  is_protected boolean not null default false,
  raw_payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  unique (ad_account_id, meta_ad_id)
);

create table public.ad_insights_daily (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ad_account_id uuid not null references public.meta_ad_accounts(id) on delete cascade,
  campaign_id uuid references public.meta_campaigns(id) on delete cascade,
  ad_set_id uuid references public.meta_ad_sets(id) on delete cascade,
  ad_id uuid references public.meta_ads(id) on delete cascade,
  insight_date date not null,
  spend numeric(14, 2) not null default 0,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  frequency numeric(10, 4),
  clicks bigint not null default 0,
  messaging_conversations bigint not null default 0,
  cost_per_conversation numeric(14, 4),
  ctr numeric(12, 6),
  cpc numeric(14, 4),
  cpm numeric(14, 4),
  attribution_setting text,
  source_payload jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  unique nulls not distinct (ad_account_id, campaign_id, ad_set_id, ad_id, insight_date)
);

create table public.agent_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ad_account_id uuid references public.meta_ad_accounts(id) on delete cascade,
  mode public.agent_mode not null default 'observe',
  max_budget_change_percent numeric(5, 2) not null default 15 check (max_budget_change_percent between 0 and 25),
  daily_total_increase_percent numeric(5, 2) not null default 10 check (daily_total_increase_percent between 0 and 25),
  cooldown_hours integer not null default 48 check (cooldown_hours between 1 and 168),
  stale_data_minutes integer not null default 120 check (stale_data_minutes between 15 and 1440),
  no_result_pause_multiple numeric(5, 2) not null default 8,
  poor_cost_multiple numeric(5, 2) not null default 2,
  scale_cost_multiple numeric(5, 2) not null default .75,
  minimum_results_to_scale integer not null default 30,
  kill_switch boolean not null default false,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, ad_account_id)
);

create table public.agent_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ad_account_id uuid not null references public.meta_ad_accounts(id) on delete cascade,
  campaign_id uuid references public.meta_campaigns(id) on delete cascade,
  ad_set_id uuid references public.meta_ad_sets(id) on delete cascade,
  ad_id uuid references public.meta_ads(id) on delete cascade,
  decision public.decision_type not null,
  confidence smallint not null check (confidence between 0 and 100),
  autonomous boolean not null default true,
  reason text not null,
  rule_version text not null,
  input_snapshot jsonb not null,
  proposed_change jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  decision_id uuid not null references public.agent_decisions(id) on delete cascade,
  idempotency_key text not null unique,
  meta_entity_type text not null check (meta_entity_type in ('campaign', 'ad_set', 'ad')),
  meta_entity_id text not null,
  action_type public.decision_type not null,
  status public.execution_status not null default 'queued',
  before_state jsonb not null default '{}'::jsonb,
  requested_state jsonb not null default '{}'::jsonb,
  verified_state jsonb,
  error_code text,
  error_message text,
  executed_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  channel text not null check (channel in ('dashboard', 'telegram')),
  severity text not null check (severity in ('info', 'success', 'warning', 'critical')),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ad_account_id uuid references public.meta_ad_accounts(id) on delete cascade,
  source text not null check (source in ('meta_api', 'csv', 'mock')),
  status text not null check (status in ('running', 'succeeded', 'failed', 'partial')),
  records_processed integer not null default 0,
  cursor_state jsonb not null default '{}'::jsonb,
  error_summary text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_type text not null check (actor_type in ('agent', 'user', 'system')),
  actor_id text,
  event_type text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index organization_members_user_idx on public.organization_members(user_id, organization_id);
create index ad_accounts_org_idx on public.meta_ad_accounts(organization_id);
create index campaigns_org_account_idx on public.meta_campaigns(organization_id, ad_account_id);
create index adsets_org_account_idx on public.meta_ad_sets(organization_id, ad_account_id);
create index ads_org_account_idx on public.meta_ads(organization_id, ad_account_id);
create index insights_org_date_idx on public.ad_insights_daily(organization_id, insight_date desc);
create index insights_ad_date_idx on public.ad_insights_daily(ad_id, insight_date desc);
create index decisions_org_created_idx on public.agent_decisions(organization_id, created_at desc);
create index actions_org_created_idx on public.agent_actions(organization_id, created_at desc);
create index notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index audit_org_created_idx on public.audit_logs(organization_id, created_at desc);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.meta_ad_accounts enable row level security;
alter table public.meta_campaigns enable row level security;
alter table public.meta_ad_sets enable row level security;
alter table public.meta_ads enable row level security;
alter table public.ad_insights_daily enable row level security;
alter table public.agent_configs enable row level security;
alter table public.agent_decisions enable row level security;
alter table public.agent_actions enable row level security;
alter table public.notifications enable row level security;
alter table public.sync_runs enable row level security;
alter table public.audit_logs enable row level security;

grant select on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select on public.meta_ad_accounts, public.meta_campaigns, public.meta_ad_sets, public.meta_ads to authenticated;
grant select on public.ad_insights_daily, public.agent_decisions, public.agent_actions, public.sync_runs, public.audit_logs to authenticated;
grant select, update on public.agent_configs to authenticated;
grant select, update on public.notifications to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

create policy "members_read_own_membership"
on public.organization_members for select to authenticated
using ((select auth.uid()) = user_id);

create policy "members_read_organizations"
on public.organizations for select to authenticated
using (exists (
  select 1 from public.organization_members member
  where member.organization_id = organizations.id
    and member.user_id = (select auth.uid())
));

create policy "members_read_ad_accounts"
on public.meta_ad_accounts for select to authenticated
using (exists (select 1 from public.organization_members member where member.organization_id = meta_ad_accounts.organization_id and member.user_id = (select auth.uid())));
create policy "members_read_campaigns"
on public.meta_campaigns for select to authenticated
using (exists (select 1 from public.organization_members member where member.organization_id = meta_campaigns.organization_id and member.user_id = (select auth.uid())));
create policy "members_read_ad_sets"
on public.meta_ad_sets for select to authenticated
using (exists (select 1 from public.organization_members member where member.organization_id = meta_ad_sets.organization_id and member.user_id = (select auth.uid())));
create policy "members_read_ads"
on public.meta_ads for select to authenticated
using (exists (select 1 from public.organization_members member where member.organization_id = meta_ads.organization_id and member.user_id = (select auth.uid())));
create policy "members_read_insights"
on public.ad_insights_daily for select to authenticated
using (exists (select 1 from public.organization_members member where member.organization_id = ad_insights_daily.organization_id and member.user_id = (select auth.uid())));
create policy "members_read_agent_configs"
on public.agent_configs for select to authenticated
using (exists (select 1 from public.organization_members member where member.organization_id = agent_configs.organization_id and member.user_id = (select auth.uid())));
create policy "admins_update_agent_configs"
on public.agent_configs for update to authenticated
using (exists (select 1 from public.organization_members member where member.organization_id = agent_configs.organization_id and member.user_id = (select auth.uid()) and member.role in ('owner', 'admin')))
with check (exists (select 1 from public.organization_members member where member.organization_id = agent_configs.organization_id and member.user_id = (select auth.uid()) and member.role in ('owner', 'admin')));
create policy "members_read_decisions"
on public.agent_decisions for select to authenticated
using (exists (select 1 from public.organization_members member where member.organization_id = agent_decisions.organization_id and member.user_id = (select auth.uid())));
create policy "members_read_actions"
on public.agent_actions for select to authenticated
using (exists (select 1 from public.organization_members member where member.organization_id = agent_actions.organization_id and member.user_id = (select auth.uid())));
create policy "members_read_sync_runs"
on public.sync_runs for select to authenticated
using (exists (select 1 from public.organization_members member where member.organization_id = sync_runs.organization_id and member.user_id = (select auth.uid())));
create policy "members_read_audit_logs"
on public.audit_logs for select to authenticated
using (exists (select 1 from public.organization_members member where member.organization_id = audit_logs.organization_id and member.user_id = (select auth.uid())));
create policy "users_read_notifications"
on public.notifications for select to authenticated
using ((select auth.uid()) = user_id or (user_id is null and exists (select 1 from public.organization_members member where member.organization_id = notifications.organization_id and member.user_id = (select auth.uid()))));
create policy "users_update_notifications"
on public.notifications for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create view public.account_performance_summary
with (security_invoker = true)
as
select
  account.organization_id,
  account.id as ad_account_id,
  account.name,
  coalesce(sum(insight.spend), 0)::numeric(14, 2) as spend,
  coalesce(sum(insight.messaging_conversations), 0)::bigint as messaging_conversations,
  case when sum(insight.messaging_conversations) > 0
    then round(sum(insight.spend) / sum(insight.messaging_conversations), 4)
    else null
  end as cost_per_conversation,
  max(insight.ingested_at) as data_freshness
from public.meta_ad_accounts account
left join public.ad_insights_daily insight on insight.ad_account_id = account.id
group by account.organization_id, account.id, account.name;

grant select on public.account_performance_summary to authenticated, service_role;
