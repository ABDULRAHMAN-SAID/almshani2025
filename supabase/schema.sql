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
    'OfficersClub',
    'SeniorNcoClub',
    'Announcement'
  );
exception when duplicate_object then null;
end $$;

-- لقاعدةٍ أُنشئت قبل هذه القيم: إضافتها إلى نوعٍ قائم. وadd value لا تقبل
-- do/exception، فتُكتب بـ if not exists وحدها.
alter type activity_category add value if not exists 'OfficersClub';
alter type activity_category add value if not exists 'SeniorNcoClub';

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

-- الدخول بكلمة مرور لا برمز SMS: الاسم يُجمع من ثلاثة حقول كما يُكتب في السجلّات،
-- والبريد يُحفظ هنا للعرض والاسترجاع بينما هويّة الحساب نفسها في auth.users.
-- ولا يقرأ مستخدمٌ صفَّ غيره — سياسة "users read own row" قائمة كما هي.
alter table public.users add column if not exists first_name text;
alter table public.users add column if not exists second_name text;
alter table public.users add column if not exists family_name text;
alter table public.users add column if not exists email text;

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
  -- نافذة الظهور: null في الأول تعني «الآن»، وفي الثاني «لا يختفي».
  starts_at timestamptz,
  ends_at timestamptz,
  published_at timestamptz not null default now()
);

create index if not exists announcements_window_idx on public.announcements (starts_at, ends_at);

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

-- ============ الأخبار (عالمية ومحلّية) ============
-- قسمٌ يقرأه المنتسبون وتكتبه الإدارة، كالإعلانات لا كالنقاش: الخبر في تطبيق
-- رسمي مسؤوليةٌ تحريرية، ومن يفتحه يقرأه على أنه منشور من القاعدة. فالنشر
-- بيد من يملك تلك المسؤولية. والمصدر حقل صريح لا زينة: خبرٌ بلا مصدر لا
-- يُوثَق، ومن أراد التفصيل ذهب إلى أصله.
create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  body text not null default '',
  scope text not null check (scope in ('world', 'oman')),
  source text not null default '',
  url text,
  image text,
  starts_at timestamptz,
  ends_at timestamptz,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists news_scope_published_idx on public.news (scope, published_at desc);
create index if not exists news_window_idx on public.news (starts_at, ends_at);

-- ما قرأه كلٌّ من الأخبار.
--
-- والجدول هو ما يجعل النقطة تُمنح مرّة واحدة: المفتاح الأوّلي (القارئ، الخبر)
-- يرفض الصفّ الثاني، فلا يكرّر أحدٌ فتح الخبر نفسه ليجمع نقاطًا. ولولاه لصار
-- زرّ «قرأته» عدّادًا يُضغط.
create table if not exists public.news_reads (
  user_id uuid not null references public.users (id) on delete cascade,
  news_id uuid not null references public.news (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, news_id)
);
create index if not exists news_reads_user_idx on public.news_reads (user_id);

-- ============ الأندية ============
-- اسم النادي ووصفه وصورته — تُحرَّر من داخل التطبيق لا من الشفرة.
--
-- والنادي مطعم ومكان راحة لفئة بعينها، لا قاعة فعاليات: وصفه يكتبه من يعرفه،
-- وصورته صورته هو لا تدرّجًا مولَّدًا. وجدولٌ من صفّين أهون من بناءٍ جديد كلّما
-- تغيّرت كلمة.
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

-- ============ قائمة طعام النادي ============
-- قائمة واحدة لكل نادٍ في الأسبوع — وهذا ما يفرضه المفتاح الفريد أدناه:
-- نشرُ قائمة الأسبوع مرّتين تصحيحٌ لا قائمتان، فيحلّ الثاني محلّ الأول بدل
-- أن يتراكما ويقرأ الناس القديمة.
--
-- والصورة والأيام كلاهما اختياري وكلاهما يكفي: من يصوّر الورقة المعلّقة
-- يرفع صورة، ومن يكتبها يكتبها، ومن شاء جمع بينهما.
create table if not exists public.club_menus (
  id uuid primary key default gen_random_uuid(),
  club text not null check (club in ('OfficersClub', 'SeniorNcoClub')),
  week_start date not null,
  -- صورة واحدة كانت هنا، وصارت ثلاثًا بأنواعها: [{"meal":"غداء","image":"..."}].
  -- والعمود القديم باقٍ لتُقرأ منه قائمةٌ نُشرت قبل التغيير.
  image text,
  images jsonb not null default '[]'::jsonb,
  days jsonb not null default '[]'::jsonb,
  note text not null default '',
  published_at timestamptz not null default now(),
  unique (club, week_start)
);

create index if not exists club_menus_club_week_idx
  on public.club_menus (club, week_start desc);

-- ============ جدول رحلات الطائرة ============
-- صفٌّ واحد: الجدول المعلّق في القاعدة واحد، وإذا صدر غيره بطل الأول.
create table if not exists public.flight_schedule (
  id smallint primary key default 1,
  title text not null default '',
  images jsonb not null default '[]'::jsonb,
  published_at timestamptz not null default now(),
  constraint flight_schedule_single_row check (id = 1)
);

