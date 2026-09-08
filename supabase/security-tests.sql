-- ============================================================================
-- أنشطتي | قاعدة صلالة الجوية — اختبارات صلاحيات عدائية
-- ============================================================================
--
-- الغرض: إثبات أن سياسات RLS تمنع فعلًا ما صُمّمت لمنعه، على قاعدة بيانات
-- حقيقية — لا الاكتفاء بأن البيانات التجريبية تعمل.
--
-- كيف تشغّله:
--   1. نفّذ supabase/schema.sql أولًا.
--   2. سجّل الدخول من التطبيق بحسابين مختلفين (A و B)، كلاهما مستخدم عادي
--      وليس في جدول admins.
--   3. من Supabase → SQL Editor نفّذ:  select id, phone from public.users;
--      وانسخ المعرّفين.
--   4. ضع المعرّفين في السطرين المعلَّمين أدناه، ثم نفّذ هذا الملف كاملًا.
--   5. اقرأ الجدول الناتج: كل صفّ إمّا ✅ نجح أو ❌ فشل.
--
-- الأمان: الاختبار لا يغيّر شيئًا. كل محاولة كتابة تُنفَّذ داخل كتلة تُلغى
-- بعدها مباشرةً، حتى لو نجحت المحاولة (ونجاحها هو الفشل الذي نبحث عنه).
--
-- تفسير النتيجة:
--   ❌ في أي صفّ من قسم «الهجمات» = ثغرة حقيقية. لا تنشر قبل إصلاحها.
--   ❌ في قسم «الضوابط الموجبة» = الاختبار نفسه لم يعمل (لم تنجح انتحال
--      الهوية)، فلا تثق بنتيجة بقية الصفوف حتى تُصلحه.
-- ============================================================================

do $outer$
declare
  -- ▼▼▼ ضع المعرّفين هنا ▼▼▼
  v_a uuid := '00000000-0000-0000-0000-00000000000a';  -- الحساب A (الضحية)
  v_b uuid := '00000000-0000-0000-0000-00000000000b';  -- الحساب B (المهاجم)
  -- ▲▲▲ ضع المعرّفين هنا ▲▲▲
begin
  if v_a = '00000000-0000-0000-0000-00000000000a'::uuid then
    raise exception 'لم تُدخل معرّفي الحسابين بعد. عدّل السطرين المعلَّمين في أعلى الملف.';
  end if;
  if not exists (select 1 from public.users where id = v_a) then
    raise exception 'الحساب A غير موجود في جدول users.';
  end if;
  if not exists (select 1 from public.users where id = v_b) then
    raise exception 'الحساب B غير موجود في جدول users.';
  end if;
  if exists (select 1 from public.admins where user_id in (v_a, v_b)) then
    raise exception 'أحد الحسابين إداري. اختبر بحسابين عاديين، وإلا كانت النتيجة بلا معنى.';
  end if;

  perform set_config('app.test_a', v_a::text, false);
  perform set_config('app.test_b', v_b::text, false);
end
$outer$;

drop table if exists public.security_test_results;
create table public.security_test_results (
  seq      serial primary key,
  grp      text,   -- الفئة
  test     text,   -- الاختبار
  expected text,   -- المتوقع
  verdict  text,   -- النتيجة
  detail   text    -- التفصيل
);

-- ---------------------------------------------------------------------------
-- أدوات التنفيذ: تنتحل هوية مستخدم عبر request.jwt.claims — وهي نفس الطريقة
-- التي يقرأ بها auth.uid() هوية صاحب الطلب، فالاختبار يمرّ بنفس مسار التطبيق.
-- ---------------------------------------------------------------------------

create or replace function pg_temp.as_user(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user::text, 'role', 'authenticated')::text,
    true
  );
end $$;

create or replace function pg_temp.as_owner() returns void
language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

/** يحاول قراءة، ويعدّ الصفوف التي وصلت إلى المهاجم. */
create or replace function pg_temp.attempt_read(p_user uuid, p_sql text)
returns integer language plpgsql as $$
declare n integer;
begin
  perform pg_temp.as_user(p_user);
  begin
    execute p_sql into n;
  exception when others then
    n := -1;  -- رُفض بخطأ — وهذا منع أيضًا
  end;
  perform pg_temp.as_owner();
  return coalesce(n, 0);
