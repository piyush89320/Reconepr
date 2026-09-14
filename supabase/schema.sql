-- ReconEPR MVP schema for Supabase (Postgres)
-- Run this in the Supabase SQL editor on a fresh project.
-- It creates the tables, the row-level-security policies that keep each
-- company's data isolated, the private documents bucket, a signup trigger,
-- and the RPC that onboarding calls to create a company.
--
-- Isolation model: every row belongs to one company. A user's company is
-- read from their profile by auth_company_id(). RLS uses that function so a
-- signed-in user can only ever touch rows for their own company. This is
-- enforced in the database, not in the front end, so it holds for WeWeb,
-- the Next.js app, or any other client using the anon key.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gst_number text unique not null,
  company_type text,
  product_type text,
  primary_packaging_category text
    check (primary_packaging_category in ('category_1_rigid','category_2_flexible','category_3_multilayered')),
  existing_cpcb_reg text,
  compliance_status text not null default 'action_required'
    check (compliance_status in ('action_required','under_review','ca_in_preparation','registered_compliant')),
  privacy_notice_version text,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_id uuid references companies(id) on delete set null,
  role text not null default 'owner' check (role in ('owner','admin','manager')),
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  doc_type text not null check (doc_type in (
    'gst_certificate','pan_card','consent_to_operate','msme_dic',
    'ca_certificate','registration_certificate','credit_receipt')),
  storage_path text not null,
  is_deliverable boolean not null default false,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null,
  notice_version text,
  consent_given boolean not null default true,
  withdrawn boolean not null default false,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now()
);

-- Public reference data for the estimator. Read-only to clients.
create table if not exists target_rates (
  financial_year text not null,
  category text not null,
  recycling_target numeric not null,
  primary key (financial_year, category)
);

insert into target_rates (financial_year, category, recycling_target) values
  ('FY 2025-26','category_1_rigid',0.60),
  ('FY 2025-26','category_2_flexible',0.40),
  ('FY 2025-26','category_3_multilayered',0.40),
  ('FY 2026-27','category_1_rigid',0.70),
  ('FY 2026-27','category_2_flexible',0.50),
  ('FY 2026-27','category_3_multilayered',0.50),
  ('FY 2027-28','category_1_rigid',0.80),
  ('FY 2027-28','category_2_flexible',0.60),
  ('FY 2027-28','category_3_multilayered',0.60)
on conflict do nothing;
-- FY 2024-25 and earlier are intentionally absent. Confirm against the
-- gazette before adding them.

-- ---------------------------------------------------------------------------
-- Helper: the caller's company id, read with definer rights so policies on
-- other tables can use it without recursing into the profiles policy.
-- ---------------------------------------------------------------------------

create or replace function auth_company_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select company_id from profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Signup trigger: give every new auth user a profile row.
-- ---------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Onboarding RPC: create a company, link the caller as owner, record consent.
-- Blocks a duplicate GST so two logins cannot create the same company.
-- ---------------------------------------------------------------------------

create or replace function create_company_and_link(
  p_name text,
  p_gst text,
  p_company_type text,
  p_product_type text,
  p_packaging_category text,
  p_existing_cpcb_reg text,
  p_notice_version text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if (select company_id from profiles where id = auth.uid()) is not null then
    raise exception 'This account is already linked to a company.';
  end if;

  if exists (select 1 from companies where gst_number = p_gst) then
    raise exception 'A company with this GST number already exists. Ask its owner to invite you.';
  end if;

  insert into companies (name, gst_number, company_type, product_type,
                         primary_packaging_category, existing_cpcb_reg,
                         privacy_notice_version)
  values (p_name, p_gst, p_company_type, p_product_type,
          p_packaging_category, nullif(p_existing_cpcb_reg,''), p_notice_version)
  returning id into v_company_id;

  update profiles set company_id = v_company_id, role = 'owner'
    where id = auth.uid();

  insert into consents (company_id, user_id, purpose, notice_version)
  values (v_company_id, auth.uid(), 'EPR compliance processing and KYC', p_notice_version);

  return v_company_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS and define policies
-- ---------------------------------------------------------------------------

alter table companies enable row level security;
alter table profiles enable row level security;
alter table documents enable row level security;
alter table consents enable row level security;
alter table target_rates enable row level security;

-- profiles: a user sees and edits only their own profile row.
create policy profiles_select_own on profiles
  for select using (id = auth.uid());
create policy profiles_update_own on profiles
  for update using (id = auth.uid());

-- companies: a user sees and edits only their own company.
-- Note: this allows updating any column on the own company row. For the MVP
-- the front end does not expose compliance_status, and agents change it with
-- the service role. If you later let managers edit the company, add a trigger
-- to protect compliance_status from client updates.
create policy companies_select_own on companies
  for select using (id = auth_company_id());
create policy companies_update_own on companies
  for update using (id = auth_company_id());

-- documents: a user reads all of their company's documents, but can only
-- insert non-deliverable KYC files. Deliverables are added by agents with the
-- service role, so a client cannot fabricate a certificate row.
create policy documents_select_own on documents
  for select using (company_id = auth_company_id());
create policy documents_insert_kyc on documents
  for insert with check (company_id = auth_company_id() and is_deliverable = false);
create policy documents_delete_own_kyc on documents
  for delete using (company_id = auth_company_id() and is_deliverable = false);

-- consents: read own company's consents, withdraw only your own.
create policy consents_select_own on consents
  for select using (company_id = auth_company_id());
create policy consents_update_own on consents
  for update using (user_id = auth.uid());

-- target_rates: readable by anyone signed in or anonymous, for the estimator.
create policy target_rates_read_all on target_rates
  for select using (true);

-- ---------------------------------------------------------------------------
-- Storage: private documents bucket, one folder per company.
-- Object path convention: <company_id>/<doc_type>-<timestamp>.<ext>
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('documents','documents', false)
on conflict (id) do nothing;

create policy documents_storage_select on storage.objects
  for select using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth_company_id()::text
  );
create policy documents_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth_company_id()::text
  );
create policy documents_storage_delete on storage.objects
  for delete using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth_company_id()::text
  );
