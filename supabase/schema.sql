-- أنشطتي | قاعة صلالة الجوية — مخطط قاعدة البيانات (Supabase / Postgres)
-- ملاحظة: لا يحتوي أي جدول على رتبة، رقم عسكري، جهة عمل، أو أي معلومة حساسة.

create extension if not exists "pgcrypto";

-- ============ التصنيفات (Enum) ============
create type activity_category as enum (
  'Cultural',
  'SecurityAwareness',
  'TrafficSafety',
  'AviationSafety',
  'Sports',
  'Shooting',
  'Lecture',
  'AntiDrugs',
  'GeneralSafety',
  'Announcement'
);

create type registration_status as enum ('open', 'closed', 'upcoming', 'ended', 'full');

-- ============ المستخدمون ============
-- ملحق auth.users من Supabase Auth (Phone OTP). هذا الجدول يحمل فقط الحقول العامة.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text not null unique,
  created_at timestamptz not null default now()
);

-- ============ الأنشطة (نشاط عام، مسابقة، محاضرة، رياضة، رماية...) ============
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category activity_category not null,
  cover_image text,
  date date not null,
  start_time time not null,
  end_time time,
  location text not null,
  capacity integer,
  registration_status registration_status not null default 'upcoming',
  registration_deadline timestamptz,
  is_annual boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists activities_date_idx on public.activities (date);
create index if not exists activities_category_idx on public.activities (category);

-- ============ نتائج المسابقة (اختياري، بعد الاعتماد) ============
create table if not exists public.activity_results (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  rank smallint not null check (rank between 1 and 3),
  winner_name text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (activity_id, rank)
);

-- ============ التسجيل في الأنشطة ============
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  status text not null default 'confirmed',
  registered_at timestamptz not null default now(),
  unique (user_id, activity_id)
);

-- ============ الإعلانات ============
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  type text not null default 'عام',
  published_at timestamptz not null default now()
);

-- ============ المحتوى التوعوي ============
create table if not exists public.awareness_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  content text not null,
  category text not null,
  image text,
  published_at timestamptz not null default now()
);

-- ============ الإشعارات ============
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, read);

-- ============ نظام النقاط (حضور، مشاركة، مسابقة ثقافية أسبوعية) ============
create type points_reason as enum ('lecture_attendance', 'activity_participation', 'quiz_correct');

-- قيمة موحّدة وبسيطة: 10 نقاط لكل سبب، بلا تفاوت بين الأسباب.
create table if not exists public.points_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  reason points_reason not null,
  points integer not null default 10,
  activity_id uuid references public.activities (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists points_transactions_user_idx on public.points_transactions (user_id);

-- رمز حضور يُعرض في القاعة (QR أو يُدخل يدويًا) لتأكيد حضور محاضرة/نشاط فعليًا
-- قبل منح نقاط 'lecture_attendance' / 'activity_participation'.
alter table public.activities add column if not exists check_in_code text;

create table if not exists public.activity_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  code text not null,
  checked_in_at timestamptz not null default now(),
  unique (user_id, activity_id)
);

-- الأسئلة الثقافية الأسبوعية
create table if not exists public.weekly_quizzes (
  id uuid primary key default gen_random_uuid(),
  week_label text not null,
  start_date date not null,
  end_date date not null,
  status registration_status not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.weekly_quizzes (id) on delete cascade,
  text text not null,
  options text[] not null,
  category text not null,
  correct_option_index smallint not null
);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  selected_option_index smallint not null,
  is_correct boolean not null,
  points_earned integer not null default 0,
  answered_at timestamptz not null default now(),
  unique (user_id, question_id)
);

-- ============ Row Level Security ============
alter table public.users enable row level security;
alter table public.activities enable row level security;
alter table public.activity_results enable row level security;
alter table public.registrations enable row level security;
alter table public.announcements enable row level security;
alter table public.awareness_articles enable row level security;
alter table public.notifications enable row level security;
alter table public.points_transactions enable row level security;
alter table public.activity_checkins enable row level security;
alter table public.weekly_quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;

-- المستخدم يرى ويعدّل صفّه فقط
create policy "users read own row" on public.users
  for select using (auth.uid() = id);
create policy "users update own row" on public.users
  for update using (auth.uid() = id);

-- قراءة عامة للمحتوى غير الحساس، الكتابة من الإدارة فقط (Service Role)
create policy "activities public read" on public.activities
  for select using (true);
create policy "activity_results public read" on public.activity_results
  for select using (true);
create policy "announcements public read" on public.announcements
  for select using (true);
