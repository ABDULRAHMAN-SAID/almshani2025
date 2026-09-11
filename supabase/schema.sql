-- أنشطتي | قاعدة صلالة الجوية — مخطط قاعدة البيانات (Supabase / Postgres)
-- ملاحظة: لا يحتوي أي جدول على رتبة، رقم عسكري، جهة عمل، أو أي معلومة حساسة.
--
-- الملف آمن للتكرار: نفّذه مرة أو عشرًا، والنتيجة واحدة ولا يفقد بيانات.
-- ولهذا ثمن في الشكل — الأنواع محروسة بكتل do، وكل سياسة يسبقها حذفٌ شرطي —
-- لكن ثمن غيابه أغلى: أول تنفيذ ناقص كان يترك القاعدة نصف مبنيّة، ثم يرفض كل
-- تنفيذ تالٍ إصلاحها بخطأ «النوع موجود أصلًا» فلا يبقى إلا حذف المشروع كله.

create extension if not exists "pgcrypto";

-- ============ التصنيفات (Enum) ============
do $$ begin
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
exception when duplicate_object then null;
end $$;

do $$ begin
  create type registration_status as enum ('open', 'closed', 'upcoming', 'ended', 'full');
exception when duplicate_object then null;
end $$;

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
do $$ begin
  create type points_reason as enum ('lecture_attendance', 'activity_participation', 'quiz_correct');
exception when duplicate_object then null;
end $$;

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
--
-- أمان: الرمز في جدول مستقل وليس عمودًا في activities، لأن activities مقروء
-- للجميع؛ لو كان الرمز فيه لاستطاع أي مستخدم قراءته ومنح نفسه نقاط حضور دون
-- أن يحضر. هذا الجدول عليه RLS بلا أي سياسة قراءة، فلا يصل إليه العميل إطلاقًا،
-- ولا تقرأه إلا الدوال الموثوقة (security definer) أدناه.
create table if not exists public.activity_checkin_codes (
  activity_id uuid primary key references public.activities (id) on delete cascade,
  code text not null,
  updated_at timestamptz not null default now()
);

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
-- بلا أي سياسة: لا قراءة ولا كتابة من العميل مهما كان، فقط الدوال الموثوقة.
alter table public.activity_checkin_codes enable row level security;
alter table public.weekly_quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;

-- المستخدم يرى ويعدّل صفّه فقط
drop policy if exists "users read own row" on public.users;
create policy "users read own row" on public.users
  for select using (auth.uid() = id);
drop policy if exists "users update own row" on public.users;
create policy "users update own row" on public.users
  for update using (auth.uid() = id);

-- قراءة عامة للمحتوى غير الحساس، الكتابة من الإدارة فقط (Service Role)
drop policy if exists "activities public read" on public.activities;
create policy "activities public read" on public.activities
  for select using (true);
drop policy if exists "activity_results public read" on public.activity_results;
create policy "activity_results public read" on public.activity_results
  for select using (true);
drop policy if exists "announcements public read" on public.announcements;
create policy "announcements public read" on public.announcements
  for select using (true);
drop policy if exists "awareness public read" on public.awareness_articles;
create policy "awareness public read" on public.awareness_articles
  for select using (true);

-- التسجيلات: كل مستخدم يرى ويُنشئ تسجيلاته فقط
drop policy if exists "registrations read own" on public.registrations;
create policy "registrations read own" on public.registrations
  for select using (auth.uid() = user_id);
drop policy if exists "registrations insert own" on public.registrations;
create policy "registrations insert own" on public.registrations
  for insert with check (auth.uid() = user_id);
drop policy if exists "registrations delete own" on public.registrations;
create policy "registrations delete own" on public.registrations
  for delete using (auth.uid() = user_id);

-- الإشعارات: كل مستخدم يرى إشعاراته فقط
drop policy if exists "notifications read own" on public.notifications;
create policy "notifications read own" on public.notifications
  for select using (auth.uid() = user_id);
drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications
  for update using (auth.uid() = user_id);

-- النقاط: كل مستخدم يرى سجلّه فقط (قائمة المتصدرين تُعرض عبر leaderboard_view أدناه)
drop policy if exists "points read own" on public.points_transactions;
create policy "points read own" on public.points_transactions
  for select using (auth.uid() = user_id);

drop policy if exists "checkins read own" on public.activity_checkins;
create policy "checkins read own" on public.activity_checkins
  for select using (auth.uid() = user_id);

drop policy if exists "quiz_answers read own" on public.quiz_answers;
create policy "quiz_answers read own" on public.quiz_answers
  for select using (auth.uid() = user_id);

-- ============ نظام النقاط: عروض ودوال موثوقة ============
-- ملاحظة أمان مهمة: لا نمنح قراءة عامة على quiz_questions لأنها تحتوي
-- correct_option_index. العميل يقرأ الأسئلة عبر هذا العرض الذي يخفي الإجابة الصحيحة،
-- والتحقق من الإجابة ومنح النقاط يتمّان فقط داخل دالة موثوقة على الخادم.
create or replace view public.quiz_questions_public as
  select id, quiz_id, text, options, category from public.quiz_questions;
grant select on public.quiz_questions_public to anon, authenticated;

-- قائمة المتصدرين: الاسم والمجموع فقط، بدون رقم الهاتف — تُنشأ بصلاحية
-- مالك الجدول فتتجاوز قيد "read own" الخاص بالنقاط، وهذا مقصود لأنها بيانات عامة.
create or replace view public.leaderboard_view as
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
  select code into v_expected from activity_checkin_codes where activity_id = p_activity_id;
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

