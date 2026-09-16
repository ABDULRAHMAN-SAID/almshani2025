-- ============================================================================
-- آخر تحديث للخادم — قوائم الأندية، ونقطة الخبر، ورمزٌ ينتهي، وجدول الرحلات
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
-- والصفّ بلا يوم وبنصّ ملاحظة هو محطّة بلا جدول ثابت («المزيونة: رحلة كل
-- أسبوعين»)، فتُحرَّر من الشاشة نفسها ولا تحتاج جدولًا ثانيًا.
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
  ('مصيرة','الخميس','C-130 · T92','[{"place":"السيب","depart":"14:00"},{"place":"مصيرة","arrive":"14:50","depart":"15:50"},{"place":"السيب","arrive":"16:40"}]'::jsonb,''),
  ('المزيونة','','','[]'::jsonb,'رحلة واحدة (CASA) كل أسبوعين')
) as seed (station, day, aircraft, stops, note)
where not exists (select 1 from public.flight_routes);


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

-- ============================================================================
-- تمّ. للتأكد من النادييْن:
--   select unnest(enum_range(null::activity_category));
-- ============================================================================
