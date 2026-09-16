-- ============================================================================
-- إقفال القراءة بلا حساب
-- ============================================================================
--
-- ما الذي كان مفتوحًا؟ سبعة جداول كانت سياستها «for select using (true)» بلا
-- تقييدٍ بالدور. و«true» تنطبق على الدور anon أيضًا — وهو الدور الذي يحمله
-- المفتاح العام الموجود داخل كل نسخة من التطبيق، ويستطيع أيّ أحد استخراجه من
-- الملفّ في دقائق.
--
-- فكانت هذه تُقرأ من الإنترنت بلا حساب ولا إذن:
--   الأنشطة · الإعلانات · أسماء الفائزين · مقالات التوعية · بيانات التواصل
--   · المجموعات النقاشية · مشاركات المجموعات (بنصّها وأسماء كاتبيها)
--
-- أمّا جدول الرحلات والأخبار وقوائم الأندية والرسائل الخاصة فكانت مقفلة من
-- قبل — وهذا ما جعل الخلل غير ظاهر: بعضُ الجدران قائم فيُظنّ الباقي مثله.
--
-- بعد هذا الملفّ: لا يُقرأ شيء منها إلا بحساب. ومفاتيح التشغيل وحدها تبقى
-- مقروءة للزائر، لأن التطبيق يقرؤها قبل الدخول ليعرف أيّ الأقسام مفتوح،
-- وليس فيها إلا مفاتيح نعم/لا.
--
-- كيف يُنفَّذ: Supabase ← SQL Editor ← الصق ← Run. ولا يحذف شيئًا ولا يغيّر
-- بياناتك، إنما يستبدل سبع سياسات قراءة.
-- ============================================================================

drop policy if exists "activities public read" on public.activities;
create policy "activities public read" on public.activities
  for select to authenticated using (true);

drop policy if exists "activity_results public read" on public.activity_results;
create policy "activity_results public read" on public.activity_results
  for select to authenticated using (true);

drop policy if exists "announcements public read" on public.announcements;
create policy "announcements public read" on public.announcements
  for select to authenticated using (true);

drop policy if exists "awareness public read" on public.awareness_articles;
create policy "awareness public read" on public.awareness_articles
  for select to authenticated using (true);

drop policy if exists "contact public read" on public.app_contact;
create policy "contact public read" on public.app_contact
  for select to authenticated using (true);

drop policy if exists "groups public read" on public.discussion_groups;
create policy "groups public read" on public.discussion_groups
  for select to authenticated using (true);

drop policy if exists "posts public read" on public.group_posts;
create policy "posts public read" on public.group_posts
  for select to authenticated using (true);

-- وعمود مفتاح الطقس، إن لم يكن قد أُضيف بعد.
alter table public.app_settings add column if not exists weather_enabled boolean not null default true;

select 'أُقفلت القراءة بلا حساب على سبعة جداول.' as "تمّ";
