-- ============================================================================
-- رسائل صوتية في المحادثات
-- ============================================================================
-- الصقه كاملًا في Supabase ← SQL Editor ← Run.
-- تنفيذه مرّتين لا يضرّ، ولا يحذف شيئًا، وهو يُنشئ الحاوية app-private إن لم تكن
-- موجودة. وإن نفّذتَ lock-media.sql بعده فأعد تنفيذ هذا الملفّ: ذاك يكتب سياسات
-- الحاوية من جديد بلا علمٍ بالمحادثات.
--
-- ما الذي يتغيّر؟
--   • عمودان في chat_messages: audio_url و audio_ms.
--   • ملفّ التسجيل يُرفع إلى app-private/chat/<رقم المحادثة>/…: حاويةٌ مغلقة،
--     لا تُقرأ إلا بتوقيعٍ مؤقّت، ولا يُعطاه إلا أعضاء تلك المحادثة وحدهم.
--   • الإدارة لا تسمع المحادثات: تسمع تسجيلًا واحدًا فقط إن بلّغ عنه أحد
--     أعضائه، كما لا ترى منها إلا النصّ المُبلَّغ عنه.
--   • والمُبلَّغ عنه لا يستطيع محو الدليل: ملفٌّ مُبلَّغ عنه لا يُحذف بيد صاحبه.
-- ============================================================================

-- ٠) الحاوية المغلقة نفسها
-- كانت تُنشأ في lock-media.sql وحده، ومن لم ينفّذه لم تكن عنده حاوية: فيفشل
-- رفع التسجيل بـ«Bucket not found». تُنشأ هنا أيضًا، وتكرارها لا يضرّ.
insert into storage.buckets (id, name, public, file_size_limit)
values ('app-private', 'app-private', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = 26214400;

-- ١) الأعمدة
alter table public.chat_messages add column if not exists audio_url text;
alter table public.chat_messages add column if not exists audio_ms integer;
do $$ begin
  -- سقف التسجيل في التطبيق دقيقتان؛ والزيادة هامشُ أخطاء القياس لا أكثر.
  alter table public.chat_messages add constraint chat_messages_audio_ms_check
    check (audio_ms is null or (audio_ms >= 0 and audio_ms <= 130000));
exception when duplicate_object then null; end $$;

-- نسخةٌ من رابط التسجيل وقت البلاغ، كما يُنسخ النصّ: حذف الرسالة بعده لا
-- يمحو الدليل.
alter table public.chat_reports add column if not exists audio_url text;

-- ٢) الإرسال: رابط التسجيل يجب أن يكون في مجلّد هذه المحادثة نفسها.
--    وإلا أشار عضوٌ في محادثة إلى ملفّ محادثةٍ أخرى فيُعرض على الإدارة من بلاغٍ
--    كاذب. (والقراءة نفسها لا تنفتح له، فهذا إحكامٌ لا سدّ ثغرة مفتوحة.)
drop policy if exists "messages send" on public.chat_messages;
create policy "messages send" on public.chat_messages
  for insert to authenticated
  with check (
    auth.uid() = sender_id
    and public.is_chat_member(conversation_id)
    and (
      audio_url is null
      or position('/chat/' || conversation_id::text || '/' in audio_url) > 0
    )
  );

-- ٣) هل ملفٌّ ما مُبلَّغٌ عنه؟
--    security definer عمدًا: سياسة قراءة البلاغات للإدارة وحدها، فلو سأل
--    صاحبُ الملفّ بنفسه لَما رأى بلاغًا عليه — فيحذف الدليل وهو لا يدري.
create or replace function public.chat_audio_reported(p_name text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from chat_reports r
    where r.audio_url is not null and position(p_name in r.audio_url) > 0
  );
$$;
grant execute on function public.chat_audio_reported(text) to authenticated;

-- ٤) سياسات الحاوية المغلقة
-- الرفع إلى chat/ لأعضاء المحادثة المسمّاة في المسار فقط. والمسار يُتحقَّق
-- من شكله قبل تحويله إلى uuid، داخل CASE لأن Postgres لا يضمن ترتيب and.
drop policy if exists "app private insert" on storage.objects;
create policy "app private insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'app-private'
    and auth.uid() is not null
    and case
      when coalesce((storage.foldername(name))[1], '') <> 'chat' then true
      when (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.is_chat_member(((storage.foldername(name))[2])::uuid)
      else false
    end
  );

-- القراءة: messages/ لصاحبها وللإدارة، وchat/ لأعضاء المحادثة (وللإدارة إن
-- كان الملفّ موضوع بلاغ)، وما سواهما لكل مسجَّل.
drop policy if exists "app private read" on storage.objects;
create policy "app private read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'app-private'
    and case coalesce((storage.foldername(name))[1], '')
      when 'messages' then owner = auth.uid() or public.is_admin()
      when 'chat' then
        case
          when (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then public.is_chat_member(((storage.foldername(name))[2])::uuid)
                 or (public.is_admin() and public.chat_audio_reported(name))
          else false
        end
      else true
    end
  );

-- الحذف: صاحب الملفّ أو الإدارة، إلا أن يكون الملفّ موضوع بلاغ فلا يحذفه صاحبه.
drop policy if exists "app private owner delete" on storage.objects;
create policy "app private owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'app-private'
    and (
      public.is_admin()
      or (owner = auth.uid() and not public.chat_audio_reported(name))
    )
  );

-- ٥) قائمة المحادثات: آخر رسالة صوتية تُكتب «رسالة صوتية» لا فراغًا.
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
      select case
        when msg.audio_url is not null and msg.body = '' then 'رسالة صوتية'
        when msg.image is not null and msg.body = '' then 'صورة'
        else msg.body
      end
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

-- ٦) البلاغ: يُنسخ رابط التسجيل مع النصّ.
create or replace function public.report_chat_message(p_message uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_body text; v_sender uuid; v_audio text;
begin
  if not exists (
    select 1 from chat_messages m
    where m.id = p_message and public.is_chat_member(m.conversation_id)
  ) then
    raise exception 'forbidden';
  end if;
  select m.body, m.sender_id, m.audio_url into v_body, v_sender, v_audio
  from chat_messages m where m.id = p_message;
  insert into chat_reports (message_id, reporter_id, reported_user_id, body, reason, audio_url)
  values (p_message, auth.uid(), v_sender, coalesce(v_body, ''), coalesce(trim(p_reason), ''), v_audio);
end $$;
grant execute on function public.report_chat_message(uuid, text) to authenticated;
