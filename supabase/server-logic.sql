-- ============================================================================
-- منطق دوال الخادم — هل تفعل ما وُضعت له؟
-- ============================================================================
--
-- الفحصان السابقان يسألان عن الصلاحيات: من يُمنع، ومن يُسمح له. وهذا يسأل عن
-- الصحّة: الدالة التي يُسمح باستدعائها — هل تحسب الصواب صوابًا، وتمنع النقاط
-- المكرّرة، وترفض الرمز الخاطئ؟
--
-- وهذه الدوال هي موضع القواعد كلّها: النقاط والحضور والمسابقة والبلاغات. وهي
-- security definer، أي تعمل بصلاحية مالكها لا بصلاحية المستدعي — فخطأ فيها
-- يمرّ بلا أن توقفه أي سياسة.
--
-- كل شيء داخل معاملة تُلغى في النهاية، فلا يتغيّر شيء في القاعدة.
--
-- التشغيل:  npm run test:logic
-- ============================================================================

\set ON_ERROR_STOP on

create or replace function pg_temp.as_user(p_user uuid) returns void
language plpgsql as $$
begin
  execute 'set local role authenticated';
  execute format('set local "request.jwt.claims" = %L',
    json_build_object('sub', p_user, 'role', 'authenticated')::text);
end $$;

create or replace function pg_temp.as_owner() returns void
language plpgsql as $$
begin
  execute 'reset role';
  execute 'select set_config(''request.jwt.claims'', NULL, true)';
end $$;

create temporary table logic_results (
  seq serial,
  area text,
  rule text,
  expected text,
  actual text,
  verdict text
) on commit preserve rows;

create or replace function pg_temp.expect(
  p_area text, p_rule text, p_expected text, p_actual text
) returns void language plpgsql as $$
begin
  insert into logic_results (area, rule, expected, actual, verdict)
  values (p_area, p_rule, p_expected, p_actual,
          case when p_expected = p_actual then '✅ سليم' else '❌ خلل' end);
end $$;


do $$
declare
  member   uuid;
  boss     uuid;
  v_act    uuid;
  v_q      uuid;
  v_wrong  smallint;
  v_right  smallint;
  v_post   uuid;
  v_msg    uuid;
  ok       boolean;
  pts      integer;
  n        integer;
  users_n  integer;