-- ============ رحلات الطائرة ============
-- صفٌّ لكل رحلة، يُحرَّر من لوحة الإدارة. والصفّ بلا يوم وبنصّ ملاحظة هو
-- محطّة بلا جدول ثابت.
create table if not exists public.flight_routes (
  id uuid primary key default gen_random_uuid(),
  station text not null,
  day text not null default '',
  aircraft text not null default '',
  stops jsonb not null default '[]'::jsonb,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists flight_routes_day_idx on public.flight_routes (day);

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
  create type points_reason as enum ('lecture_attendance', 'activity_participation', 'quiz_correct', 'news_read');
exception when duplicate_object then null;
end $$;

-- قيمة موحّدة وبسيطة: 10 نقاط لكل سبب، بلا تفاوت بين الأسباب.
alter type points_reason add value if not exists 'news_read';

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
  -- وقت انتهاء الرمز، و null يعني رمزًا دائمًا. ورمزٌ لا ينتهي يُصوَّر في
  -- القاعة ويُرسل إلى من لم يحضر فتُحتسب له نقاط حضورٍ لم يحضره.
  expires_at timestamptz,
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
alter table public.news enable row level security;
alter table public.news_reads enable row level security;
alter table public.club_menus enable row level security;
alter table public.flight_schedule enable row level security;
alter table public.flight_routes enable row level security;
alter table public.clubs enable row level security;
alter table public.notifications enable row level security;
alter table public.points_transactions enable row level security;
alter table public.activity_checkins enable row level security;
-- بلا أي سياسة: لا قراءة ولا كتابة من العميل مهما كان، فقط الدوال الموثوقة.
alter table public.activity_checkin_codes enable row level security;
alter table public.weekly_quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;

-- ============ مفاتيح التشغيل ============
-- صفٌّ واحد يقرؤه كل جهاز، وتكتبه الإدارة وحدها.
--
-- كانت هذه المفاتيح محفوظة في ذاكرة جهاز الإداري: يطفئ المجموعات فتختفي الأزرار
-- عنده هو، ويبقى الخادم قابلًا للنشر عند بقية الناس. ومفتاحُ إيقافٍ لا يوقف
-- شيئًا ليس مفتاح إيقاف. فصارت هنا، وتُفرَض في سياسات الكتابة نفسها أدناه.
create table if not exists public.app_settings (
  id smallint primary key default 1,
  registration_enabled boolean not null default true,
  quiz_enabled boolean not null default true,
  points_enabled boolean not null default true,
  discussion_enabled boolean not null default true,
  messages_enabled boolean not null default true,
  -- فرق التقويم الهجري عن أم القرى بالأيام: عُمان يومٌ قبله غالبًا.
  hijri_offset smallint not null default -1,
  updated_at timestamptz not null default now(),
  constraint app_settings_single_row check (id = 1)
);

alter table public.app_settings enable row level security;

drop policy if exists "settings public read" on public.app_settings;
create policy "settings public read" on public.app_settings
  for select using (true);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

/** هل الميزة مفعّلة؟ تُستدعى من السياسات، فتقرأ الصفّ متجاوزةً RLS. */
create or replace function public.feature_enabled(p_feature text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    case p_feature
      when 'registration' then registration_enabled
      when 'quiz'         then quiz_enabled
      when 'points'       then points_enabled
      when 'discussion'   then discussion_enabled
      when 'messages'     then messages_enabled
      else true
    end,
    true)
  from public.app_settings where id = 1;
$$;

-- المستخدم يرى ويعدّل صفّه فقط
drop policy if exists "users read own row" on public.users;
create policy "users read own row" on public.users
  for select using (auth.uid() = id);

-- إنشاء الصفّ عند التسجيل. بدون هذه السياسة تُرفض كل عملية تسجيل بـ
-- «new row violates row-level security policy» — لأن RLS يمنع الإدراج ما لم
-- تسمح به سياسة صراحةً. والشرط يقصر ما يُنشئه المستخدم على صفّه هو، فلا
-- يستطيع أحد أن يكتب صفًّا باسم حساب آخر.
drop policy if exists "users insert own row" on public.users;
create policy "users insert own row" on public.users
  for insert with check (auth.uid() = id);

-- with check صراحةً إلى جانب using: الأولى تحدّد ما يُقرأ للتعديل، والثانية ما
-- يُقبل بعده. بغيرها لا يمنع شيءٌ تحويل الصفّ إلى هوية أخرى أثناء التعديل.
drop policy if exists "users update own row" on public.users;
create policy "users update own row" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

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
drop policy if exists "news read" on public.news;
-- للمسجَّلين وحدهم: المفتاح العام داخل ملفّ التطبيق، ولا داعي لأن يُقرأ ما
-- تنشره القاعدة لمنسوبيها من غير منتسب.
create policy "news read" on public.news
  for select to authenticated using (true);

drop policy if exists "awareness public read" on public.awareness_articles;
create policy "awareness public read" on public.awareness_articles
  for select using (true);

-- التسجيلات: كل مستخدم يرى ويُنشئ تسجيلاته فقط
drop policy if exists "registrations read own" on public.registrations;
create policy "registrations read own" on public.registrations
  for select using (auth.uid() = user_id);
drop policy if exists "registrations insert own" on public.registrations;
create policy "registrations insert own" on public.registrations
  for insert with check (auth.uid() = user_id and public.feature_enabled('registration'));
drop policy if exists "registrations delete own" on public.registrations;
create policy "registrations delete own" on public.registrations
  for delete using (auth.uid() = user_id);

-- الإشعارات: كل مستخدم يرى إشعاراته فقط
drop policy if exists "notifications read own" on public.notifications;
create policy "notifications read own" on public.notifications
  for select using (auth.uid() = user_id);
drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);


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
create or replace function public.submit_check_in(
  p_activity_id uuid, p_code text, p_reason points_reason default 'lecture_attendance'
)
returns table (success boolean, points_earned integer, expired boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_expected text;
  v_expires timestamptz;
  v_points integer := 10;
begin
  select c.code, c.expires_at into v_expected, v_expires
  from activity_checkin_codes c where c.activity_id = p_activity_id;

  if v_expected is null or v_expected <> upper(trim(p_code)) then
    return query select false, 0, false;
    return;
  end if;

  -- «انتهت صلاحيته» لا «رمز خاطئ»: الأول يُفهم منه أن يطلب رمزًا جديدًا،
  -- والثاني يُفهم منه أنه أخطأ في الكتابة فيعيدها عشرًا.
  if v_expires is not null and v_expires <= now() then
    return query select false, 0, true;
    return;
  end if;

  insert into activity_checkins (user_id, activity_id, code)
  values (auth.uid(), p_activity_id, upper(trim(p_code)))
  on conflict (user_id, activity_id) do nothing;

  if not found then
    return query select false, 0, false; -- تم تسجيل الحضور مسبقًا
    return;
  end if;

  insert into points_transactions (user_id, reason, points, activity_id)
  values (auth.uid(), p_reason, v_points, p_activity_id);

  return query select true, v_points, false;
end;
$$;
grant execute on function public.submit_check_in(uuid, text, points_reason) to authenticated;

-- ============ نقطة قراءة الخبر ============
-- تُمنح مرّة واحدة لكل خبر، ومن الخادم لا من الهاتف: لو كان الهاتف هو من
-- يكتب النقطة لكتبها من شاء كما شاء، بلا أن يفتح خبرًا.
--
-- ونقطتان لا عشر: القراءة أيسر من الحضور ومن الإجابة الصحيحة، وتسويتها بهما
-- تجعل جمع النقاط بالضغط أربح من الحضور.
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
    -- قرأه من قبل: لا نقطة ثانية، ولا خطأ — فتحُ خبرٍ مرّتين ليس خطأً.
    return query select false, 0;
    return;
  end;

  insert into points_transactions (user_id, reason, points)
  values (v_user, 'news_read', v_points);

  return query select true, v_points;
end $$;

grant execute on function public.mark_news_read(uuid) to authenticated;

drop policy if exists "flight_routes read" on public.flight_routes;
create policy "flight_routes read" on public.flight_routes
  for select to authenticated using (true);

drop policy if exists "flight_schedule read" on public.flight_schedule;
create policy "flight_schedule read" on public.flight_schedule
  for select to authenticated using (true);

drop policy if exists "clubs read" on public.clubs;
create policy "clubs read" on public.clubs
  for select to authenticated using (true);

drop policy if exists "club_menus read" on public.club_menus;
create policy "club_menus read" on public.club_menus
  for select to authenticated using (true);

drop policy if exists "news_reads read own" on public.news_reads;
create policy "news_reads read own" on public.news_reads
  for select to authenticated using (auth.uid() = user_id);
-- ولا سياسة كتابة: الإدراج لا يقع إلا داخل الدالة الموثوقة أعلاه.

-- ============ صلاحية الإدارة ============
-- مصدر الصلاحية الوحيد: الحساب مُدرج في جدول admins. لا يوجد في التطبيق أي رمز
-- يمنح صلاحية — اللوحة تسأل is_admin() قبل أن تُفتح، وكل كتابة إدارية تُفحص هنا
-- مرة أخرى بسياسة مستقلة. الإدراج والإزالة يتمّان من Supabase بيد مالك المشروع،
-- لا من داخل التطبيق، حتى لا يصبح فتح اللوحة على جهاز كافيًا لترقية حساب آخر.
create table if not exists public.admins (
  user_id uuid primary key references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ============ درجات الصلاحية ============
-- ثلاث درجات لا واحدة: من يدير الأنشطة ليس بالضرورة من يمنح الصلاحيات، ومَن
-- يكتب خبرًا ليس بالضرورة من يحذف حسابًا. وبلا تدرّج يصير كل تفويض تفويضًا
-- كاملًا، فيُمنع التفويض أصلًا ويبقى كل شيء بيد واحد.
--
--   owner   — المالك. يمنح ويسحب، ولا يُسحب منه. ولا يكون إلا واحدًا.
--   admin   — إدارة كاملة، ويمنح درجة editor ويسحبها.
--   editor  — المحتوى وحده: أخبار، إعلانات، توعية، أسئلة. لا صلاحيات ولا حسابات.
alter table public.admins add column if not exists role text not null default 'admin';
do $$ begin
  alter table public.admins add constraint admins_role_check
    check (role in ('owner', 'admin', 'editor'));
exception when duplicate_object then null; end $$;

-- أوّل حساب أُدرج هو المالك، ما لم يكن ثمّة مالك بالفعل. وبلا هذا يبقى مشروعٌ
-- أُنشئ قبل التدرّج بلا مالك، فلا يستطيع أحد أن يمنح شيئًا.
update public.admins set role = 'owner'
where user_id = (select user_id from public.admins order by created_at asc limit 1)
  and not exists (select 1 from public.admins where role = 'owner');
alter table public.admins enable row level security;
drop policy if exists "admins read own row" on public.admins;
create policy "admins read own row" on public.admins
  for select using (auth.uid() = user_id);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to authenticated;

-- ============ كتابة الرحلات والأندية: للإدارة وحدها ============
-- وموضعها هنا لا فوق مع سياسات القراءة: السياسة تستدعي is_admin()، و‏Postgres
-- يتحقّق من وجود الدالة وقت إنشاء السياسة لا وقت تنفيذها. فكانت هذه الأربع
-- مكتوبةً قبل تعريف الدالة، فيقف المخطّط عندها على قاعدة جديدة — ولا يُنشَأ
-- شيء ممّا بعدها: لا سياسات المحادثات ولا التوعية ولا حراسة المشرفين. وما
-- سُنّ بعد السطر الذي يفشل لا يحرس شيئًا.

drop policy if exists "flight_routes admin write" on public.flight_routes;
create policy "flight_routes admin write" on public.flight_routes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "flight_schedule admin write" on public.flight_schedule;
create policy "flight_schedule admin write" on public.flight_schedule
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "clubs admin write" on public.clubs;
create policy "clubs admin write" on public.clubs
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "club_menus admin write" on public.club_menus;
create policy "club_menus admin write" on public.club_menus
  for all using (public.is_admin()) with check (public.is_admin());

/** درجة الحساب الحالي، أو null إن لم يكن إداريًّا. */
create or replace function public.admin_role()
returns text language sql stable security definer set search_path = public as $$
  select role from admins where user_id = auth.uid();
$$;
grant execute on function public.admin_role() to authenticated;

/** من يملك إدارة كاملة: المالك والإداري، لا المحرّر. */
create or replace function public.is_full_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid() and role in ('owner', 'admin'));
$$;
grant execute on function public.is_full_admin() to authenticated;

-- ============ منح الصلاحيات وسحبها من داخل التطبيق ============
-- كانت شاشة «الحسابات الإدارية» تكتب في ذاكرة الجهاز وحدها: يظهر الاسم في
-- القائمة ولا يصل الخادم، فيظنّ من أضاف أنه فوّض ولم يفوّض. وشاشةٌ تُوهم بما
-- لا تفعله أسوأ من غيابها.
--
-- والدوال هنا security definer لأن الجدول مغلق على الكتابة: لا سياسة تسمح
-- لأحد بالإدراج مباشرة، فالمسار الوحيد هذه الدوال، وفيها تُفحص الدرجة.

/** يبحث عن عضو ببريده أو رقمه — للإدارة الكاملة وحدها. */
create or replace function public.find_member(p_query text)
returns table (user_id uuid, full_name text, phone text, email text, role text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_full_admin() then
    raise exception 'ليست لديك صلاحية البحث عن الأعضاء';
  end if;
  if length(coalesce(trim(p_query), '')) < 3 then
    raise exception 'اكتب ثلاثة أحرف على الأقل';
  end if;

  return query
    select u.id, u.full_name, u.phone, u.email, a.role
    from users u
    left join admins a on a.user_id = u.id
    where lower(u.email) = lower(trim(p_query))
       or replace(u.phone, ' ', '') like '%' || replace(trim(p_query), ' ', '') || '%'
       or u.full_name ilike '%' || trim(p_query) || '%'
    limit 10;
end;
$$;
grant execute on function public.find_member(text) to authenticated;

/** يمنح درجة. المالك يمنح ما شاء؛ والإداري يمنح editor وحدها. */
create or replace function public.grant_admin(p_user_id uuid, p_role text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_caller text := public.admin_role();
  v_target text;
begin
  if v_caller is null or v_caller = 'editor' then
    raise exception 'ليست لديك صلاحية منح الصلاحيات';
  end if;
  if p_role not in ('admin', 'editor') then
    -- درجة المالك لا تُمنح: تنتقل ولا تُنسخ، وإلا صار في المشروع مالكان
    -- يستطيع كلٌّ منهما سحب الآخر.
    raise exception 'الدرجة غير صحيحة';
  end if;
  if v_caller = 'admin' and p_role <> 'editor' then
    raise exception 'الإداري يمنح درجة المحرّر فقط';
  end if;
  if not exists (select 1 from users where id = p_user_id) then
    raise exception 'لا يوجد عضو بهذا المعرّف';
  end if;

  select role into v_target from admins where user_id = p_user_id;
  if v_target = 'owner' then
    raise exception 'لا تُغيَّر درجة المالك';
  end if;

  insert into admins (user_id, role) values (p_user_id, p_role)
  on conflict (user_id) do update set role = excluded.role;

  return p_role;
end;
$$;
grant execute on function public.grant_admin(uuid, text) to authenticated;

/** يسحب الصلاحية. ولا يُسحب من المالك، ولا يسحب أحدٌ من نفسه. */
create or replace function public.revoke_admin(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_caller text := public.admin_role();
  v_target text;
begin
  if v_caller is null or v_caller = 'editor' then
    raise exception 'ليست لديك صلاحية سحب الصلاحيات';
  end if;

  select role into v_target from admins where user_id = p_user_id;
  if v_target is null then
    return false;
  end if;
  if v_target = 'owner' then
    raise exception 'لا تُسحب صلاحية المالك';
  end if;
  -- ولا يسحب أحدٌ من نفسه: خطأٌ واحد يترك المشروع بلا من يديره.
  if p_user_id = auth.uid() then
    raise exception 'لا تسحب صلاحيتك من نفسك';
  end if;
  if v_caller = 'admin' and v_target <> 'editor' then
    raise exception 'الإداري يسحب درجة المحرّر فقط';
  end if;

  delete from admins where user_id = p_user_id;
  return true;
end;
$$;
grant execute on function public.revoke_admin(uuid) to authenticated;

-- تُعرَّف بعد is_admin() لأنها تستدعيها. الدالة security definer فلا تدور السياسة
-- على نفسها عند القراءة من admins.
-- الإداري يرى قائمة الإداريين كاملة — شاشة «الحسابات الإدارية» للقراءة فقط.
drop policy if exists "admins read all for admins" on public.admins;
create policy "admins read all for admins" on public.admins
  for select using (public.is_admin());

-- ويرى بيانات زملائه الإداريين وحدهم (الاسم والهاتف لعرضهما مقنّعين في اللوحة).
-- لا يفتح هذا قراءة بيانات بقية المستخدمين: الشرط يقصرها على من هو في admins.
-- كتابة مفاتيح التشغيل. موضعها هنا لا فوق: تستدعي is_admin()، ولا تسبق تعريفها.
-- ما يلي للإدارة الكاملة لا للمحرّر: مفاتيح التشغيل، والإشعارات المرسَلة،
-- وبيانات التواصل الرسمية، ومراسلات الأعضاء، والمجموعات وما يُبلَّغ فيها.
-- والمحرّر يبقى على المحتوى: الأنشطة والإعلانات والأخبار والتوعية والأسئلة.
drop policy if exists "settings admin write" on public.app_settings;
create policy "settings admin write" on public.app_settings
  for update using (public.is_full_admin()) with check (public.is_full_admin());

-- حذف إشعار مُرسَل من لوحة الإدارة. بدونها لا يُرفع خطأ — يحذف الأمرُ صفرَ صفوف
-- ويعود «ناجحًا»، فيظن الإداري أنه حذف شيئًا ولم يُحذف شيء.
-- وموضعها هنا لا فوق: السياسة تستدعي is_admin()، ولا يجوز أن تسبق تعريفها.
drop policy if exists "notifications admin delete" on public.notifications;
create policy "notifications admin delete" on public.notifications
  for delete using (public.is_full_admin());

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
drop policy if exists "news admin write" on public.news;
create policy "news admin write" on public.news
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

-- وبمدّة: ترجع وقت الانتهاء ليُعرض كما حُفظ على الخادم لا كما حُسب على
-- الهاتف — ساعةُ الهاتف قد تكون مضبوطة على غير الحقيقة.
create or replace function public.set_check_in_code(p_activity_id uuid, p_code text, p_minutes integer)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_expires timestamptz;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  v_expires := case
    when p_minutes is null or p_minutes <= 0 then null
    else now() + make_interval(mins => p_minutes)
  end;
  insert into activity_checkin_codes (activity_id, code, expires_at)
  values (p_activity_id, upper(trim(p_code)), v_expires)
  on conflict (activity_id) do update
    set code = excluded.code, expires_at = excluded.expires_at, updated_at = now();
  return v_expires;
end;
$$;
grant execute on function public.set_check_in_code(uuid, text, integer) to authenticated;

-- الرمز ووقت انتهائه معًا، بنداء واحد.
create or replace function public.get_check_in_code_info(p_activity_id uuid)
returns table (code text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return query
    select c.code, c.expires_at from activity_checkin_codes c where c.activity_id = p_activity_id;
end;
$$;
grant execute on function public.get_check_in_code_info(uuid) to authenticated;

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

-- النادي الذي يخصّه الإعلان، أو null للإعلان العام.
--
-- عمودٌ على الجدول القائم لا جدولٌ ثانٍ للأندية: الإعلان إعلان، وما يتغيّر
-- هو من يعنيه. ولو أُفرد لكلّ نادٍ جدولٌ لتضاعف كل ما يمرّ بالإعلانات —
-- الإشعارات، والبحث، والصفحة الرئيسية — بلا أن يختلف شيء في جوهره.
alter table public.announcements add column if not exists club text;
do $$ begin
  alter table public.announcements add constraint announcements_club_check
    check (club is null or club in ('OfficersClub', 'SeniorNcoClub'));
exception when duplicate_object then null; end $$;
create index if not exists announcements_club_idx on public.announcements (club, published_at desc);

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
  for all using (public.is_full_admin()) with check (public.is_full_admin());

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
  for select using (user_id = auth.uid() or public.is_full_admin());

drop policy if exists "messages insert own" on public.user_messages;
create policy "messages insert own" on public.user_messages
  for insert with check (public.feature_enabled('messages') and user_id = auth.uid());

-- التعديل للإدارة وحدها: لا يستطيع المستخدم تغيير حالة رسالته ولا كتابة رد باسم القسم.
drop policy if exists "messages admin update" on public.user_messages;
create policy "messages admin update" on public.user_messages
  for update using (public.is_full_admin()) with check (public.is_full_admin());

drop policy if exists "messages delete own or admin" on public.user_messages;
create policy "messages delete own or admin" on public.user_messages
  for delete using (user_id = auth.uid() or public.is_full_admin());

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
  for all using (public.is_full_admin()) with check (public.is_full_admin());

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
    public.feature_enabled('discussion')
    and author_id = auth.uid()
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
  for update using (public.is_full_admin()) with check (public.is_full_admin());

drop policy if exists "posts delete own or admin" on public.group_posts;
create policy "posts delete own or admin" on public.group_posts
  for delete using (author_id = auth.uid() or public.is_full_admin());

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
  for select using (public.is_full_admin());

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

-- ============ الأصدقاء والمحادثات الخاصة والمجموعات ============

-- صفٌّ واحد للعلاقة، لا صفّ لكل طرف: طلبٌ من أ إلى ب، يقبله ب أو يتركه.
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users (id) on delete cascade,
  addressee_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (requester_id, addressee_id),
  constraint friendships_not_self check (requester_id <> addressee_id)
);

create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status);

alter table public.friendships enable row level security;

drop policy if exists "friendships read own" on public.friendships;
create policy "friendships read own" on public.friendships
  for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "friendships request" on public.friendships;
create policy "friendships request" on public.friendships
  for insert to authenticated
  with check (auth.uid() = requester_id);

-- الردّ لمن وُجّه إليه الطلب وحده. والحاجب يحجب من طرفه هو.
drop policy if exists "friendships respond" on public.friendships;
create policy "friendships respond" on public.friendships
  for update to authenticated
  using (auth.uid() = addressee_id or auth.uid() = requester_id)
  with check (auth.uid() = addressee_id or auth.uid() = requester_id);

drop policy if exists "friendships remove" on public.friendships;
create policy "friendships remove" on public.friendships
  for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

/** هل بينهما صداقة مقبولة؟ */
create or replace function public.are_friends(p_a uuid, p_b uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from friendships f
    where f.status = 'accepted'
      and ((f.requester_id = p_a and f.addressee_id = p_b)
        or (f.requester_id = p_b and f.addressee_id = p_a))
  );
$$;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- ============ ٢) المحادثات ============
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind in ('direct', 'group')),
  title text not null default '',
  image text,
  created_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists conversation_members_user_idx
  on public.conversation_members (user_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  body text not null default '',
  image text,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_conversation_idx
  on public.chat_messages (conversation_id, created_at desc);

/**
 * هل أنا عضوٌ في هذه المحادثة؟
 *
 * ‏security definer عمدًا: لو قرأت السياسةُ جدولَ الأعضاء مباشرةً لاستدعت
 * سياسةَ ذلك الجدول التي تقرأ الجدول نفسه — فتدور الحلقة ويرفض الخادم كل
 * طلب. والدالة تتخطّى RLS لأنها تقرأ سطرًا واحدًا عن صاحب الطلب نفسه.
 */
create or replace function public.is_chat_member(p_conversation uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from conversation_members m
    where m.conversation_id = p_conversation and m.user_id = auth.uid()
  );
$$;
grant execute on function public.is_chat_member(uuid) to authenticated;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "conversations read mine" on public.conversations;
create policy "conversations read mine" on public.conversations
  for select to authenticated using (public.is_chat_member(id));

-- العنوان والصورة لصاحب المجموعة وحده.
drop policy if exists "conversations owner edits" on public.conversations;
create policy "conversations owner edits" on public.conversations
  for update to authenticated
  using (auth.uid() = created_by) with check (auth.uid() = created_by);

drop policy if exists "conversations owner deletes" on public.conversations;
create policy "conversations owner deletes" on public.conversations
  for delete to authenticated using (auth.uid() = created_by);

drop policy if exists "members read mine" on public.conversation_members;
create policy "members read mine" on public.conversation_members
  for select to authenticated using (public.is_chat_member(conversation_id));

-- الخروج من المحادثة حقُّ صاحبه، والإخراجُ لصاحب المجموعة.
drop policy if exists "members leave" on public.conversation_members;
create policy "members leave" on public.conversation_members
  for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from conversations c where c.id = conversation_id and c.created_by = auth.uid())
  );

