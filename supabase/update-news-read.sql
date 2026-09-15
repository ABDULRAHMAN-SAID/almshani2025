-- ============================================================================
-- تحديث: نقطة لمن قرأ الخبر
-- ============================================================================
-- الصقه كاملًا في Supabase ← SQL Editor ← Run.
-- تنفيذه مرّتين لا يضرّ: كل جملة فيه تتخطّى ما هو موجود.
-- ============================================================================

-- ١) قيمة جديدة لسبب النقاط.
--    تُنفَّذ وحدها أوّلًا: بعض إصدارات Postgres لا تسمح باستعمال قيمةٍ جديدة
--    في نفس المعاملة التي أُضيفت فيها.
alter type points_reason add value if not exists 'news_read';

-- ٢) ما قرأه كلٌّ من الأخبار.
--    المفتاح الأوّلي (القارئ، الخبر) هو ما يمنع منح النقطة مرّتين: الصفّ
--    الثاني يُرفض، فلا يصير زرّ «قرأته» عدّادًا يُضغط.
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

-- ٣) الدالة التي تمنح النقطة — من الخادم لا من الهاتف.
--    لو كان الهاتف هو من يكتب النقطة لكتبها من شاء كما شاء بلا أن يفتح خبرًا.
--    ونقطتان لا عشر: القراءة أيسر من الحضور ومن الإجابة الصحيحة، وتسويتها
--    بهما تجعل جمع النقاط بالضغط أربح من الحضور.
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

-- ============================================================================
-- تمّ. للتأكد:  select * from public.news_reads;
-- ============================================================================
