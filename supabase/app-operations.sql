-- ============================================================================
-- هل يستطيع التطبيق أن يفعل ما يحاول فعله؟
-- ============================================================================
--
-- اختبارات الصلاحيات العدائية تسأل: ما الذي يجب أن يُمنع؟ وهذا الملف يسأل
-- السؤال المقابل: ما الذي يجب أن يُسمح به، وهل هو مسموح فعلًا؟
--
-- الجانب الثاني هو الذي أخفى أخطر عطل في المشروع: جدول users بلا سياسة إدراج،
-- فكان كل تسجيل يُرفض على الخادم الحقيقي، ولا شيء يكشفه — لأن المنع يبدو
-- «أمانًا» حتى يمنع ما لا ينبغي منعه.
--
-- يمرّ على كل عملية كتابة يقوم بها التطبيق فعلًا، مرّتين: بحساب عضو عادي،
-- وبحساب إداري. وكل محاولة تُلغى بعدها مباشرة، فلا يتغيّر شيء في القاعدة.
--
-- التشغيل:  npm run test:operations
-- ============================================================================

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------------
-- أدوات الانتحال — المسار نفسه الذي يسلكه Supabase: الدور authenticated
-- وادّعاء sub في request.jwt.claims، وهو ما تقرأه auth.uid().
-- ---------------------------------------------------------------------------
create or replace function pg_temp.as_user(p_user uuid) returns void
language plpgsql as $$
begin
  execute 'set local role authenticated';
  execute format('set local "request.jwt.claims" = %L', json_build_object('sub', p_user, 'role', 'authenticated')::text);
end $$;

create or replace function pg_temp.as_owner() returns void
language plpgsql as $$
begin
  execute 'reset role';
  execute 'select set_config(''request.jwt.claims'', NULL, true)';
end $$;

/**
 * يحاول تنفيذ عملية كتابة ثم يلغيها.
 *
 * يُرجع عدد الصفوف إن نجحت، و-1 إن رفضتها السياسة، و-2 إن فشلت لسبب آخر
 * (خطأ في القيد مثلًا) — والتمييز مهم: «رفضتها السياسة» عطل صلاحيات، و«خطأ
 * آخر» عطل في البيانات، ولكلٍّ علاج مختلف.
 */
create or replace function pg_temp.try_write(p_user uuid, p_sql text)
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
      n := split_part(sqlerrm, ' ', 2)::integer;
    elsif sqlerrm like '%row-level security%' or sqlerrm like '%permission denied%' then
      n := -1;
    else
      n := -2;
    end if;
  end;
  perform pg_temp.as_owner();
  return n;
end $$;

/** يستدعي دالة على الخادم. 1 نجحت، -1 رفضتها الصلاحيات، -2 فشلت لسبب آخر. */
create or replace function pg_temp.try_call(p_user uuid, p_sql text)
returns integer language plpgsql as $$
declare n integer := 1;
begin
  perform pg_temp.as_user(p_user);
  begin
    execute p_sql;
  exception when others then
    if sqlerrm like '%row-level security%' or sqlerrm like '%permission denied%'
       or sqlerrm like '%غير مصرّح%' or sqlerrm like '%صلاحية%' then
      n := -1;
    else
      n := -2;
    end if;
  end;
  perform pg_temp.as_owner();
  return n;
end $$;

create temporary table op_results (
  seq serial,
  actor text,
  operation text,
  expected text,
  outcome text,
  verdict text
) on commit preserve rows;

/**
 * الحكم.
 *
 * المسموح لا يكفي فيه ألّا يُرفض: يجب أن يؤثّر في صفّ فعلًا. فـRLS يُرشِّح
 * الصفوف ولا يرفع خطأ، فعمليةٌ «ناجحة» أثّرت في صفر صفوف هي عطلٌ صامت — وهذا
 * بالضبط ما كان يحدث لحذف الإشعارات من لوحة الإدارة.
 * والممنوع يُقبل منه الأمران: رفضٌ صريح، أو صفر صفوف.
 */
