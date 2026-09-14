-- ============================================================================
-- بيانات اختبار محلية — للاختبار فقط، لا تنفّذها على مشروع حقيقي
-- ============================================================================
--
-- حسابان عاديان: A (الضحية) و B (المهاجم)، وبيانات تخصّ A ليحاول B الوصول
-- إليها في supabase/security-tests.sql. المعرّفات ثابتة عمدًا حتى يمكن نسخها
-- مباشرة إلى ملف الاختبارات.
--
--   A = 11111111-1111-1111-1111-111111111111
--   B = 22222222-2222-2222-2222-222222222222
-- ============================================================================

-- الجداول أُنشئت بعد الطبقة التوافقية، فنعيد منح الصلاحيات لتغطيتها.
select public.grant_supabase_defaults();


insert into auth.users (id, phone) values
  ('11111111-1111-1111-1111-111111111111', '+96891111111'),
  ('22222222-2222-2222-2222-222222222222', '+96892222222')
on conflict do nothing;

insert into public.users (id, full_name, phone) values
  ('11111111-1111-1111-1111-111111111111', 'سالم (A)', '91111111'),
  ('22222222-2222-2222-2222-222222222222', 'خالد (B)', '92222222')
on conflict do nothing;

insert into public.activities (id, title, description, category, date, start_time, location, registration_status)
values ('33333333-3333-3333-3333-333333333333', 'محاضرة توعوية', 'وصف', 'Lecture', current_date, '10:00', 'قاعة المحاضرات', 'open')
on conflict do nothing;

insert into public.activity_checkin_codes (activity_id, code)
values ('33333333-3333-3333-3333-333333333333', 'SECRET1') on conflict do nothing;

insert into public.weekly_quizzes (id, week_label, start_date, end_date, status)
values ('44444444-4444-4444-4444-444444444444', 'الأسبوع 1', current_date, current_date + 7, 'open')
on conflict do nothing;

insert into public.quiz_questions (id, quiz_id, text, options, category, correct_option_index)
values ('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444',
        'سؤال', array['أ','ب','ج'], 'عام', 2) on conflict do nothing;

insert into public.points_transactions (user_id, reason, points)
values ('11111111-1111-1111-1111-111111111111', 'quiz_correct', 10) on conflict do nothing;

insert into public.registrations (user_id, activity_id)
values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333') on conflict do nothing;

insert into public.notifications (user_id, title, body)
values ('11111111-1111-1111-1111-111111111111', 'إشعار', 'نص') on conflict do nothing;

insert into public.user_messages (id, user_id, user_name, subject, body)
values ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111',
        'سالم (A)', 'موضوع خاص', 'نص رسالة خاصة') on conflict do nothing;

insert into public.discussion_groups (id, title, topic, description, locked) values
  ('77777777-7777-7777-7777-777777777777', 'مجموعة مفتوحة', 'عام', 'وصف', false),
  ('88888888-8888-8888-8888-888888888888', 'مجموعة مقفلة', 'عام', 'وصف', true)
on conflict do nothing;

insert into public.group_posts (id, group_id, author_id, author_name, body)
values ('99999999-9999-9999-9999-999999999999', '77777777-7777-7777-7777-777777777777',
        '11111111-1111-1111-1111-111111111111', 'سالم (A)', 'مشاركة تخصّ A') on conflict do nothing;

insert into storage.objects (bucket_id, name, owner) values
  ('app-media', 'messages/a-file.jpg', '11111111-1111-1111-1111-111111111111'),
  ('activity-images', 'activities/cover.jpg', null)
on conflict do nothing;

-- بلاغ واحد، حتى يكون اختبار «قراءة البلاغات» ذا معنى بدل أن يمرّ لعدم وجود بيانات.
insert into public.group_post_reports (post_id, reporter_id, reason)
values ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'اختبار')
on conflict do nothing;
