insert into public.organizations (id, name, slug, timezone)
values ('11111111-1111-4111-8111-111111111111', 'white style', 'white-style', 'Asia/Hebron')
on conflict (slug) do nothing;

insert into public.meta_ad_accounts (id, organization_id, meta_account_id, name, connection_status, last_synced_at)
values
  ('21111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'demo-account-1', 'White Style — الحساب الأول', 'connected', now()),
  ('21111111-1111-4111-8111-111111111112', '11111111-1111-4111-8111-111111111111', 'demo-account-2', 'White Style — الحساب الثاني', 'connected', now()),
  ('21111111-1111-4111-8111-111111111113', '11111111-1111-4111-8111-111111111111', 'pending-account-3', 'White Style — الحساب الثالث', 'pending', null)
on conflict (organization_id, meta_account_id) do nothing;

insert into public.agent_configs (organization_id, mode, max_budget_change_percent, daily_total_increase_percent, cooldown_hours, kill_switch)
values ('11111111-1111-4111-8111-111111111111', 'autopilot', 15, 10, 48, false)
on conflict (organization_id, ad_account_id) do nothing;