drop policy if exists "members mark read" on public.conversation_members;
create policy "members mark read" on public.conversation_members
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "messages read mine" on public.chat_messages;
create policy "messages read mine" on public.chat_messages
  for select to authenticated using (public.is_chat_member(conversation_id));

drop policy if exists "messages send" on public.chat_messages;
create policy "messages send" on public.chat_messages
  for insert to authenticated
  with check (auth.uid() = sender_id and public.is_chat_member(conversation_id));

-- الحذف لكاتبها وحده. ولا تعديل: رسالةٌ تُقرأ ثم تُبدَّل تُنكر على قارئها.
drop policy if exists "messages delete own" on public.chat_messages;
create policy "messages delete own" on public.chat_messages
  for delete to authenticated using (auth.uid() = sender_id);

-- ============ ٣) بدء المحادثات ============
-- إنشاء المحادثة وإضافة أعضائها معًا في دالة واحدة: لو تُركا للعميل لأمكن
-- أن تُنشأ محادثة بلا أعضاء، أو أن يُضاف إليها من لم يُصادق.

/** محادثة ثنائية مع صديق — تُرجع القائمة إن وُجدت، وتُنشئها إن لم توجد. */
create or replace function public.start_direct_chat(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
begin
  if v_me is null or p_other is null or v_me = p_other then
    raise exception 'invalid';
  end if;
  if not public.are_friends(v_me, p_other) then
    raise exception 'not friends';
  end if;

  select c.id into v_id
  from conversations c
  where c.kind = 'direct'
    and exists (select 1 from conversation_members m where m.conversation_id = c.id and m.user_id = v_me)
    and exists (select 1 from conversation_members m where m.conversation_id = c.id and m.user_id = p_other)
  limit 1;
  if v_id is not null then
    return v_id;
  end if;

  insert into conversations (kind, created_by) values ('direct', v_me) returning id into v_id;
  insert into conversation_members (conversation_id, user_id, role)
  values (v_id, v_me, 'owner'), (v_id, p_other, 'member');
  return v_id;
end $$;
grant execute on function public.start_direct_chat(uuid) to authenticated;

/** مجموعة باسمها وأعضائها — ولا يُضاف إلا صديق. */
create or replace function public.create_group_chat(p_title text, p_members uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
  v_member uuid;
begin
  if v_me is null then
    raise exception 'unauthenticated';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'title required';
  end if;

  insert into conversations (kind, title, created_by)
  values ('group', trim(p_title), v_me) returning id into v_id;
  insert into conversation_members (conversation_id, user_id, role) values (v_id, v_me, 'owner');

  foreach v_member in array coalesce(p_members, array[]::uuid[]) loop
    if v_member <> v_me and public.are_friends(v_me, v_member) then
      insert into conversation_members (conversation_id, user_id) values (v_id, v_member)
      on conflict do nothing;
    end if;
  end loop;

  return v_id;
end $$;
grant execute on function public.create_group_chat(text, uuid[]) to authenticated;

/** إضافة صديق إلى مجموعة — لصاحبها وحده. */
create or replace function public.add_group_member(p_conversation uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if not exists (
    select 1 from conversations c
    where c.id = p_conversation and c.created_by = v_me and c.kind = 'group'
  ) then
    raise exception 'forbidden';
  end if;
  if not public.are_friends(v_me, p_user) then
    raise exception 'not friends';
  end if;
  insert into conversation_members (conversation_id, user_id)
  values (p_conversation, p_user) on conflict do nothing;
end $$;
grant execute on function public.add_group_member(uuid, uuid) to authenticated;



/** أصدقائي: المقبولون من الطرفين، بأسمائهم. */
create or replace function public.my_friends()
returns table (id uuid, full_name text)
language sql security definer stable set search_path = public as $$
  select u.id, u.full_name
  from friendships f
  join users u on u.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where f.status = 'accepted'
    and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  order by u.full_name;
$$;
grant execute on function public.my_friends() to authenticated;

/** الطلبات الواردة إليّ، بأسماء أصحابها. */
create or replace function public.my_friend_requests()
returns table (id uuid, user_id uuid, full_name text, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select f.id, u.id, u.full_name, f.created_at
  from friendships f
  join users u on u.id = f.requester_id
  where f.addressee_id = auth.uid() and f.status = 'pending'
  order by f.created_at desc;
$$;
grant execute on function public.my_friend_requests() to authenticated;

/**
 * محادثاتي: عنوانها وآخر رسالة فيها وعدد ما لم أقرأه.
 *
 * والعنوان في الثنائية اسم الطرف الآخر لا عنوانٌ مخزّن: لو خُزّن لبقي كما
 * كُتب يوم أُنشئت المحادثة ولو غيّر صاحبه اسمه.
 */
create or replace function public.my_conversations()
returns table (
  id uuid, kind text, title text, image text,
  last_message text, last_message_at timestamptz, unread integer
)
language sql security definer stable set search_path = public as $$
  select
    c.id, c.kind,
    case
      when c.kind = 'group' then c.title
      else coalesce((
        select u.full_name from conversation_members m2
        join users u on u.id = m2.user_id
        where m2.conversation_id = c.id and m2.user_id <> auth.uid()
        limit 1
      ), 'محادثة')
    end as title,
    c.image,
    coalesce((
      select case when msg.image is not null and msg.body = '' then 'صورة' else msg.body end
      from chat_messages msg where msg.conversation_id = c.id
      order by msg.created_at desc limit 1
    ), '') as last_message,
    c.last_message_at,
    (
      select count(*)::int from chat_messages msg
      where msg.conversation_id = c.id
        and msg.sender_id <> auth.uid()
        and msg.created_at > me.last_read_at
    ) as unread
  from conversations c
  join conversation_members me on me.conversation_id = c.id and me.user_id = auth.uid()
  order by c.last_message_at desc;
$$;
grant execute on function public.my_conversations() to authenticated;

/** أعضاء محادثة — لمن هو فيها. */
create or replace function public.conversation_people(p_conversation uuid)
returns table (id uuid, full_name text, role text)
language sql security definer stable set search_path = public as $$
  select u.id, u.full_name, m.role
  from conversation_members m
  join users u on u.id = m.user_id
  where m.conversation_id = p_conversation
    and public.is_chat_member(p_conversation)
  order by case when m.role = 'owner' then 0 else 1 end, u.full_name;
$$;
grant execute on function public.conversation_people(uuid) to authenticated;

-- وقت آخر رسالة يُحدَّث بمحفّز لا من الهاتف: ترتيب القائمة يعتمد عليه،
-- ولو كُتب من العميل لرفع أحدهم محادثته إلى الأعلى بلا أن يكتب شيئًا.
create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists chat_messages_touch on public.chat_messages;
create trigger chat_messages_touch after insert on public.chat_messages
  for each row execute function public.touch_conversation();

-- ============ ٤) البلاغ عن رسالة ============
-- المحادثة الخاصة لا تُقرأ من أحد، فالبلاغ هو الباب الوحيد: من أُسيء إليه
-- يرفع نصّ الرسالة إلى الإدارة بنفسه، فتراها وحدها لا المحادثة كلّها.
create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.chat_messages (id) on delete set null,
  reporter_id uuid not null references public.users (id) on delete cascade,
  reported_user_id uuid references public.users (id) on delete set null,
  body text not null default '',
  reason text not null default '',
  created_at timestamptz not null default now()
);

alter table public.chat_reports enable row level security;

drop policy if exists "chat_reports insert own" on public.chat_reports;
create policy "chat_reports insert own" on public.chat_reports
  for insert to authenticated with check (auth.uid() = reporter_id);

drop policy if exists "chat_reports admin read" on public.chat_reports;
create policy "chat_reports admin read" on public.chat_reports
  for select using (public.is_admin());

/** رفع بلاغ: يُنسخ نصّ الرسالة وقت البلاغ، فحذفها بعده لا يمحو الدليل. */
create or replace function public.report_chat_message(p_message uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_body text; v_sender uuid;
begin
  if not exists (
    select 1 from chat_messages m
    where m.id = p_message and public.is_chat_member(m.conversation_id)
  ) then
    raise exception 'forbidden';
  end if;
  select m.body, m.sender_id into v_body, v_sender from chat_messages m where m.id = p_message;
  insert into chat_reports (message_id, reporter_id, reported_user_id, body, reason)
  values (p_message, auth.uid(), v_sender, coalesce(v_body, ''), coalesce(trim(p_reason), ''));
end $$;
grant execute on function public.report_chat_message(uuid, text) to authenticated;

-- ============ ٥) مفتاح التشغيل ============
-- الدردشة تُطفأ من لوحة الإدارة كبقية الميزات.
alter table public.app_settings add column if not exists chat_enabled boolean not null default true;
-- الطقس: مفتاحه هنا لا في الجهاز، فإيقافه يُخفيه عن الجميع ويمنع التطبيق
-- من طلب موقع أحد.
alter table public.app_settings add column if not exists weather_enabled boolean not null default true;

-- ============ رمز الحساب: الإضافة بالرمز لا بالاسم ============
-- الأسماء تتشابه في القاعدة: ثلاثة يحملون الاسم نفسه، فمن يضيف صديقًا بالاسم
-- يضيف غيره. والبحث بالاسم بابٌ آخر: من كتب حرفين استخرج قائمة بمن في
-- القاعدة. فلكل حساب رمزٌ من ستّة يعطيه صاحبه لمن يريد، ولا يُعرف إلا منه.
alter table public.users add column if not exists code text;

/** رمز من ستّة، بلا الحروف الملتبسة (O و0 و I و1) — يُملى صوتًا ويُكتب بلا خطأ. */
create or replace function public.generate_member_code()
returns text language plpgsql as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_try integer := 0;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.users u where u.code = v_code);
    v_try := v_try + 1;
    if v_try > 50 then
      raise exception 'could not generate code';
    end if;
  end loop;
  return v_code;
end $$;

-- من سجّل قبل هذا التحديث يأخذ رمزه الآن.
update public.users set code = public.generate_member_code() where code is null;

create unique index if not exists users_code_idx on public.users (code);

-- والحسابات الجديدة تأخذه عند إنشائها: لو تُرك للتطبيق لبقي حسابٌ بلا رمز
-- كلّما أُنشئ من غير مساره.
create or replace function public.set_member_code()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.code is null or trim(new.code) = '' then
    new.code := public.generate_member_code();
  end if;
  return new;
end $$;

drop trigger if exists users_set_code on public.users;
create trigger users_set_code before insert on public.users
  for each row execute function public.set_member_code();

/**
 * البحث عن عضو برمزه — تطابقٌ تامّ لا جزئي.
 *
 * ويُرجع الاسم والرمز وحدهما: لا هاتف ولا بريد. ومن لا يملك الرمز لا يصل
 * إلى شيء — وهذا هو الفرق بين أن تُضيف من تعرفه وأن يُستخرج دليل القاعدة.
 */
create or replace function public.find_member_by_code(p_code text)
returns table (id uuid, full_name text, code text)
language sql security definer stable set search_path = public as $$
  select u.id, u.full_name, u.code
  from users u
  where length(coalesce(trim(p_code), '')) = 6
    and upper(trim(p_code)) = u.code
    and u.id <> auth.uid()
  limit 1;
$$;
grant execute on function public.find_member_by_code(text) to authenticated;

/** رمزي أنا — يُعرض في حسابي لأُعطيه من يريد إضافتي. */
create or replace function public.my_member_code()
returns text language sql security definer stable set search_path = public as $$
  select u.code from users u where u.id = auth.uid();
$$;
grant execute on function public.my_member_code() to authenticated;


