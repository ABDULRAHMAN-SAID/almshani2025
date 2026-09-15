-- ============================================================================
-- آخر تحديث للخادم — النادِيان وقائمة طعامهما، ونقطة قراءة الخبر
-- ============================================================================
-- الصقه كاملًا في Supabase ← SQL Editor ← Run.
-- تنفيذه مرّتين لا يضرّ: كل جملة فيه تتخطّى ما هو موجود.
-- وهو يشمل ما في update-news-read.sql، فمن نفّذ ذاك فلا ضرر في تنفيذ هذا.
-- ============================================================================

-- ============ ١) قسمَا النادييْن ============
-- قيمتان جديدتان في تصنيف الأنشطة. تُنفَّذان وحدهما أوّلًا: بعض إصدارات
-- Postgres لا تسمح باستعمال قيمةٍ جديدة في نفس المعاملة التي أُضيفت فيها.
alter type activity_category add value if not exists 'OfficersClub';
alter type activity_category add value if not exists 'SeniorNcoClub';

-- ============ ٢) إعلانات خاصة بكل نادٍ ============
-- عمودٌ على جدول الإعلانات القائم: null للإعلان العام، واسم النادي لإعلانه.
alter table public.announcements add column if not exists club text;
do $$ begin
  alter table public.announcements add constraint announcements_club_check
    check (club is null or club in ('OfficersClub', 'SeniorNcoClub'));
exception when duplicate_object then null; end $$;
create index if not exists announcements_club_idx on public.announcements (club, published_at desc);

-- ============ ٣) الأندية: اسمها ووصفها وصورتها ============
-- تُحرَّر من داخل التطبيق لا من الشفرة.
create table if not exists public.clubs (
  key text primary key check (key in ('OfficersClub', 'SeniorNcoClub')),
  title text not null,
  subtitle text not null default '',
  image text,
  updated_at timestamptz not null default now()
);

insert into public.clubs (key, title, subtitle) values
  ('OfficersClub', 'نادي الضباط', 'مطعم النادي ومرافقه — قائمة طعام الأسبوع وإعلاناته'),
  ('SeniorNcoClub', 'نادي كبار ضباط الصف', 'مطعم النادي ومرافقه — قائمة طعام الأسبوع وإعلاناته')
on conflict (key) do nothing;

alter table public.clubs enable row level security;

drop policy if exists "clubs read" on public.clubs;
create policy "clubs read" on public.clubs
  for select to authenticated using (true);

drop policy if exists "clubs admin write" on public.clubs;
create policy "clubs admin write" on public.clubs
  for all using (public.is_admin()) with check (public.is_admin());

-- ============ ٤) قائمة طعام النادي ============
-- قائمة واحدة لكل نادٍ في الأسبوع: المفتاح الفريد (النادي، بداية الأسبوع)
-- يجعل نشرَ القائمة مرّتين تصحيحًا يحلّ محلّ الأول، لا قائمتين متراكمتين
-- يقرأ الناس أقدمهما.
create table if not exists public.club_menus (
  id uuid primary key default gen_random_uuid(),
  club text not null check (club in ('OfficersClub', 'SeniorNcoClub')),
  week_start date not null,
  image text,
  days jsonb not null default '[]'::jsonb,
  note text not null default '',
  published_at timestamptz not null default now(),
  unique (club, week_start)
);

create index if not exists club_menus_club_week_idx
  on public.club_menus (club, week_start desc);

alter table public.club_menus enable row level security;

drop policy if exists "club_menus read" on public.club_menus;
create policy "club_menus read" on public.club_menus
  for select to authenticated using (true);

drop policy if exists "club_menus admin write" on public.club_menus;
create policy "club_menus admin write" on public.club_menus
  for all using (public.is_admin()) with check (public.is_admin());

-- ============ ٥) سبب النقاط: قراءة خبر ============
alter type points_reason add value if not exists 'news_read';

-- ============ ٦) ما قرأه كلٌّ من الأخبار ============
-- المفتاح الأوّلي (القارئ، الخبر) هو ما يمنع منح النقطة مرّتين: الصفّ الثاني
-- يُرفض، فلا يصير زرّ «قرأته» عدّادًا يُضغط.
create table if not exists public.news_reads (
  user_id uuid not null references public.users (id) on delete cascade,
  news_id uuid not null references public.news (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, news_id)
);

create index if not exists news_reads_user_idx on public.news_reads (user_id);

alter table public.news_reads enable row level security;

drop policy if exists "news_reads read own" on public.news_reads;
create policy "news_reads read own" on public.news_reads
  for select to authenticated using (auth.uid() = user_id);
-- ولا سياسة كتابة: الإدراج لا يقع إلا داخل الدالة الموثوقة أدناه.

-- ============ ٧) الدالة التي تمنح النقطة ============
-- من الخادم لا من الهاتف: لو كان الهاتف هو من يكتب النقطة لكتبها من شاء كما
-- شاء بلا أن يفتح خبرًا. ونقطتان لا عشر: القراءة أيسر من الحضور ومن الإجابة
-- الصحيحة، وتسويتها بهما تجعل جمع النقاط بالضغط أربح من الحضور.
create or replace function public.mark_news_read(p_news_id uuid)
returns table (awarded boolean, points_earned integer)
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_points constant integer := 2;
begin
  if v_user is null then
    return query select false, 0;
    return;
  end if;
  if not exists (select 1 from news where id = p_news_id) then
    return query select false, 0;
    return;
  end if;

  begin
    insert into news_reads (user_id, news_id) values (v_user, p_news_id);
  exception when unique_violation then
    return query select false, 0;
    return;
  end;

  insert into points_transactions (user_id, reason, points)
  values (v_user, 'news_read', v_points);

  return query select true, v_points;
end $$;

grant execute on function public.mark_news_read(uuid) to authenticated;

-- ============================================================================
-- تمّ. للتأكد من النادييْن:
--   select unnest(enum_range(null::activity_category));
-- ============================================================================
