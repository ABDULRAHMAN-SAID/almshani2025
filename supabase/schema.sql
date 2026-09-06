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

-- ============ Row Level Security ============
alter table public.users enable row level security;
alter table public.activities enable row level security;
alter table public.activity_results enable row level security;
alter table public.registrations enable row level security;
alter table public.announcements enable row level security;
alter table public.awareness_articles enable row level security;
alter table public.notifications enable row level security;

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