create policy "awareness public read" on public.awareness_articles
  for select using (true);

-- التسجيلات: كل مستخدم يرى ويُنشئ تسجيلاته فقط
create policy "registrations read own" on public.registrations
  for select using (auth.uid() = user_id);
create policy "registrations insert own" on public.registrations
  for insert with check (auth.uid() = user_id);
create policy "registrations delete own" on public.registrations
  for delete using (auth.uid() = user_id);

-- الإشعارات: كل مستخدم يرى إشعاراته فقط
create policy "notifications read own" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications update own" on public.notifications
  for update using (auth.uid() = user_id);

-- النقاط: كل مستخدم يرى سجلّه فقط (قائمة المتصدرين تُعرض عبر leaderboard_view أدناه)
create policy "points read own" on public.points_transactions
  for select using (auth.uid() = user_id);

create policy "checkins read own" on public.activity_checkins
  for select using (auth.uid() = user_id);

create policy "quiz_answers read own" on public.quiz_answers
  for select using (auth.uid() = user_id);

-- ============ نظام النقاط: عروض ودوال موثوقة ============
-- ملاحظة أمان مهمة: لا نمنح قراءة عامة على quiz_questions لأنها تحتوي
-- correct_option_index. العميل يقرأ الأسئلة عبر هذا العرض الذي يخفي الإجابة الصحيحة،
-- والتحقق من الإجابة ومنح النقاط يتمّان فقط داخل دالة موثوقة على الخادم.
create view public.quiz_questions_public as
  select id, quiz_id, text, options, category from public.quiz_questions;
grant select on public.quiz_questions_public to anon, authenticated;

-- قائمة المتصدرين: الاسم والمجموع فقط، بدون رقم الهاتف — تُنشأ بصلاحية
-- مالك الجدول فتتجاوز قيد "read own" الخاص بالنقاط، وهذا مقصود لأنها بيانات عامة.
create view public.leaderboard_view as
  select u.id as user_id, u.full_name as name, coalesce(sum(pt.points), 0)::int as total_points
  from public.users u
  left join public.points_transactions pt on pt.user_id = u.id
  group by u.id, u.full_name
  order by total_points desc;
grant select on public.leaderboard_view to anon, authenticated;

-- التحقق من إجابة السؤال الثقافي ومنح النقاط (10 نقاط) عند الصواب — بمعزل عن العميل تمامًا
create or replace function public.submit_quiz_answer(p_question_id uuid, p_selected_option_index smallint)
returns table (is_correct boolean, points_earned integer)
language plpgsql security definer set search_path = public as $$
declare
  v_correct smallint;
  v_is_correct boolean;
  v_points integer := 0;
begin
  select correct_option_index into v_correct from quiz_questions where id = p_question_id;
  if v_correct is null then
    raise exception 'question not found';
  end if;
  v_is_correct := (v_correct = p_selected_option_index);
  if v_is_correct then v_points := 10; end if;

  insert into quiz_answers (user_id, question_id, selected_option_index, is_correct, points_earned)
  values (auth.uid(), p_question_id, p_selected_option_index, v_is_correct, v_points);

  if v_is_correct then
    insert into points_transactions (user_id, reason, points)
    values (auth.uid(), 'quiz_correct', v_points);
  end if;

  return query select v_is_correct, v_points;
end;
$$;
grant execute on function public.submit_quiz_answer(uuid, smallint) to authenticated;

-- تسجيل الحضور عبر رمز القاعة (QR أو إدخال يدوي) ومنح 10 نقاط عند أول تسجيل فقط
create or replace function public.submit_check_in(p_activity_id uuid, p_code text, p_reason points_reason default 'lecture_attendance')
returns table (success boolean, points_earned integer)
language plpgsql security definer set search_path = public as $$
declare
  v_expected text;
  v_points integer := 10;
begin
  select check_in_code into v_expected from activities where id = p_activity_id;
  if v_expected is null or v_expected <> p_code then
    return query select false, 0;
    return;
  end if;

  insert into activity_checkins (user_id, activity_id, code)
  values (auth.uid(), p_activity_id, p_code)
  on conflict (user_id, activity_id) do nothing;

  if not found then
    return query select false, 0; -- تم تسجيل الحضور مسبقًا
    return;
  end if;

  insert into points_transactions (user_id, reason, points, activity_id)
  values (auth.uid(), p_reason, v_points, p_activity_id);

  return query select true, v_points;
end;
$$;
grant execute on function public.submit_check_in(uuid, text, points_reason) to authenticated;
