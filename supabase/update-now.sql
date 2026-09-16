-- ============================================================================
-- آخر تحديث للخادم — الأندية والرحلات والتوقيت والأصدقاء والمحادثات
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

-- ثلاث صور للقائمة بدل واحدة، ولكلٍّ نوع وجبتها:
--   [{"meal": "فطور", "image": "https://..."}, ...]
-- والعمود القديم image يبقى مكانه: من نشر قائمةً بصورة قبل هذا التحديث
-- تُقرأ صورته منه على أنّها الغداء، فلا تضيع.
alter table public.club_menus add column if not exists images jsonb not null default '[]'::jsonb;

-- ترميم جدولٍ أُنشئ على شكلٍ أقدم.
-- ‏create table if not exists لا يُصلح جدولًا موجودًا: إن كان أُنشئ مرّة بلا
-- المفتاح الفريد أو بلا عمود، تخطّته الجملة وبقي النقص. ونشرُ القائمة يقع
-- على المفتاح (النادي، بداية الأسبوع): بلا مفتاحٍ فريد عليهما يردّ الخادم
-- «لا مفتاح فريد يطابق ON CONFLICT» ولا تُنشر قائمة أبدًا.
alter table public.club_menus add column if not exists image text;
alter table public.club_menus add column if not exists days jsonb not null default '[]'::jsonb;
alter table public.club_menus add column if not exists note text not null default '';

do $$
declare v_club smallint; v_week smallint;
begin
  select attnum into v_club from pg_attribute
    where attrelid = 'public.club_menus'::regclass and attname = 'club';
  select attnum into v_week from pg_attribute
    where attrelid = 'public.club_menus'::regclass and attname = 'week_start';
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.club_menus'::regclass
      and contype = 'u'
      and conkey @> array[v_club, v_week]
      and array_length(conkey, 1) = 2
  ) then
    -- وصفوفٌ مكرّرة من قبل تمنع إنشاءه، فيبقى الأحدث لكل أسبوع وتُحذف سواه.
    -- والمعرّف يفصل عند تساوي وقت النشر: صفّان أُدرجا في اللحظة نفسها
    -- تاريخهما واحد، فالمقارنة به وحده لا تحذف أيًّا منهما ويبقى التكرار.
    delete from public.club_menus a using public.club_menus b
      where a.club = b.club and a.week_start = b.week_start
        and (a.published_at, a.id) < (b.published_at, b.id);
    alter table public.club_menus
      add constraint club_menus_club_week_key unique (club, week_start);
  end if;
end $$;


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


-- ============ ٨) رمز الحضور ينتهي في وقتٍ يحدّده الناشر ============
-- رمزٌ لا ينتهي يُصوَّر في القاعة ويُرسل إلى من لم يحضر، فتُحتسب له نقاط
-- حضورٍ لم يحضره — وهذا ما يجعل جدول النقاط كذبًا. فلكل رمز وقت انتهاء
-- يختاره من أنشأه، و‏null يعني رمزًا دائمًا كما كان.
alter table public.activity_checkin_codes add column if not exists expires_at timestamptz;

-- إنشاء رمز بمدّة. ترجع وقت الانتهاء ليُعرض على الشاشة كما حُفظ على الخادم
-- لا كما حُسب على الهاتف: ساعةُ الهاتف قد تكون مضبوطة على غير الحقيقة.
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

-- الرمز ووقت انتهائه معًا: شاشة الرمز تعرض الاثنين، وطلبهما بنداءين يجعل
-- أحدهما يصل قبل الآخر فيُعرض رمزٌ بلا وقت لحظةً ثم يقفز الوقت.
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