end $$;

/**
 * يحاول كتابة، ويُرجع عدد الصفوف التي تأثّرت — ثم يلغي الأثر دائمًا.
 * الإلغاء عبر استثناء مقصود داخل كتلة فرعية، فهي نقطة حفظ ضمنية في plpgsql.
 */
create or replace function pg_temp.attempt_write(p_user uuid, p_sql text)
returns integer language plpgsql as $$
declare n integer := 0;
begin
  perform pg_temp.as_user(p_user);
  begin
    execute p_sql;
    get diagnostics n = row_count;
    raise exception 'UNDO %', n;
  exception when others then
    if sqlerrm like 'UNDO %' then
      n := split_part(sqlerrm, ' ', 2)::integer;   -- نجحت الكتابة ثم أُلغيت
    else
      n := -1;                                      -- رفضتها السياسة
    end if;
  end;
  perform pg_temp.as_owner();
  return n;
end $$;

/** يحاول استدعاء دالة على الخادم. يُرجع 1 إن نجحت، و-1 إن رُفضت. */
create or replace function pg_temp.attempt_call(p_user uuid, p_sql text)
returns integer language plpgsql as $$
declare n integer := 0;
begin
  perform pg_temp.as_user(p_user);
  begin
    execute p_sql;
    n := 1;
    raise exception 'UNDO 1';
  exception when others then
    if sqlerrm like 'UNDO %' then n := 1; else n := -1; end if;
  end;
  perform pg_temp.as_owner();
  return n;
end $$;

create or replace function pg_temp.log_result(
  p_group text, p_test text, p_expect text, p_actual integer, p_pass boolean
) returns void language plpgsql as $$
begin
  insert into public.security_test_results (grp, test, expected, verdict, detail)
  values (
    p_group, p_test, p_expect,
    case when p_pass then '✅ نجح' else '❌ فشل' end,
    case
      when p_actual < 0 then 'رفضه الخادم بخطأ'
      when p_actual = 0 then 'لم يصل إليه شيء'
      else p_actual || ' صفًّا وصل إليه'
    end
  );
end $$;

-- ---------------------------------------------------------------------------
-- تنفيذ الاختبارات
-- ---------------------------------------------------------------------------

do $tests$
declare
  a uuid := current_setting('app.test_a')::uuid;
  b uuid := current_setting('app.test_b')::uuid;
  n integer;
  v_act uuid;
  v_post uuid;
  v_msg uuid;