begin
  select id into member from public.users order by created_at limit 1;
  select id into boss   from public.users order by created_at offset 1 limit 1;
  insert into public.admins (user_id) values (boss) on conflict do nothing;
  delete from public.admins where user_id = member;

  select id, correct_option_index into v_q, v_right from public.quiz_questions limit 1;
  select id into v_act  from public.activities   limit 1;
  select id into v_post from public.group_posts  limit 1;
  select id into v_msg  from public.user_messages limit 1;
  v_wrong := case when v_right = 0 then 1 else 0 end;

  -- نبدأ من صفحة بيضاء لهذا العضو حتى تكون الأعداد ذات معنى
  delete from public.points_transactions where user_id = member;
  delete from public.quiz_answers        where user_id = member;
  delete from public.activity_checkins   where user_id = member;

  -- ======================= المسابقة =======================
  perform pg_temp.as_user(member);

  select is_correct, points_earned into ok, pts
    from public.submit_quiz_answer(v_q, v_right);
  perform pg_temp.as_owner();
  perform pg_temp.expect('المسابقة', 'الإجابة الصحيحة تُحتسب صحيحة', 'true', ok::text);
  perform pg_temp.expect('المسابقة', 'الإجابة الصحيحة تمنح 10 نقاط', '10', pts::text);

  select count(*) into n from public.points_transactions
   where user_id = member and reason = 'quiz_correct';
  perform pg_temp.expect('المسابقة', 'تُسجَّل حركة نقاط واحدة', '1', n::text);

  -- الإجابة مرة ثانية على السؤال نفسه: قيد الفرادة يمنعها، فلا نقاط مضاعفة
  begin
    perform pg_temp.as_user(member);
    perform public.submit_quiz_answer(v_q, v_right);
    perform pg_temp.as_owner();
    perform pg_temp.expect('المسابقة', 'الإجابة مرتين على سؤال واحد', 'مرفوضة', 'مقبولة');
  exception when others then
    perform pg_temp.as_owner();
    perform pg_temp.expect('المسابقة', 'الإجابة مرتين على سؤال واحد', 'مرفوضة', 'مرفوضة');
  end;

  select count(*) into n from public.points_transactions
   where user_id = member and reason = 'quiz_correct';
  perform pg_temp.expect('المسابقة', 'النقاط لا تتضاعف بإعادة الإجابة', '1', n::text);

  -- إجابة خاطئة على سؤال آخر
  delete from public.quiz_answers where user_id = member;
  delete from public.points_transactions where user_id = member;

  perform pg_temp.as_user(member);
  select is_correct, points_earned into ok, pts
    from public.submit_quiz_answer(v_q, v_wrong);
  perform pg_temp.as_owner();
  perform pg_temp.expect('المسابقة', 'الإجابة الخاطئة تُحتسب خاطئة', 'false', ok::text);
  perform pg_temp.expect('المسابقة', 'الإجابة الخاطئة بلا نقاط', '0', pts::text);

  select count(*) into n from public.points_transactions where user_id = member;
  perform pg_temp.expect('المسابقة', 'لا حركة نقاط للإجابة الخاطئة', '0', n::text);

  -- ======================= الحضور =======================
  delete from public.points_transactions where user_id = member;
  delete from public.activity_checkins where user_id = member;
  delete from public.activity_checkin_codes where activity_id = v_act;

  -- لا رمز مضبوط بعد
  perform pg_temp.as_user(member);
  select success, points_earned into ok, pts from public.submit_check_in(v_act, 'ANY123');
  perform pg_temp.as_owner();
  perform pg_temp.expect('الحضور', 'لا حضور قبل ضبط الرمز', 'false', ok::text);

  perform pg_temp.as_user(boss);
  perform public.set_check_in_code(v_act, 'CYBER26');
  perform pg_temp.as_owner();

  -- رمز خاطئ
  perform pg_temp.as_user(member);
  select success, points_earned into ok, pts from public.submit_check_in(v_act, 'WRONG1');
  perform pg_temp.as_owner();
  perform pg_temp.expect('الحضور', 'الرمز الخاطئ يُرفض', 'false', ok::text);
  perform pg_temp.expect('الحضور', 'الرمز الخاطئ بلا نقاط', '0', pts::text);

  select count(*) into n from public.activity_checkins where user_id = member;
  perform pg_temp.expect('الحضور', 'الرمز الخاطئ لا يسجّل حضورًا', '0', n::text);

  -- رمز صحيح
  perform pg_temp.as_user(member);
  select success, points_earned into ok, pts from public.submit_check_in(v_act, 'CYBER26');
  perform pg_temp.as_owner();
  perform pg_temp.expect('الحضور', 'الرمز الصحيح يُقبل', 'true', ok::text);
  perform pg_temp.expect('الحضور', 'الحضور يمنح 10 نقاط', '10', pts::text);

  -- تسجيل الحضور مرتين
  perform pg_temp.as_user(member);
  select success, points_earned into ok, pts from public.submit_check_in(v_act, 'CYBER26');
  perform pg_temp.as_owner();
  perform pg_temp.expect('الحضور', 'الحضور مرتين يُرفض', 'false', ok::text);

  select coalesce(sum(points), 0) into n from public.points_transactions where user_id = member;
  perform pg_temp.expect('الحضور', 'النقاط لا تتضاعف بإعادة التسجيل', '10', n::text);

  -- ======================= البلاغات =======================
  if v_post is not null then
    delete from public.group_post_reports where post_id = v_post;
    update public.group_posts set report_count = 0 where id = v_post;

    perform pg_temp.as_user(member);
    perform public.report_group_post(v_post, 'مخالف');
    perform pg_temp.as_owner();

    select report_count into n from public.group_posts where id = v_post;
    perform pg_temp.expect('البلاغات', 'البلاغ يرفع العدّاد إلى 1', '1', n::text);

    -- البلاغ مرتين من الشخص نفسه
    perform pg_temp.as_user(member);
    perform public.report_group_post(v_post, 'مخالف مرة أخرى');
    perform pg_temp.as_owner();

    select report_count into n from public.group_posts where id = v_post;
    perform pg_temp.expect('البلاغات', 'البلاغ المكرّر لا يرفع العدّاد', '1', n::text);

    -- بلاغ من شخص آخر
    perform pg_temp.as_user(boss);
    perform public.report_group_post(v_post, 'مخالف');
    perform pg_temp.as_owner();

    select report_count into n from public.group_posts where id = v_post;
    perform pg_temp.expect('البلاغات', 'بلاغ شخص آخر يرفع العدّاد إلى 2', '2', n::text);
  end if;

  -- ======================= الإشعار العام =======================
  delete from public.notifications;
  select count(*) into users_n from public.users;

  perform pg_temp.as_user(boss);
  select public.broadcast_notification('عنوان', 'نص') into n;
  perform pg_temp.as_owner();
  perform pg_temp.expect('الإشعارات', 'الإشعار العام يصل كل مستخدم', users_n::text, n::text);

  select count(*) into n from public.notifications where read = true;
  perform pg_temp.expect('الإشعارات', 'الإشعار الجديد غير مقروء', '0', n::text);

  -- ======================= الردّ على رسالة =======================
  if v_msg is not null then
    perform pg_temp.as_user(boss);
    perform public.reply_to_message(v_msg, 'شكرًا لك');
    perform pg_temp.as_owner();

    select count(*) into n from public.user_messages
     where id = v_msg and status = 'answered' and reply_body = 'شكرًا لك';
    perform pg_temp.expect('المراسلة', 'الردّ يُحفظ وتُغلق الرسالة', '1', n::text);

    select count(*) into n from public.notifications
     where title = 'رد على رسالتك'
       and user_id = (select user_id from public.user_messages where id = v_msg);
    perform pg_temp.expect('المراسلة', 'صاحب الرسالة يُشعَر بالردّ', '1', n::text);
  end if;

  delete from public.admins where user_id = boss;
end $$;


select seq as "#", area as "المجال", rule as "القاعدة",
       expected as "المتوقّع", actual as "ما حدث", verdict as "الحكم"
from logic_results order by seq;

select
  count(*) filter (where verdict like '✅%') as "سليم",
  count(*) filter (where verdict like '❌%') as "خلل",
  count(*) as "المجموع"
from logic_results;