-- والحضور يُرفض بعد الوقت. ويُقال «انتهت صلاحيته» لا «رمز خاطئ»: الأول
-- يُفهم منه أن يطلب رمزًا جديدًا، والثاني يُفهم منه أنه أخطأ في الكتابة
-- فيعيدها عشرًا. والعمود الثالث يُضاف بلا ضرر على نسخة التطبيق القديمة:
-- هي تقرأ success و points_earned بأسمائهما وتتجاهل ما لم تعرفه.
drop function if exists public.submit_check_in(uuid, text, points_reason);
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

  if v_expires is not null and v_expires <= now() then
    return query select false, 0, true;
    return;
  end if;

  insert into activity_checkins (user_id, activity_id, code)
  values (auth.uid(), p_activity_id, upper(trim(p_code)))
  on conflict (user_id, activity_id) do nothing;

  if not found then
    return query select false, 0, false; -- سجّل حضوره من قبل
    return;
  end if;

  insert into points_transactions (user_id, reason, points, activity_id)
  values (auth.uid(), p_reason, v_points, p_activity_id);

  return query select true, v_points, false;
end;
$$;
grant execute on function public.submit_check_in(uuid, text, points_reason) to authenticated;


-- ============ ٩) جدول رحلات الطائرة ============
-- صفٌّ واحد لا أكثر: الجدول المعلّق في القاعدة واحد، يصدر «ساريًا حتى إشعار
-- آخر»، وإذا صدر غيره بطل الأول. ولو تراكمت الصفوف لقرأ بعض الناس جدولًا
-- أُبطل — والخطأ هنا رجلٌ يقف في المطار لرحلةٍ لا تُقلع. والقيد id = 1 هو
-- ما يجعل ذلك مستحيلًا لا متروكًا للانتباه.
create table if not exists public.flight_schedule (
  id smallint primary key default 1,
  title text not null default '',
  images jsonb not null default '[]'::jsonb,
  published_at timestamptz not null default now(),
  constraint flight_schedule_single_row check (id = 1)
);

alter table public.flight_schedule enable row level security;

drop policy if exists "flight_schedule read" on public.flight_schedule;
create policy "flight_schedule read" on public.flight_schedule
  for select to authenticated using (true);

drop policy if exists "flight_schedule admin write" on public.flight_schedule;
create policy "flight_schedule admin write" on public.flight_schedule
  for all using (public.is_admin()) with check (public.is_admin());


-- ============ ١٠) جدول الرحلات يُحرَّر من التطبيق ============
-- كان مكتوبًا في شفرة التطبيق، فلا يملك من يعرف الجدول تغيير رقمٍ فيه إلا
-- أن ينتظر تحديثًا. وصفٌّ لكل رحلة: محطّتها ويومها وطائرتها ومحطّات مسارها.
-- والصفّ بلا يوم وبنصّ ملاحظة هو محطّة بلا جدول ثابت، وقد حُذفت كلّها بطلبه:
-- الجدول لما يُعرف موعده، وما لا موعد له لا يُنتظر في مطار.
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

alter table public.flight_routes enable row level security;

drop policy if exists "flight_routes read" on public.flight_routes;
create policy "flight_routes read" on public.flight_routes
  for select to authenticated using (true);

drop policy if exists "flight_routes admin write" on public.flight_routes;
create policy "flight_routes admin write" on public.flight_routes
  for all using (public.is_admin()) with check (public.is_admin());