begin
  select id into v_act  from public.activities   limit 1;
  select id into v_post from public.group_posts  limit 1;
  select id into v_msg  from public.user_messages limit 1;

  -- ===================== الضوابط الموجبة =====================
  -- إن فشل أيّ منها فالاختبار نفسه لا يعمل، ولا معنى لبقية النتائج.

  n := pg_temp.attempt_read(b, 'select count(*) from public.users where id = ' || quote_literal(b) || '::uuid');
  perform pg_temp.log_result('ضوابط موجبة', 'B يقرأ صفّه هو في users', 'صفّ واحد', n, n = 1);

  n := pg_temp.attempt_read(b, 'select count(*) from public.activities');
  perform pg_temp.log_result('ضوابط موجبة', 'B يقرأ الأنشطة (عامة)', 'مسموح', n, n >= 0);

  n := pg_temp.attempt_read(b, 'select count(*) from public.quiz_questions_public');
  perform pg_temp.log_result('ضوابط موجبة', 'B يقرأ الأسئلة عبر العرض العام', 'مسموح', n, n >= 0);

  -- ===================== قراءة بيانات مستخدم آخر =====================

  n := pg_temp.attempt_read(b, 'select count(*) from public.users where id = ' || quote_literal(a) || '::uuid');
  perform pg_temp.log_result('قراءة', 'B يقرأ صفّ A في users', 'ممنوع', n, n <= 0);

  n := pg_temp.attempt_read(b, 'select count(*) from public.user_messages where user_id = ' || quote_literal(a) || '::uuid');
  perform pg_temp.log_result('قراءة', 'B يقرأ رسائل A إلى الإدارة', 'ممنوع', n, n <= 0);

  n := pg_temp.attempt_read(b, 'select count(*) from public.notifications where user_id = ' || quote_literal(a) || '::uuid');
  perform pg_temp.log_result('قراءة', 'B يقرأ إشعارات A', 'ممنوع', n, n <= 0);

  n := pg_temp.attempt_read(b, 'select count(*) from public.registrations where user_id = ' || quote_literal(a) || '::uuid');
  perform pg_temp.log_result('قراءة', 'B يقرأ تسجيلات A في الأنشطة', 'ممنوع', n, n <= 0);

  n := pg_temp.attempt_read(b, 'select count(*) from public.points_transactions where user_id = ' || quote_literal(a) || '::uuid');
  perform pg_temp.log_result('قراءة', 'B يقرأ سجل نقاط A', 'ممنوع', n, n <= 0);

  n := pg_temp.attempt_read(b, 'select count(*) from public.activity_checkins where user_id = ' || quote_literal(a) || '::uuid');
  perform pg_temp.log_result('قراءة', 'B يقرأ حضور A', 'ممنوع', n, n <= 0);

  n := pg_temp.attempt_read(b, 'select count(*) from public.quiz_answers where user_id = ' || quote_literal(a) || '::uuid');
  perform pg_temp.log_result('قراءة', 'B يقرأ إجابات A في المسابقة', 'ممنوع', n, n <= 0);

  -- ===================== أسرار الخادم =====================

  n := pg_temp.attempt_read(b, 'select count(*) from public.quiz_questions');
  perform pg_temp.log_result('أسرار', 'B يقرأ جدول الأسئلة بإجاباته الصحيحة', 'ممنوع', n, n <= 0);

  n := pg_temp.attempt_read(b, 'select count(*) from public.activity_checkin_codes');
  perform pg_temp.log_result('أسرار', 'B يقرأ جدول رموز الحضور', 'ممنوع', n, n <= 0);

  if v_act is not null then
    n := pg_temp.attempt_call(b, 'select public.get_check_in_code(' || quote_literal(v_act) || '::uuid)');
    perform pg_temp.log_result('أسرار', 'B يستدعي get_check_in_code()', 'ممنوع', n, n < 0);
  end if;

  n := pg_temp.attempt_read(b, 'select count(*) from public.group_post_reports');
  perform pg_temp.log_result('أسرار', 'B يقرأ بلاغات المشاركات', 'ممنوع', n, n <= 0);

  n := pg_temp.attempt_read(b, 'select count(*) from public.admins');
  perform pg_temp.log_result('أسرار', 'B يقرأ قائمة الإداريين', 'ممنوع', n, n <= 0);

  -- ===================== التلاعب بالنقاط =====================

  n := pg_temp.attempt_write(b,
    'update public.points_transactions set points = 9999 where user_id = ' || quote_literal(a) || '::uuid');
  perform pg_temp.log_result('كتابة', 'B يعدّل نقاط A', 'ممنوع', n, n <= 0);

  n := pg_temp.attempt_write(b,
    'insert into public.points_transactions (user_id, reason, points) values ('
    || quote_literal(b) || '::uuid, ''quiz_correct'', 9999)');
  perform pg_temp.log_result('كتابة', 'B يمنح نفسه نقاطًا مباشرة', 'ممنوع', n, n <= 0);

  n := pg_temp.attempt_write(b,
    'insert into public.activity_checkins (user_id, activity_id, code) select '
    || quote_literal(b) || '::uuid, id, ''XXXXXX'' from public.activities limit 1');
  perform pg_temp.log_result('كتابة', 'B يسجّل حضوره بلا رمز صحيح', 'ممنوع', n, n <= 0);

  -- ===================== انتحال الصلاحية الإدارية =====================

  n := pg_temp.attempt_write(b,
    'insert into public.admins (user_id) values (' || quote_literal(b) || '::uuid)');
  perform pg_temp.log_result('تصعيد صلاحية', 'B يُدرج نفسه في جدول admins', 'ممنوع', n, n <= 0);

  n := pg_temp.attempt_write(b,
    'insert into public.activities (title, description, category, date, start_time, location) '
    || 'values (''اختراق'', ''اختبار'', ''Cultural'', current_date, ''10:00'', ''—'')');
  perform pg_temp.log_result('تصعيد صلاحية', 'B يضيف نشاطًا', 'ممنوع', n, n <= 0);

  n := pg_temp.attempt_write(b,
    'insert into public.announcements (title, description, type) values (''اختراق'', ''اختبار'', ''عام'')');
  perform pg_temp.log_result('تصعيد صلاحية', 'B ينشر إعلانًا', 'ممنوع', n, n <= 0);

  n := pg_temp.attempt_call(b, 'select public.broadcast_notification(''اختراق'', ''اختبار'')');
  perform pg_temp.log_result('تصعيد صلاحية', 'B يستدعي broadcast_notification()', 'ممنوع', n, n < 0);

  if v_act is not null then
    n := pg_temp.attempt_call(b,
      'select public.set_check_in_code(' || quote_literal(v_act) || '::uuid, ''AAAAAA'')');
    perform pg_temp.log_result('تصعيد صلاحية', 'B يضبط رمز حضور', 'ممنوع', n, n < 0);
  end if;

  if v_msg is not null then
    n := pg_temp.attempt_call(b,
      'select public.reply_to_message(' || quote_literal(v_msg) || '::uuid, ''رد منتحَل'')');
    perform pg_temp.log_result('تصعيد صلاحية', 'B يردّ باسم الإدارة على رسالة', 'ممنوع', n, n < 0);
  end if;

  n := pg_temp.attempt_write(b, 'update public.app_contact set phone = ''00000000'' where id = 1');
  perform pg_temp.log_result('تصعيد صلاحية', 'B يغيّر بيانات التواصل الرسمية', 'ممنوع', n, n <= 0);

  n := pg_temp.attempt_write(b,
    'insert into public.discussion_groups (title, topic, description) values (''مجموعة منتحلة'', ''—'', ''—'')');
  perform pg_temp.log_result('تصعيد صلاحية', 'B ينشئ مجموعة نقاشية', 'ممنوع', n, n <= 0);

  -- ===================== النقاش والمرفقات =====================

  if v_post is not null then
    n := pg_temp.attempt_write(b, 'delete from public.group_posts where id = ' || quote_literal(v_post) || '::uuid');
    perform pg_temp.log_result('نقاش', 'B يحذف مشاركة ليست له', 'ممنوع', n, n <= 0);

    n := pg_temp.attempt_write(b,
      'update public.group_posts set pinned = true where id = ' || quote_literal(v_post) || '::uuid');
    perform pg_temp.log_result('نقاش', 'B يثبّت مشاركة (إجراء إداري)', 'ممنوع', n, n <= 0);
  end if;

  n := pg_temp.attempt_write(b,
    'insert into public.group_posts (group_id, author_id, author_name, body) '
    || 'select id, ' || quote_literal(a) || '::uuid, ''منتحَل'', ''منشور باسم غيري'' '
    || 'from public.discussion_groups limit 1');
  perform pg_temp.log_result('نقاش', 'B ينشر باسم A', 'ممنوع', n, n <= 0);

  n := pg_temp.attempt_write(b,
    'insert into public.group_posts (group_id, author_id, author_name, body) '
    || 'select id, ' || quote_literal(b) || '::uuid, ''B'', ''منشور في مجموعة مقفلة'' '
    || 'from public.discussion_groups where locked = true limit 1');
  perform pg_temp.log_result('نقاش', 'B ينشر في مجموعة مقفلة', 'ممنوع', n, n <= 0);

  n := pg_temp.attempt_write(b,
    'delete from storage.objects where bucket_id = ''app-media'' and owner = ' || quote_literal(a) || '::uuid');
  perform pg_temp.log_result('مرفقات', 'B يحذف ملفًا رفعه A', 'ممنوع', n, n <= 0);

  n := pg_temp.attempt_write(b,
    'delete from storage.objects where bucket_id = ''activity-images''');
  perform pg_temp.log_result('مرفقات', 'B يحذف أغلفة الإدارة', 'ممنوع', n, n <= 0);
end
$tests$;

-- ---------------------------------------------------------------------------
-- النتيجة
-- ---------------------------------------------------------------------------

select
  grp      as "الفئة",
  test     as "الاختبار",
  expected as "المتوقع",
  verdict  as "النتيجة",
  detail   as "التفصيل"
from public.security_test_results
order by
  case when verdict like '❌%' then 0 else 1 end,   -- الإخفاقات أولًا
  seq;

-- للتنظيف بعد المراجعة:
--   drop table public.security_test_results;
