-- ============================================================================
-- الأخبار — لصقة واحدة
-- ============================================================================
--
-- لمن أنشأ قاعدته قبل إضافة قسم الأخبار: هذا هو مقطع الأخبار وحده، مقتطعًا
-- من schema.sql، حتى لا يُعاد تنفيذ المخطّط كلّه من أجل جدول.
--
-- الاستعمال:
--   1. افتح مشروعك في supabase.com
--   2. SQL Editor ← New query
--   3. الصق هذا كلّه واضغط Run
--
-- وتنفيذه مرّتين لا يضرّ.
-- ============================================================================

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  body text not null default '',
  scope text not null check (scope in ('world', 'oman')),
  source text not null default '',
  url text,
  image text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists news_scope_published_idx on public.news (scope, published_at desc);

alter table public.news enable row level security;

-- القراءة للمنتسبين المسجَّلين وحدهم.
drop policy if exists "news read" on public.news;
create policy "news read" on public.news
  for select to authenticated using (true);

-- والكتابة للإدارة وحدها: الخبر في تطبيق رسمي مسؤولية تحريرية.
drop policy if exists "news admin write" on public.news;
create policy "news admin write" on public.news
  for all using (public.is_admin()) with check (public.is_admin());

select 'جدول الأخبار جاهز' as "النتيجة";