-- ============ صلاحية الإدارة ============
-- مصدر الصلاحية الوحيد: الحساب مُدرج في جدول admins. لا يوجد في التطبيق أي رمز
-- يمنح صلاحية — اللوحة تسأل is_admin() قبل أن تُفتح، وكل كتابة إدارية تُفحص هنا
-- مرة أخرى بسياسة مستقلة. الإدراج والإزالة يتمّان من Supabase بيد مالك المشروع،
-- لا من داخل التطبيق، حتى لا يصبح فتح اللوحة على جهاز كافيًا لترقية حساب آخر.
create table if not exists public.admins (
  user_id uuid primary key references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "admins read own row" on public.admins;
create policy "admins read own row" on public.admins
  for select using (auth.uid() = user_id);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to authenticated;

-- تُعرَّف بعد is_admin() لأنها تستدعيها. الدالة security definer فلا تدور السياسة
-- على نفسها عند القراءة من admins.
-- الإداري يرى قائمة الإداريين كاملة — شاشة «الحسابات الإدارية» للقراءة فقط.
drop policy if exists "admins read all for admins" on public.admins;
create policy "admins read all for admins" on public.admins
  for select using (public.is_admin());

-- ويرى بيانات زملائه الإداريين وحدهم (الاسم والهاتف لعرضهما مقنّعين في اللوحة).
-- لا يفتح هذا قراءة بيانات بقية المستخدمين: الشرط يقصرها على من هو في admins.
drop policy if exists "users read admin peers" on public.users;
create policy "users read admin peers" on public.users
  for select using (
    public.is_admin()
    and exists (select 1 from public.admins a where a.user_id = users.id)
  );

-- كتابة المحتوى من لوحة الإدارة فقط
drop policy if exists "activities admin write" on public.activities;
create policy "activities admin write" on public.activities
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "activity_results admin write" on public.activity_results;
create policy "activity_results admin write" on public.activity_results
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "announcements admin write" on public.announcements;
create policy "announcements admin write" on public.announcements
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "awareness admin write" on public.awareness_articles;
create policy "awareness admin write" on public.awareness_articles
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "weekly_quizzes admin all" on public.weekly_quizzes;
create policy "weekly_quizzes admin all" on public.weekly_quizzes
  for all using (public.is_admin()) with check (public.is_admin());
-- ملاحظة: quiz_questions تبقى بلا قراءة عامة (العميل يقرأ العرض الذي يخفي الإجابة)،
-- والإدارة وحدها ترى الإجابة الصحيحة وتضيف الأسئلة.
drop policy if exists "quiz_questions admin all" on public.quiz_questions;
create policy "quiz_questions admin all" on public.quiz_questions
  for all using (public.is_admin()) with check (public.is_admin());

-- ============ دوال لوحة الإدارة ============
-- ضبط رمز الحضور لنشاط. لا يُقرأ الرمز إلا من هنا حتى لا يتسرّب عبر جدول عام.
create or replace function public.set_check_in_code(p_activity_id uuid, p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  insert into activity_checkin_codes (activity_id, code)
  values (p_activity_id, upper(trim(p_code)))
  on conflict (activity_id) do update set code = excluded.code, updated_at = now();
end;
$$;
grant execute on function public.set_check_in_code(uuid, text) to authenticated;

create or replace function public.get_check_in_code(p_activity_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  select code into v_code from activity_checkin_codes where activity_id = p_activity_id;
  return v_code;
end;
$$;
grant execute on function public.get_check_in_code(uuid) to authenticated;

-- أعداد المسجّلين لكل نشاط — أرقام مجمّعة فقط، بلا أسماء أو أرقام هواتف.
create or replace function public.admin_registration_counts()
returns table (activity_id uuid, registered integer)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return query
    select r.activity_id, count(*)::int
    from registrations r
    where r.status = 'confirmed'
    group by r.activity_id;
end;
$$;
grant execute on function public.admin_registration_counts() to authenticated;

-- إرسال إشعار لكل المستخدمين: صفّ لكل مستخدم في notifications.
create or replace function public.broadcast_notification(p_title text, p_body text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  insert into notifications (user_id, title, body)
  select id, p_title, p_body from users;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
grant execute on function public.broadcast_notification(text, text) to authenticated;

-- ============ تخزين الصور ============
-- حاوية عامة للقراءة، والرفع والحذف للإدارة فقط. الصور هنا غير حساسة
-- (أغلفة أنشطة وإعلانات ومقالات توعوية)، ولهذا القراءة مفتوحة.
insert into storage.buckets (id, name, public)
values ('activity-images', 'activity-images', true)
on conflict (id) do nothing;

drop policy if exists "activity images public read" on storage.objects;
create policy "activity images public read" on storage.objects
  for select using (bucket_id = 'activity-images');

drop policy if exists "activity images admin insert" on storage.objects;
create policy "activity images admin insert" on storage.objects
  for insert with check (bucket_id = 'activity-images' and public.is_admin());

drop policy if exists "activity images admin update" on storage.objects;
create policy "activity images admin update" on storage.objects
  for update using (bucket_id = 'activity-images' and public.is_admin());

drop policy if exists "activity images admin delete" on storage.objects;
create policy "activity images admin delete" on storage.objects
  for delete using (bucket_id = 'activity-images' and public.is_admin());

-- صورة اختيارية للإعلان (الأنشطة والمقالات لديها عمود الصورة أصلًا)
alter table public.announcements add column if not exists image text;

-- ============ مرفقات المستخدمين (صور، فيديو، صوت، ملفات) ============
-- حاوية منفصلة عن أغلفة الإدارة: هنا يرفع المستخدم المسجَّل مرفقات رسالته
-- أو مشاركته في مجموعة نقاشية. القراءة عامة لأن المرفق يظهر داخل نقاش عام،
-- والحذف لصاحب الملف أو الإدارة فقط.
insert into storage.buckets (id, name, public, file_size_limit)
values ('app-media', 'app-media', true, 26214400)
on conflict (id) do nothing;

drop policy if exists "app media public read" on storage.objects;
create policy "app media public read" on storage.objects
  for select using (bucket_id = 'app-media');

drop policy if exists "app media user insert" on storage.objects;
create policy "app media user insert" on storage.objects
  for insert with check (bucket_id = 'app-media' and auth.uid() is not null);

drop policy if exists "app media owner delete" on storage.objects;
create policy "app media owner delete" on storage.objects
  for delete using (bucket_id = 'app-media' and (owner = auth.uid() or public.is_admin()));

-- مرفقات الإعلان (فيديو أو مقطع صوتي أو ملف) — مخزّنة كوصف JSON للمرفقات
alter table public.announcements add column if not exists attachments jsonb not null default '[]'::jsonb;

-- ============ بيانات التواصل الرسمية ============
-- صف واحد فقط تقرأه كل الأجهزة، وتكتبه الإدارة. لا يحتوي أي رقم شخصي لمستخدم.
create table if not exists public.app_contact (
  id smallint primary key default 1,
  department text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  office text not null default '',
  hours text not null default '',
  updated_at timestamptz not null default now(),
  constraint app_contact_single_row check (id = 1)
);

alter table public.app_contact enable row level security;

drop policy if exists "contact public read" on public.app_contact;
create policy "contact public read" on public.app_contact
  for select using (true);

drop policy if exists "contact admin write" on public.app_contact;
create policy "contact admin write" on public.app_contact
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.app_contact (id) values (1) on conflict (id) do nothing;

-- ============ مراسلة الإدارة ============
-- قناة رسمية باتجاه واحد: المستخدم يكتب إلى قسم الأنشطة، والقسم يردّ.
-- لا يوجد أي مسار يجعل مستخدمًا يقرأ رسالة مستخدم آخر — تفرضه سياسات RLS أدناه،
-- ولا يُخزَّن رقم هاتف مع الرسالة، فالإدارة ترى الاسم فقط.
do $$ begin
  create type message_kind as enum ('اقتراح', 'طلب', 'استفسار', 'ملاحظة');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type message_status as enum ('new', 'read', 'answered');
exception when duplicate_object then null;
end $$;

create table if not exists public.user_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  user_name text not null,
  kind message_kind not null default 'اقتراح',
  subject text not null,
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  status message_status not null default 'new',
  reply_body text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_messages_user_idx on public.user_messages (user_id, created_at desc);

alter table public.user_messages enable row level security;

-- صاحب الرسالة يقرأ رسائله فقط؛ الإدارة تقرأ الكل.
drop policy if exists "messages read own or admin" on public.user_messages;
create policy "messages read own or admin" on public.user_messages
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "messages insert own" on public.user_messages;
create policy "messages insert own" on public.user_messages
  for insert with check (user_id = auth.uid());

-- التعديل للإدارة وحدها: لا يستطيع المستخدم تغيير حالة رسالته ولا كتابة رد باسم القسم.
drop policy if exists "messages admin update" on public.user_messages;
create policy "messages admin update" on public.user_messages
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "messages delete own or admin" on public.user_messages;
create policy "messages delete own or admin" on public.user_messages
  for delete using (user_id = auth.uid() or public.is_admin());

-- ردّ الإدارة: دالة موثوقة تكتب الرد وتضبط الحالة وتُرسل إشعارًا لصاحب الرسالة.
create or replace function public.reply_to_message(p_message_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_subject text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  update public.user_messages
     set reply_body = p_body,
         replied_at = now(),
         status = 'answered'
   where id = p_message_id
  returning user_id, subject into v_user, v_subject;

  if v_user is null then
    raise exception 'message not found';
  end if;

  insert into public.notifications (user_id, title, body)
  values (v_user, 'رد على رسالتك', concat('بخصوص: ', v_subject));
end;
$$;

-- ============ المجموعات النقاشية المُدارة ============
-- لوحة نقاش عامة حول موضوع نشاط. الحدود المقصودة:
--   • لا توجد رسائل خاصة ولا جدول أعضاء ولا أي عمود لرقم هاتف؛ الاسم فقط.
--   • المجموعة تُنشئها الإدارة وحدها، وتستطيع قفلها أو حذف أي مشاركة.
--   • كل مشاركة قابلة للإبلاغ، والبلاغات تظهر للإدارة فقط.
do $$ begin
  create type group_audience as enum ('all', 'registered');
exception when duplicate_object then null;
end $$;

create table if not exists public.discussion_groups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  topic text not null default '',
  description text not null default '',
  cover_image text,
  audience group_audience not null default 'all',
  activity_id uuid references public.activities(id) on delete set null,
  locked boolean not null default false,
  post_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.discussion_groups enable row level security;

drop policy if exists "groups public read" on public.discussion_groups;
create policy "groups public read" on public.discussion_groups
  for select using (true);

drop policy if exists "groups admin write" on public.discussion_groups;
create policy "groups admin write" on public.discussion_groups
  for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.discussion_groups(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  author_name text not null,
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  pinned boolean not null default false,
  report_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists group_posts_group_idx on public.group_posts (group_id, pinned desc, created_at desc);

alter table public.group_posts enable row level security;

drop policy if exists "posts public read" on public.group_posts;
create policy "posts public read" on public.group_posts
  for select using (true);

-- الكتابة: باسم المستخدم نفسه، في مجموعة غير مقفلة، وإن كانت مقيّدة بنشاط
-- فلا يكتب فيها إلا من سجّل في ذلك النشاط فعلًا.
drop policy if exists "posts insert own" on public.group_posts;
create policy "posts insert own" on public.group_posts
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1
        from public.discussion_groups g
       where g.id = group_id
         and g.locked = false
         and (
           g.audience = 'all'
           or exists (
             select 1
               from public.registrations r
              where r.activity_id = g.activity_id
                and r.user_id = auth.uid()
                and r.status = 'confirmed'
           )
         )
    )
  );

-- التثبيت للإدارة وحدها؛ لا يعدّل المستخدم مشاركته بعد نشرها (يحذفها ويكتب غيرها).
drop policy if exists "posts admin update" on public.group_posts;
create policy "posts admin update" on public.group_posts
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "posts delete own or admin" on public.group_posts;
create policy "posts delete own or admin" on public.group_posts
  for delete using (author_id = auth.uid() or public.is_admin());

-- عدّاد المشاركات في المجموعة يُحسب على الخادم لا في العميل.
create or replace function public.sync_group_post_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.discussion_groups
       set post_count = post_count + 1
     where id = new.group_id;
  elsif tg_op = 'DELETE' then
    update public.discussion_groups
       set post_count = greatest(0, post_count - 1)
     where id = old.group_id;
  end if;
  return null;
end;
$$;

drop trigger if exists group_posts_count on public.group_posts;
create trigger group_posts_count
  after insert or delete on public.group_posts
  for each row execute function public.sync_group_post_count();

-- بلاغات المشاركات: قيد الفرادة يمنع تكرار البلاغ من الشخص نفسه، فلا يستطيع
-- أحد رفع عدّاد البلاغات على مشاركة لا تعجبه.
create table if not exists public.group_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.group_posts(id) on delete cascade,
  reporter_id uuid not null references public.users(id) on delete cascade,
  reason text not null default '',
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

alter table public.group_post_reports enable row level security;

-- البلاغات للإدارة فقط: لا يرى المستخدم بلاغات غيره ولا حتى بلاغه بعد إرساله.
drop policy if exists "reports admin read" on public.group_post_reports;
create policy "reports admin read" on public.group_post_reports
  for select using (public.is_admin());

create or replace function public.report_group_post(p_post_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;

  insert into public.group_post_reports (post_id, reporter_id, reason)
  values (p_post_id, auth.uid(), coalesce(p_reason, ''))
  on conflict (post_id, reporter_id) do nothing;

  update public.group_posts
     set report_count = (
       select count(*) from public.group_post_reports where post_id = p_post_id
     )
   where id = p_post_id;
end;
$$;
