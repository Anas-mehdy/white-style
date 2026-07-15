-- Migration to create translation cache table
create table if not exists public.campaign_translations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.campaign_creation_requests(id) on delete cascade,
  language text not null,
  source_hash text not null,
  translator_version text not null,
  translated_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique constraint on request_id, language, source_hash, translator_version
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'unique_request_language_hash_version'
  ) then
    alter table public.campaign_translations
      add constraint unique_request_language_hash_version unique (request_id, language, source_hash, translator_version);
  end if;
end $$;

-- Enable RLS
alter table public.campaign_translations enable row level security;

-- Drop trigger and function if exists to avoid migration conflicts
drop trigger if exists trg_update_campaign_translations_updated_at on public.campaign_translations;
drop function if exists public.update_campaign_translations_updated_at();

-- Trigger function to update updated_at
create or replace function public.update_campaign_translations_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_update_campaign_translations_updated_at
  before update on public.campaign_translations
  for each row
  execute function public.update_campaign_translations_updated_at();

-- RLS policies
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'campaign_translations' and policyname = 'users_select_translations'
  ) then
    create policy "users_select_translations"
      on public.campaign_translations for select to authenticated
      using (
        exists (
          select 1 from public.campaign_creation_requests req
          where req.id = campaign_translations.request_id
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'campaign_translations' and policyname = 'service_role_all_translations'
  ) then
    create policy "service_role_all_translations"
      on public.campaign_translations for all to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'campaign_translations' and policyname = 'anon_select_translations'
  ) then
    create policy "anon_select_translations"
      on public.campaign_translations for select to anon
      using (
        exists (
          select 1 from public.campaign_creation_requests req
          where req.id = campaign_translations.request_id
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'campaign_translations' and policyname = 'anon_insert_translations'
  ) then
    create policy "anon_insert_translations"
      on public.campaign_translations for insert to anon
      with check (
        exists (
          select 1 from public.campaign_creation_requests req
          where req.id = campaign_translations.request_id
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'campaign_translations' and policyname = 'anon_update_translations'
  ) then
    create policy "anon_update_translations"
      on public.campaign_translations for update to anon
      using (
        exists (
          select 1 from public.campaign_creation_requests req
          where req.id = campaign_translations.request_id
        )
      );
  end if;
end $$;

grant select, insert, update on public.campaign_translations to authenticated;
grant select, insert, update on public.campaign_translations to service_role;
grant select, insert, update on public.campaign_translations to anon;