-- البذرة: ما في ورقة ١٩ سبتمبر ٢٠٢٦. وتُزرع مرّة واحدة — الشرط على الخلوّ
-- يمنع أن يعيد تنفيذُ الملفّ ما حذفه صاحبه أو يضاعف ما عدّله.
insert into public.flight_routes (station, day, aircraft, stops, note)
select * from (values
  ('خصب','الأحد','C-130 · T92','[{"place":"المصنعة","depart":"10:00"},{"place":"خصب","arrive":"10:50","depart":"11:50"},{"place":"المصنعة","arrive":"12:40"}]'::jsonb,''),
  ('خصب','الاثنين','C-130 · T44','[{"place":"المصنعة","depart":"09:00"},{"place":"خصب","arrive":"09:50","depart":"10:50"},{"place":"المصنعة","arrive":"11:40"}]'::jsonb,''),
  ('خصب','الأربعاء','CASA · T60','[{"place":"المصنعة","depart":"09:00"},{"place":"خصب","arrive":"09:50","depart":"10:50"},{"place":"المصنعة","arrive":"11:40"}]'::jsonb,''),
  ('خصب','الخميس','C-130 · T92','[{"place":"المصنعة","depart":"09:30"},{"place":"خصب","arrive":"10:20","depart":"11:20"},{"place":"المصنعة","arrive":"12:10"}]'::jsonb,''),
  ('ثمريت','الأحد','A BUS · 134','[{"place":"السيب","depart":"13:45"},{"place":"ثمريت","arrive":"14:55","depart":"15:55"},{"place":"السيب","arrive":"17:05"}]'::jsonb,''),
  ('ثمريت','الثلاثاء','A BUS · 134','[{"place":"السيب","depart":"09:00"},{"place":"ثمريت","arrive":"10:10","depart":"11:10"},{"place":"السيب","arrive":"12:20"}]'::jsonb,''),
  ('ثمريت','الأربعاء','C-130 · T92','[{"place":"السيب","depart":"11:30"},{"place":"ثمريت","arrive":"13:15","depart":"14:15"},{"place":"السيب","arrive":"16:00"}]'::jsonb,''),
  ('ثمريت','الخميس','A BUS · 134','[{"place":"السيب","depart":"09:00"},{"place":"ثمريت","arrive":"10:10","depart":"11:10"},{"place":"السيب","arrive":"12:20"}]'::jsonb,''),
  ('صلالة','الأحد','A BUS · 134','[{"place":"السيب","depart":"09:00"},{"place":"صلالة","arrive":"10:15","depart":"11:30"},{"place":"السيب","arrive":"12:45"}]'::jsonb,''),
  ('صلالة','الاثنين','A BUS · 134','[{"place":"السيب","depart":"12:20"},{"place":"صلالة","arrive":"13:35","depart":"14:50"},{"place":"السيب","arrive":"16:05"}]'::jsonb,''),
  ('صلالة','الثلاثاء','A BUS · 134','[{"place":"السيب","depart":"13:20"},{"place":"صلالة","arrive":"14:35","depart":"15:50"},{"place":"السيب","arrive":"17:05"}]'::jsonb,''),
  ('صلالة','الأربعاء','A BUS · 134','[{"place":"السيب","depart":"10:00"},{"place":"صلالة","arrive":"11:15","depart":"12:30"},{"place":"السيب","arrive":"13:45"}]'::jsonb,''),
  ('صلالة','الخميس','A BUS · 134','[{"place":"السيب","depart":"13:30"},{"place":"صلالة","arrive":"14:45","depart":"16:00"},{"place":"السيب","arrive":"17:15"}]'::jsonb,''),
  ('مصيرة','السبت','A BUS · 134','[{"place":"السيب","depart":"19:00"},{"place":"مصيرة","arrive":"19:40","depart":"20:40"},{"place":"السيب","arrive":"21:20"}]'::jsonb,''),
  ('مصيرة','الاثنين','A BUS · 134','[{"place":"السيب","depart":"09:00"},{"place":"مصيرة","arrive":"09:40","depart":"10:40"},{"place":"السيب","arrive":"11:20"}]'::jsonb,''),
  ('مصيرة','الثلاثاء','C-130 · T92','[{"place":"المصنعة","depart":"17:30"},{"place":"مصيرة","arrive":"18:20","depart":"19:20"},{"place":"المصنعة","arrive":"20:10"}]'::jsonb,''),
  ('مصيرة','الأربعاء','A BUS · 134','[{"place":"السيب","depart":"15:00"},{"place":"مصيرة","arrive":"15:40","depart":"16:40"},{"place":"السيب","arrive":"17:20"}]'::jsonb,''),
  ('مصيرة','الخميس','C-130 · T92','[{"place":"السيب","depart":"14:00"},{"place":"مصيرة","arrive":"14:50","depart":"15:50"},{"place":"السيب","arrive":"16:40"}]'::jsonb,'')
) as seed (station, day, aircraft, stops, note)
where not exists (select 1 from public.flight_routes);

-- المحطّات بلا جدول ثابت تُحذف — وحدها لا غير.
-- والشرط دقيق عمدًا: صفٌّ بلا يوم وبلا مسار وله نصّ ملاحظة. فالرحلات الثماني
-- عشرة كلّها لها يومٌ ومسار، فلا يمسّها هذا السطر بحال.
delete from public.flight_routes
where coalesce(day, '') = ''
  and coalesce(note, '') <> ''
  and coalesce(jsonb_array_length(stops), 0) = 0;


