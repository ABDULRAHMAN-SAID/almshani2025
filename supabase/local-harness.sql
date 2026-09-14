-- ============================================================================
-- طبقة توافق محلية مع Supabase — للاختبار فقط
-- ============================================================================
--
-- الغرض: تشغيل schema.sql و security-tests.sql على Postgres عادي، دون الحاجة
-- إلى مشروع Supabase مستضاف. تنشئ ما يوفّره Supabase عادةً:
--   • مخطط auth وجدول auth.users ودالة auth.uid()
--   • الأدوار anon / authenticated / service_role وصلاحياتها
--   • مخطط storage وجدولَي buckets و objects بسياسات RLS
--
-- ⚠️ لا تنفّذ هذا الملف على مشروع Supabase حقيقي — كل هذا موجود فيه أصلًا،
--    وإعادة تعريفه قد تكسر المصادقة.
--
-- التشغيل المحلي بالترتيب:
--   psql -d anshatati -f supabase/local-harness.sql
--   psql -d anshatati -f supabase/schema.sql
--   psql -d anshatati -f supabase/security-tests.sql     (بعد وضع المعرّفين)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- الأدوار
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- مخطط auth
-- ---------------------------------------------------------------------------
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  phone text unique,
  email text unique,
  created_at timestamptz not null default now()
);

/**
 * هوية صاحب الطلب.
 *
 * هذه هي النسخة نفسها التي يستعملها Supabase: تقرأ الادّعاء `sub` من
 * request.jwt.claims الذي تضعه بوابة الـAPI بعد التحقق من التوكن. ولهذا
 * تُعدّ انتحال الهوية في ملف الاختبارات مطابقة لما يحدث فعلًا في الإنتاج.
 */
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid;
$$;

create or replace function auth.role() returns text
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::json ->> 'role', ''),
    'anon'
  );
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- مخطط storage
-- ---------------------------------------------------------------------------
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  created_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets (id) on delete cascade,
  name text not null,
  owner uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb,
  unique (bucket_id, name)
);

alter table storage.objects enable row level security;
alter table storage.buckets enable row level security;

create policy "buckets readable" on storage.buckets for select using (true);

grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;
grant all on storage.buckets to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- الصلاحيات على public
--
-- مهم: Supabase يمنح الأدوار صلاحيات جدولية واسعة ثم يقيّد الصفوف بـ RLS.
-- لو لم نمنحها هنا لفشل كل شيء بخطأ "permission denied" بدل أن تفرزه السياسات،
-- ولبدت الاختبارات ناجحة لسبب خاطئ تمامًا.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- تُستدعى مرة أخرى بعد schema.sql لتغطية الجداول المنشأة بعده.
create or replace function public.grant_supabase_defaults() returns void
language plpgsql as $$
begin
  execute 'grant all on all tables in schema public to anon, authenticated, service_role';
  execute 'grant all on all sequences in schema public to anon, authenticated, service_role';
  execute 'grant execute on all functions in schema public to anon, authenticated, service_role';
end $$;
