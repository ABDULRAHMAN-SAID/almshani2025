-- ============================================================================
-- الأصدقاء والمحادثات الخاصة والمجموعات
-- ============================================================================
-- الصقه في Supabase ← SQL Editor ← Run. تنفيذه مرّتين لا يضرّ.
--
-- ما يحكم هذا التصميم: لا أحد يقرأ محادثةً ليس فيها. لا الإدارة ولا من عرف
-- معرّف المحادثة. وهذا يُفرض في الخادم بسياسات RLS لا في شاشات التطبيق،
-- إذ الشاشة تُخفي الزرّ ولا تمنع الطلب.
--
-- ولا يُراسِل إلا صديق: من لم يُقبل طلبه لا يصل إليه شيء — وبلا هذا يصير
-- التطبيق بابًا لكل من عرف اسم أحدهم أن يكتب إليه.
-- ============================================================================

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