create or replace function pg_temp.check_op(
  p_actor text, p_op text, p_allowed boolean, p_n integer
) returns void language plpgsql as $$
declare
  succeeded boolean := p_n >= 1;
  outcome text;
begin
  outcome := case
    when p_n = -1 then 'رفضتها السياسة'
    when p_n = -2 then 'فشلت لسبب آخر'
    when p_n = 0 then 'صفر صفوف'
    else p_n || ' صفّ'
  end;
  insert into op_results (actor, operation, expected, outcome, verdict)
  values (
    p_actor, p_op,
    case when p_allowed then 'مسموح' else 'ممنوع' end,
    outcome,
    case when succeeded = p_allowed then '✅ سليم' else '❌ خلل' end
  );
end $$;


-- ---------------------------------------------------------------------------
-- التشغيل
-- ---------------------------------------------------------------------------
do $$
declare
  member uuid;
  boss   uuid;
  v_act  uuid;
  v_grp  uuid;
  v_post uuid;
  v_msg  uuid;
  v_q    uuid;
  n      integer;
begin
  select id into member from public.users order by created_at limit 1;
  select id into boss   from public.users order by created_at offset 1 limit 1;
  if member is null or boss is null then
    raise exception 'يحتاج الملف حسابين على الأقل في public.users — نفّذ local-seed.sql أولًا.';
  end if;

  -- الثاني إداري، والأول عضو عادي.
  insert into public.admins (user_id) values (boss) on conflict do nothing;
  delete from public.admins where user_id = member;

  -- اختيار البيانات بشرطها لا بأوّل صفّ يصادفنا: بذور الاختبار تحتوي عمدًا
  -- مجموعةً مقفلةً لاختبار المنع، ولو نشرنا فيها لقرأنا سلوكًا سليمًا عطلًا.
  select id into v_act
    from public.activities a
   where not exists (select 1 from public.registrations r
                      where r.activity_id = a.id and r.user_id = member)
   limit 1;

  select id into v_grp
    from public.discussion_groups
   where locked = false and audience = 'all'
   limit 1;

  select id into v_post from public.group_posts   limit 1;
  select id into v_msg  from public.user_messages limit 1;
  select id into v_q    from public.quiz_questions limit 1;

  -- الإشعار موجود حتى يكون لـ«يعلّم إشعاره مقروءًا» صفٌّ يؤثّر فيه.
  insert into public.notifications (user_id, title, body, read)
  values (member, 'إشعار اختبار', 'نص', false);

  -- ===================== العضو العادي: ما يجب أن يقدر عليه =====================

  n := pg_temp.try_write(member,
    'insert into public.users (id, full_name, phone) values ('
      || quote_literal(member) || '::uuid, ''اسم'', ''+96899100001'')'
      || ' on conflict (id) do update set full_name = excluded.full_name');
  perform pg_temp.check_op('عضو', 'ينشئ/يحدّث صفّه (التسجيل)', true, n);

  n := pg_temp.try_write(member,
    'update public.users set full_name = ''اسم جديد'' where id = ' || quote_literal(member) || '::uuid');
  perform pg_temp.check_op('عضو', 'يعدّل اسمه', true, n);

  if v_act is not null then
    n := pg_temp.try_write(member,
      'insert into public.registrations (user_id, activity_id) values ('
        || quote_literal(member) || '::uuid, ' || quote_literal(v_act) || '::uuid)');
    perform pg_temp.check_op('عضو', 'يسجّل في نشاط', true, n);

    -- الإلغاء يحتاج صفًّا قائمًا؛ ننشئه بصفتنا المالك ثم نجرّب حذفه بصفته هو.
    insert into public.registrations (user_id, activity_id)
    values (member, v_act) on conflict do nothing;

    n := pg_temp.try_write(member,
      'delete from public.registrations where user_id = ' || quote_literal(member)
        || '::uuid and activity_id = ' || quote_literal(v_act) || '::uuid');
    perform pg_temp.check_op('عضو', 'يلغي تسجيله', true, n);

    delete from public.registrations where user_id = member and activity_id = v_act;
  end if;

  if v_grp is not null then
    n := pg_temp.try_write(member,
      'insert into public.group_posts (group_id, author_id, author_name, body) values ('
        || quote_literal(v_grp) || '::uuid, ' || quote_literal(member) || '::uuid, ''عضو'', ''منشور'')');
    perform pg_temp.check_op('عضو', 'ينشر في مجموعة', true, n);
  end if;

  n := pg_temp.try_write(member,
    'insert into public.user_messages (user_id, user_name, kind, subject, body) values ('
      || quote_literal(member) || '::uuid, ''عضو'', ''اقتراح'', ''عنوان'', ''نص'')');
  perform pg_temp.check_op('عضو', 'يراسل الإدارة', true, n);

  n := pg_temp.try_write(member,
    'update public.notifications set read = true where user_id = ' || quote_literal(member) || '::uuid');
  perform pg_temp.check_op('عضو', 'يعلّم إشعاره مقروءًا', true, n);

  if v_q is not null then
    n := pg_temp.try_call(member,
      'select public.submit_quiz_answer(' || quote_literal(v_q) || '::uuid, 0::smallint)');
    perform pg_temp.check_op('عضو', 'يجيب على سؤال المسابقة', true, n);
  end if;

  if v_post is not null then
    n := pg_temp.try_call(member,
      'select public.report_group_post(' || quote_literal(v_post) || '::uuid, ''مخالف'')');
    perform pg_temp.check_op('عضو', 'يبلّغ عن منشور', true, n);
  end if;

  -- ===================== العضو العادي: ما يجب أن يُمنع منه =====================

  n := pg_temp.try_write(member,
    'insert into public.activities (title, description, category, date, start_time, location)'
      || ' values (''نشاط'', ''وصف'', ''Sports'', current_date, ''10:00'', ''مكان'')');
  perform pg_temp.check_op('عضو', 'ينشئ نشاطًا', false, n);

  n := pg_temp.try_write(member,
    'insert into public.announcements (title, description) values (''إعلان'', ''نص'')');
  perform pg_temp.check_op('عضو', 'ينشر إعلانًا', false, n);

  n := pg_temp.try_call(member, 'select public.broadcast_notification(''عنوان'', ''نص'')');
  perform pg_temp.check_op('عضو', 'يرسل إشعارًا للجميع', false, n);

  if v_act is not null then
    n := pg_temp.try_call(member,
      'select public.set_check_in_code(' || quote_literal(v_act) || '::uuid, ''ABC123'')');
    perform pg_temp.check_op('عضو', 'يضبط رمز الحضور', false, n);
  end if;

  if v_post is not null then
    n := pg_temp.try_write(member,
      'update public.group_posts set pinned = true where id = ' || quote_literal(v_post) || '::uuid');
    perform pg_temp.check_op('عضو', 'يثبّت منشورًا', false, n);
  end if;

  n := pg_temp.try_write(member,
    'insert into public.admins (user_id) values (' || quote_literal(member) || '::uuid)');
  perform pg_temp.check_op('عضو', 'يرقّي نفسه إداريًا', false, n);

  -- ===================== الإداري: ما يجب أن يقدر عليه =====================

  n := pg_temp.try_write(boss,
    'insert into public.activities (title, description, category, date, start_time, location)'
      || ' values (''نشاط'', ''وصف'', ''Sports'', current_date, ''10:00'', ''مكان'')');
  perform pg_temp.check_op('إداري', 'ينشئ نشاطًا', true, n);

  if v_act is not null then
    n := pg_temp.try_write(boss,
      'update public.activities set title = ''معدّل'' where id = ' || quote_literal(v_act) || '::uuid');
    perform pg_temp.check_op('إداري', 'يعدّل نشاطًا', true, n);

    n := pg_temp.try_write(boss,
      'insert into public.activity_results (activity_id, rank, winner_name) values ('
        || quote_literal(v_act) || '::uuid, 1, ''فائز'')');
    perform pg_temp.check_op('إداري', 'يسجّل نتيجة', true, n);

    n := pg_temp.try_call(boss,
      'select public.set_check_in_code(' || quote_literal(v_act) || '::uuid, ''ABC123'')');
    perform pg_temp.check_op('إداري', 'يضبط رمز الحضور', true, n);
  end if;

  n := pg_temp.try_write(boss,
    'insert into public.announcements (title, description, image) values (''إعلان'', ''نص'', null)');
  perform pg_temp.check_op('إداري', 'ينشر إعلانًا بمرفق', true, n);

  n := pg_temp.try_write(boss,
    'insert into public.awareness_articles (title, summary, content, category)'
      || ' values (''مقال'', ''ملخّص'', ''نص'', ''أمني'')');
  perform pg_temp.check_op('إداري', 'ينشر مقالًا توعويًا', true, n);

  n := pg_temp.try_write(boss,
    'insert into public.discussion_groups (title) values (''مجموعة'')');
  perform pg_temp.check_op('إداري', 'ينشئ مجموعة نقاش', true, n);

  n := pg_temp.try_call(boss, 'select public.broadcast_notification(''عنوان'', ''نص'')');
  perform pg_temp.check_op('إداري', 'يرسل إشعارًا للجميع', true, n);

  n := pg_temp.try_write(boss, 'delete from public.notifications');
  perform pg_temp.check_op('إداري', 'يحذف إشعارًا مُرسَلًا', true, n);

  n := pg_temp.try_write(boss, 'update public.app_contact set phone = ''12345678'' where id = 1');
  perform pg_temp.check_op('إداري', 'يعدّل بيانات التواصل', true, n);

  n := pg_temp.try_call(boss, 'select public.admin_registration_counts()');
  perform pg_temp.check_op('إداري', 'يقرأ أعداد التسجيل', true, n);

  if v_post is not null then
    n := pg_temp.try_write(boss,
      'update public.group_posts set pinned = true where id = ' || quote_literal(v_post) || '::uuid');
    perform pg_temp.check_op('إداري', 'يثبّت منشورًا', true, n);

    n := pg_temp.try_write(boss,
      'delete from public.group_posts where id = ' || quote_literal(v_post) || '::uuid');
    perform pg_temp.check_op('إداري', 'يحذف منشورًا مخالفًا', true, n);
  end if;

  if v_msg is not null then
    n := pg_temp.try_call(boss,
      'select public.reply_to_message(' || quote_literal(v_msg) || '::uuid, ''ردّ'')');
    perform pg_temp.check_op('إداري', 'يردّ على رسالة', true, n);
  end if;

  -- ===================== مفاتيح الإيقاف =====================
  -- مفتاحُ إيقافٍ لا يوقف شيئًا ليس مفتاح إيقاف: نطفئه ونتأكد أن الخادم يرفض.

  update public.app_settings set discussion_enabled = false, messages_enabled = false,
                                 registration_enabled = false where id = 1;

  if v_grp is not null then
    n := pg_temp.try_write(member,
      'insert into public.group_posts (group_id, author_id, author_name, body) values ('
        || quote_literal(v_grp) || '::uuid, ' || quote_literal(member) || '::uuid, ''عضو'', ''بعد الإطفاء'')');
    perform pg_temp.check_op('عضو', 'ينشر والمجموعات مطفأة', false, n);
  end if;

  n := pg_temp.try_write(member,
    'insert into public.user_messages (user_id, user_name, kind, subject, body) values ('
      || quote_literal(member) || '::uuid, ''عضو'', ''اقتراح'', ''ع'', ''ن'')');
  perform pg_temp.check_op('عضو', 'يراسل والمراسلة مطفأة', false, n);

  if v_act is not null then
    n := pg_temp.try_write(member,
      'insert into public.registrations (user_id, activity_id) values ('
        || quote_literal(member) || '::uuid, ' || quote_literal(v_act) || '::uuid)');
    perform pg_temp.check_op('عضو', 'يسجّل والتسجيل مطفأ', false, n);
  end if;

  n := pg_temp.try_write(member,
    'update public.app_settings set discussion_enabled = true where id = 1');
  perform pg_temp.check_op('عضو', 'يعيد تشغيل ميزة بنفسه', false, n);

  update public.app_settings set discussion_enabled = true, messages_enabled = true,
                                 registration_enabled = true where id = 1;

  n := pg_temp.try_write(boss,
    'update public.app_settings set discussion_enabled = false where id = 1');
  perform pg_temp.check_op('إداري', 'يطفئ ميزة', true, n);

  -- ===================== رفع الملفات =====================
  -- ‏Supabase يضبط عمود owner بنفسه عند الرفع؛ نضبطه هنا يدويًا لأن الطبقة
  -- التوافقية المحلية لا تحاكي واجهة التخزين، وسياسة الحذف مبنية عليه.

  n := pg_temp.try_write(member,
    'insert into storage.objects (bucket_id, name, owner) values (''app-media'', ''posts/1-abc.jpg'', '
      || quote_literal(member) || '::uuid)');
  perform pg_temp.check_op('عضو', 'يرفع صورة/مقطعًا إلى app-media', true, n);

  n := pg_temp.try_write(member,
    'insert into storage.objects (bucket_id, name, owner) values (''activity-images'', ''covers/1-abc.jpg'', '
      || quote_literal(member) || '::uuid)');
  perform pg_temp.check_op('عضو', 'يرفع غلافًا إلى activity-images', false, n);

  insert into storage.objects (bucket_id, name, owner)
  values ('app-media', 'posts/owned-by-boss.jpg', boss) on conflict do nothing;

  n := pg_temp.try_write(member,
    'delete from storage.objects where bucket_id = ''app-media'' and name = ''posts/owned-by-boss.jpg''');
  perform pg_temp.check_op('عضو', 'يحذف مرفق غيره', false, n);

  insert into storage.objects (bucket_id, name, owner)
  values ('app-media', 'posts/owned-by-member.jpg', member) on conflict do nothing;

  n := pg_temp.try_write(member,
    'delete from storage.objects where bucket_id = ''app-media'' and name = ''posts/owned-by-member.jpg''');
  perform pg_temp.check_op('عضو', 'يحذف مرفقه هو', true, n);

  n := pg_temp.try_write(boss,
    'insert into storage.objects (bucket_id, name, owner) values (''activity-images'', ''covers/2-abc.jpg'', '
      || quote_literal(boss) || '::uuid)');
  perform pg_temp.check_op('إداري', 'يرفع غلاف نشاط', true, n);

  n := pg_temp.try_write(boss,
    'delete from storage.objects where bucket_id = ''app-media'' and name = ''posts/owned-by-member.jpg''');
  perform pg_temp.check_op('إداري', 'يحذف مرفقًا مخالفًا لعضو', true, n);

  delete from storage.objects where name like 'posts/owned-by-%';

  -- ===================== الإداري: ما يجب أن يُمنع منه أيضًا =====================
  -- صلاحية الإدارة ليست صلاحية مطلقة.

  n := pg_temp.try_write(boss,
    'insert into public.admins (user_id) values (' || quote_literal(member) || '::uuid)');
  perform pg_temp.check_op('إداري', 'يرقّي عضوًا إداريًا', false, n);

  n := pg_temp.try_write(boss,
    'insert into public.points_transactions (user_id, reason, points) values ('
      || quote_literal(member) || '::uuid, ''quiz_correct'', 999)');
  perform pg_temp.check_op('إداري', 'يمنح نقاطًا بيده', false, n);

  -- تنظيف: نعيد الحال كما كان
  delete from public.notifications where title = 'إشعار اختبار';
  delete from public.admins where user_id = boss;
end $$;


-- ---------------------------------------------------------------------------
-- النتيجة
-- ---------------------------------------------------------------------------
select seq as "#", actor as "الفاعل", operation as "العملية",
       expected as "المتوقّع", outcome as "ما حدث", verdict as "الحكم"
from op_results order by seq;

select
  count(*) filter (where verdict like '✅%') as "سليم",
  count(*) filter (where verdict like '❌%') as "خلل",
  count(*) as "المجموع"
from op_results;