-- ============ ١١) فرق التقويم الهجري ============
-- ‏أم القرى تقويمٌ محسوب تُعلنه السعودية، وعُمان تُعلن برؤية مجالسها فتأتي
-- يومًا قبله غالبًا لا دائمًا. فالفرق رقمٌ على الخادم تضبطه الإدارة حين
-- يختلف مطلع الشهر، ويراه كل من فتح التطبيق — لا رقمٌ في الشفرة يُنتظر له
-- تحديث، ولا رقمٌ في جهاز الإداري وحده.
alter table public.app_settings add column if not exists hijri_offset smallint not null default -1;


-- ============ ١٢) وقت ظهور الإعلان والخبر واختفائه ============
-- الإعلان في القاعدة موقوت بطبعه: «التسجيل مفتوح حتى الخميس» يبقى معلّقًا
-- شهرًا بعد أن أُغلق التسجيل فيقرؤه من يظنّه قائمًا، وحذفُه في وقته عملٌ
-- يُنسى. فيُكتب الوقت مرّة عند النشر، ويتكفّل الباقي. و null في الأول يعني
-- «الآن»، وفي الثاني «لا يختفي».
alter table public.announcements add column if not exists starts_at timestamptz;
alter table public.announcements add column if not exists ends_at timestamptz;
alter table public.news add column if not exists starts_at timestamptz;
alter table public.news add column if not exists ends_at timestamptz;

create index if not exists announcements_window_idx on public.announcements (starts_at, ends_at);
create index if not exists news_window_idx on public.news (starts_at, ends_at);


-- ============ ١٣) الأصدقاء والمحادثات الخاصة والمجموعات ============
-- لا أحد يقرأ محادثةً ليس فيها: لا الإدارة ولا من عرف معرّفها. وهذا مفروضٌ
-- في الخادم بسياسات RLS لا في شاشات التطبيق — الشاشة تُخفي الزرّ ولا تمنع
-- الطلب. ولا يُراسِل إلا صديق.
-- ============ ١) الصداقة ============
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

/**
 * البحث عن عضو بالاسم — لإضافته صديقًا.
 *
 * ولا يُرجع رقم هاتف ولا بريدًا: الغرض أن تجد من تعرفه، لا أن يُستخرج دليل
 * القاعدة كاملًا. وحرفان لا يكفيان، والنتائج محدودة، فلا يُمسح الجدول كلّه
 * بحروف الهجاء.
 */
create or replace function public.search_members(p_query text)
returns table (id uuid, full_name text)
language sql security definer stable set search_path = public as $$
  select u.id, u.full_name
  from users u
  where length(coalesce(trim(p_query), '')) >= 3
    and u.id <> auth.uid()
    and u.full_name ilike '%' || trim(p_query) || '%'
  order by u.full_name
  limit 20;
$$;
grant execute on function public.search_members(text) to authenticated;

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


-- ============ ١٤) بنك أسئلة المسابقة ============
-- الأسئلة الأولى كانت «ما عاصمة عُمان؟» — يعرفها الصفّ الأول، فلا يُختبر بها
-- أحد ولا يُتعلَّم منها شيء، ويصير جدول النقاط ترتيبًا لمن فتح التطبيق أسرع.
-- وهذه أصعب: تسأل عن تفصيلٍ يُعرف بالقراءة، وعن الأمن بصورة موقفٍ يقع.
-- ستّة أسابيع، خمسة أسئلة لكل أسبوع، والأول مفتوح.
do $bank$
declare
  w uuid;
  v_start date := current_date;
