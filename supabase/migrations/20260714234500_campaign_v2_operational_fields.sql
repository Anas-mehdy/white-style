-- Migration to add Campaign Creation UX V2 tables and columns
create table if not exists public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  expert_mode boolean not null default false,
  default_ad_account text,
  default_execution_mode text not null default 'live',
  language text not null default 'ar',
  theme text not null default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed default settings for Demo Organization
insert into public.organization_settings (organization_id, expert_mode, default_execution_mode, language, theme)
values ('11111111-1111-4111-8111-111111111111', false, 'live', 'ar', 'dark')
on conflict (organization_id) do nothing;

-- Add new proper columns to campaign_creation_requests
alter table public.campaign_creation_requests
add column if not exists expert_mode boolean not null default false,
add column if not exists selected_strategy text,
add column if not exists created_by text not null default 'ai',
add column if not exists execution_timeline jsonb not null default '[]'::jsonb;

-- Add RLS policy for organization_settings
alter table public.organization_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'organization_settings' and policyname = 'members_manage_organization_settings'
  ) then
    create policy "members_manage_organization_settings"
    on public.organization_settings for all to authenticated
    using (exists (
      select 1 from public.organization_members member
      where member.organization_id = organization_settings.organization_id
        and member.user_id = (select auth.uid())
    ));
  end if;
end $$;

grant select, insert, update, delete on public.organization_settings to authenticated;
grant select, insert, update, delete on public.organization_settings to service_role;
grant select, insert, update, delete on public.organization_settings to anon;
