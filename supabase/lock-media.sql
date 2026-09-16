-- ============================================================================
-- إقفال المرفقات الخاصّة
-- ============================================================================
--
-- ما الذي كان مفتوحًا؟ حاوية app-media كانت «معلنة» (public = true)، وحاوية
-- Supabase المعلنة تُقرأ برابطها بلا حساب ولا مفتاح — وتجاوزُ سياسات
-- الصلاحيات فيها ليس خرقًا بل تصميمُ الحاوية.
--
-- وكان فيها ما ليس معلنًا:
--   مرفقات مراسلة الإدارة (messages/) · مرفقات مشاركات المجموعات (posts/)
--
-- وأسوأ من الرابط أن سياسة القراءة كانت «using (bucket_id = ...)» بلا تقييدٍ
-- بالدور، فتنطبق على anon — وهو دور المفتاح العام الموجود في كل نسخة من
-- التطبيق. ومعناه أن أيّ أحد يستطيع أن يسرد أسماء الملفّات كلّها ثم يفتحها،
-- لا أن يفتح ما وصله رابطه فقط.
--
-- بعد هذا الملفّ:
--   • حاوية جديدة app-private مغلقة، فيها مرفقات المراسلات والمشاركات.
--     لا رابط دائم لها: التطبيق يطلب توقيعًا ينتهي بعد ساعة، ولا يُعطاه إلا
--     من تسمح له الصلاحيات — صاحبُ الرسالة والإدارة، والأعضاء للمشاركات.
--   • حاويتا app-media و activity-images تبقيان للأغلفة والأخبار وقوائم
--     النادي وجدول الرحلات، وقراءتهما تُقيَّد بـ authenticated فلا يسردهما
--     زائر.
--
-- كيف يُنفَّذ: Supabase ← SQL Editor ← الصق ← Run.
-- ولا يحذف ملفًّا ولا بيانًا.
-- ============================================================================

-- ١) الحاوية المغلقة
insert into storage.buckets (id, name, public, file_size_limit)
values ('app-private', 'app-private', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = 26214400;

-- الرفع: كلّ مسجَّل يرفع، وstorage تسجّل مالكه.
drop policy if exists "app private insert" on storage.objects;
create policy "app private insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'app-private' and auth.uid() is not null);

-- القراءة: مرفقات المراسلات لصاحبها وللإدارة، وما سواها لكل مسجَّل.
drop policy if exists "app private read" on storage.objects;
create policy "app private read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'app-private'
    and (
      (storage.foldername(name))[1] <> 'messages'
      or owner = auth.uid()
      or public.is_admin()
    )
  );

drop policy if exists "app private owner delete" on storage.objects;
create policy "app private owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'app-private' and (owner = auth.uid() or public.is_admin()));

-- ٢) الحاويتان المعلنتان: تُقيَّد قراءتهما بالمسجَّلين فلا يسردهما زائر
drop policy if exists "activity images public read" on storage.objects;
create policy "activity images public read" on storage.objects
  for select to authenticated using (bucket_id = 'activity-images');

drop policy if exists "app media public read" on storage.objects;
create policy "app media public read" on storage.objects
  for select to authenticated using (bucket_id = 'app-media');

-- ٣) ما رُفع قبل اليوم في messages/ و posts/ بقي في الحاوية المعلنة.
--    هذا يُريك كم هو، ولا يحذف شيئًا:
--    select name, created_at from storage.objects
--    where bucket_id = 'app-media'
--      and (storage.foldername(name))[1] in ('messages', 'posts')
--    order by created_at desc;