begin
  ------------------------------------------------------------------ الأسبوع ١
  if not exists (select 1 from public.weekly_quizzes where week_label = 'الأسبوع ١ — عُمان والأمن') then
    -- مسابقة واحدة مفتوحة لا اثنتان: التطبيق يقرأ أحدث مفتوحة، فلو بقيت
    -- القديمة مفتوحة معها لظهر للناس أحدهما بلا قاعدة يعرفها أحد.
    update public.weekly_quizzes set status = 'closed' where status = 'open';

    insert into public.weekly_quizzes (week_label, start_date, end_date, status)
    values ('الأسبوع ١ — عُمان والأمن', v_start, v_start + 7, 'open')
    returning id into w;

    insert into public.quiz_questions (quiz_id, text, options, category, correct_option_index) values
      (w, 'أُدرجت أفلاج عُمان في قائمة اليونسكو للتراث العالمي سنة ٢٠٠٦. كم فلجًا منها المُدرَج؟',
       array['ثلاثة', 'خمسة', 'سبعة', 'عشرة'], 'تراث عُمان', 1),
      (w, 'أيّ هذه الموانئ العُمانية هو الأقرب إلى مضيق هرمز؟',
       array['ميناء صلالة', 'ميناء الدقم', 'ميناء خصب', 'ميناء صحار'], 'جغرافيا', 2),
      (w, 'وصلتك رسالة من رقم يقول إنه «الدعم الفني» ويطلب رمز التحقق الذي وصلك للتوّ لإصلاح حسابك. ما الصواب؟',
       array['ترسل الرمز لأنه من الدعم', 'ترسله بعد أن تسأله عن اسمه الكامل', 'لا ترسله لأحد مهما كان، ولو من الإدارة', 'ترسله من رقم زميل بدل رقمك'],
       'أمن المعلومات', 2),
      (w, 'ما اسم الرياح الموسمية التي تكسو ظفار بالخضرة بين يونيو وسبتمبر؟',
       array['الخريف', 'الصرب', 'الغيض', 'البارح'], 'ثقافة عُمانية', 0),
      (w, 'صورةٌ التقطتها داخل القاعدة وفيها لوحة تعليمات في الخلفية. أخطر ما فيها عند نشرها:',
       array['جودة الصورة', 'ما ظهر في الخلفية من معلومات', 'وقت النشر', 'عدد من يراها'],
       'أمن العمليات', 1);
  end if;

  ------------------------------------------------------------------ الأسبوع ٢
  if not exists (select 1 from public.weekly_quizzes where week_label = 'الأسبوع ٢ — تاريخ وسلامة') then
    insert into public.weekly_quizzes (week_label, start_date, end_date, status)
    values ('الأسبوع ٢ — تاريخ وسلامة', v_start + 7, v_start + 14, 'closed')
    returning id into w;

    insert into public.quiz_questions (quiz_id, text, options, category, correct_option_index) values
      (w, 'في أي عام تأسّس سلاح الجو السلطاني العُماني؟',
       array['١٩٥٩', '١٩٥٩ ثم أُعيد تنظيمه ١٩٧٠', '١٩٧٤', '١٩٨١'], 'تاريخ عسكري', 1),
      (w, 'أيّ هذه المدن العُمانية كانت عاصمةً في عهد اليعاربة؟',
       array['نزوى', 'مسقط', 'صحار', 'الرستاق'], 'تاريخ عُمان', 0),
      (w, 'عند اشتعال حريق كهربائي في مكتب، أي مطفأة تُستعمل؟',
       array['الماء', 'الرغوة', 'ثاني أكسيد الكربون', 'أيّ منها يصلح'],
       'السلامة العامة', 2),
      (w, 'سائقٌ أمامك انحرف فجأة وأنت على ١٢٠ كم/س. المسافة الآمنة تُقاس بـ:',
       array['طول سيارتين', 'ثانيتين على الأقل بينك وبينه', 'عشرة أمتار', 'ما يريحك'],
       'السلامة المرورية', 1),
      (w, 'وجدتَ ذاكرة USB في ساحة القاعدة. الصواب:',
       array['توصلها بحاسوبك لتعرف صاحبها', 'توصلها بحاسوب غير متصل بالشبكة', 'تسلّمها لأمن المعلومات بلا أن توصلها', 'تتركها مكانها'],
       'أمن المعلومات', 2);
  end if;

  ------------------------------------------------------------------ الأسبوع ٣
  if not exists (select 1 from public.weekly_quizzes where week_label = 'الأسبوع ٣ — طيران ومعرفة') then
    insert into public.weekly_quizzes (week_label, start_date, end_date, status)
    values ('الأسبوع ٣ — طيران ومعرفة', v_start + 14, v_start + 21, 'closed')
    returning id into w;

    insert into public.quiz_questions (quiz_id, text, options, category, correct_option_index) values
      (w, 'ماذا تعني «FOD» في مصطلحات سلامة الطيران؟',
       array['خللٌ في الوقود', 'أجسام غريبة تُتلف الطائرة', 'هبوط اضطراري', 'فحصٌ قبل الإقلاع'],
       'السلامة الجوية', 1),
      (w, 'أيّ هذه الجزر العُمانية هي الأكبر مساحة؟',
       array['مصيرة', 'الحلانيات', 'سلامة وبناتها', 'أم الغنم'], 'جغرافيا', 0),
      (w, 'ما اسم السفينة العُمانية التي أبحرت إلى الصين سنة ١٩٨٠ إحياءً لطريق تجاريّ قديم؟',
       array['شباب عُمان', 'صحار', 'فُلك السلامة', 'زينة البحار'], 'تراث عُمان', 1),
      (w, 'رابطٌ وصلك بعنوان يشبه موقع البنك لكن بحرفٍ زائد. هذه الحيلة اسمها:',
       array['التصيّد بالرابط المشابه', 'هجوم الحرمان من الخدمة', 'اعتراض الشبكة', 'برمجية الفدية'],
       'أمن المعلومات', 0),
      (w, 'كم عدد محافظات سلطنة عُمان؟',
       array['ثماني', 'تسع', 'إحدى عشرة', 'اثنتا عشرة'], 'جغرافيا', 2);
  end if;

  ------------------------------------------------------------------ الأسبوع ٤
  if not exists (select 1 from public.weekly_quizzes where week_label = 'الأسبوع ٤ — أمن وتراث') then
    insert into public.weekly_quizzes (week_label, start_date, end_date, status)
    values ('الأسبوع ٤ — أمن وتراث', v_start + 21, v_start + 28, 'closed')
    returning id into w;

    insert into public.quiz_questions (quiz_id, text, options, category, correct_option_index) values
      (w, 'أقوى هذه كلمات المرور:',
       array['Oman@2026', 'P@ssw0rd!', 'جملةٌ طويلة من أربع كلمات لا رابط بينها', 'اسمك ورقمك العسكري'],
       'أمن المعلومات', 2),
      (w, 'ما الصناعة الحرفية التي تشتهر بها ولاية بهلاء؟',
       array['الفخّار', 'الفضّة', 'السفن', 'النسيج'], 'تراث عُمان', 0),
      (w, 'زميلٌ يطلب منك حسابك لدقيقة لأن حسابه معطّل. الصواب:',
       array['تعطيه وتغيّر كلمة المرور بعدها', 'تعطيه وتقف بجانبه', 'ترفض وتدلّه على من يُصلح حسابه', 'تعطيه إن كان أعلى رتبة'],
       'أمن المعلومات', 2),
      (w, 'قلعة بهلاء المُدرجة في التراث العالمي بُنيت أساسًا في عهد:',
       array['اليعاربة', 'بني نبهان', 'البوسعيد', 'الصليبيين'], 'تاريخ عُمان', 1),
      (w, 'شبكة واي فاي عامة مفتوحة في مقهى. أخطر ما تفعله عليها:',
       array['قراءة الأخبار', 'الدخول إلى حسابك البنكي', 'مشاهدة مقطع', 'تحديث التطبيقات'],
       'أمن المعلومات', 1);
  end if;

  ------------------------------------------------------------------ الأسبوع ٥
  if not exists (select 1 from public.weekly_quizzes where week_label = 'الأسبوع ٥ — ميدان ومعلومة') then
    insert into public.weekly_quizzes (week_label, start_date, end_date, status)
    values ('الأسبوع ٥ — ميدان ومعلومة', v_start + 28, v_start + 35, 'closed')
    returning id into w;

    insert into public.quiz_questions (quiz_id, text, options, category, correct_option_index) values
      (w, 'في الرماية، ما المقصود بـ«التنفّس الصحيح» عند الضغط على الزناد؟',
       array['حبس النفس تمامًا', 'إخراج نصف الزفير ثم الثبات', 'التنفّس بسرعة', 'الشهيق العميق لحظة الضغط'],
       'الرماية', 1),
      (w, 'أيّ هذه المعلومات لا يجوز نشرها على مواقع التواصل إطلاقًا؟',
       array['صورة غروب من الشاطئ', 'موعد رحلة عسكرية وعدد ركّابها', 'صورة عائلية', 'خبر رياضي'],
       'أمن العمليات', 1),
      (w, 'ما أعلى قمة في سلطنة عُمان، وكم يبلغ ارتفاعها تقريبًا؟',
       array['الجبل الأخضر — ٢٠٠٠ م', 'جبل شمس — ٣٠٠٠ م', 'جبل سمحان — ١٨٠٠ م', 'جبل القرا — ١٥٠٠ م'],
       'جغرافيا', 1),
      (w, 'حسابٌ باسم ضابطٍ تعرفه يراسلك ويطلب تحويل مبلغ سريعًا. أول ما تفعله:',
       array['تحوّل المبلغ', 'تتصل به على رقمه المعروف لديك للتأكد', 'تسأله سؤالًا شخصيًّا في المحادثة', 'تتجاهل بلا إبلاغ'],
       'أمن المعلومات', 1),
      (w, 'في الإسعافات الأولية، الضغط على الصدر للبالغ يكون بعمق:',
       array['٢ سم', '٥ إلى ٦ سم', '١٠ سم', 'حسب حجم المصاب'],
       'السلامة العامة', 1);
  end if;

  ------------------------------------------------------------------ الأسبوع ٦
  if not exists (select 1 from public.weekly_quizzes where week_label = 'الأسبوع ٦ — عُمان في العالم') then
    insert into public.weekly_quizzes (week_label, start_date, end_date, status)
    values ('الأسبوع ٦ — عُمان في العالم', v_start + 35, v_start + 42, 'closed')
    returning id into w;

    insert into public.quiz_questions (quiz_id, text, options, category, correct_option_index) values
      (w, 'انضمّت سلطنة عُمان إلى الأمم المتحدة سنة:',
       array['١٩٧٠', '١٩٧١', '١٩٧٥', '١٩٨١'], 'تاريخ عُمان', 1),
      (w, 'أيّ هذه الدول لا تشترك مع عُمان في حدود برّية؟',
       array['الإمارات', 'السعودية', 'اليمن', 'قطر'], 'جغرافيا', 3),
      (w, 'اللبان الظفاري يُستخرج من شجرة:',
       array['السمر', 'البوسويليا', 'الغاف', 'النخيل'], 'تراث عُمان', 1),
      (w, 'ما الفرق بين «التشفير» و«كلمة المرور»؟',
       array['لا فرق', 'التشفير يجعل المحتوى غير مقروء لمن اعترضه، وكلمة المرور تمنع الدخول', 'التشفير أضعف', 'كلمة المرور تشفير أقوى'],
       'أمن المعلومات', 1),
      (w, 'تطبيقٌ على هاتفك يطلب صلاحية الوصول إلى جهات الاتصال والموقع وهو تطبيق حاسبة. الصواب:',
       array['تمنحه لأن التطبيق من المتجر', 'ترفض وتحذفه', 'تمنحه الموقع وحده', 'تمنحه ثم تسحبها لاحقًا'],
       'أمن المعلومات', 1);
  end if;
end
$bank$;

-- ============================================================================
-- تمّ. لرؤية ما أُدرج:
--   select week_label, status, (select count(*) from public.quiz_questions q
--     where q.quiz_id = w.id) as الأسئلة
--   from public.weekly_quizzes w order by start_date;
--
-- ولفتح أسبوعٍ وإغلاق ما سواه، من التطبيق: الإدارة ← المسابقة.
-- ============================================================================

-- ============================================================================
-- تمّ. للتأكد من النادييْن:
--   select unnest(enum_range(null::activity_category));
-- ============================================================================
