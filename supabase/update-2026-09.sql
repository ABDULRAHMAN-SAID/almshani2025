-- ============================================================================
-- تحديث: الأخبار + درجات الصلاحية + منحها من داخل التطبيق
-- ============================================================================
-- لمن أنشأ قاعدته قبل هذا التحديث. تنفيذه مرّتين لا يضرّ.
-- ============================================================================

-- ============ ١) الأخبار ============
create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  body text not null default '',
  scope text not null check (scope in ('world', 'oman')),
  source text not null default '',
  url text,
  image text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists news_scope_published_idx on public.news (scope, published_at desc);
alter table public.news enable row level security;

drop policy if exists "news read" on public.news;
create policy "news read" on public.news for select to authenticated using (true);

drop policy if exists "news admin write" on public.news;
create policy "news admin write" on public.news
  for all using (public.is_admin()) with check (public.is_admin());

-- ============ ٢) درجات الصلاحية ============
alter table public.admins add column if not exists role text not null default 'admin';

do $$ begin
  alter table public.admins add constraint admins_role_check
    check (role in ('owner', 'admin', 'editor'));
exception when duplicate_object then null; end $$;

-- أوّل من أُدرج هو المالك، إن لم يكن ثمّة مالك.
update public.admins set role = 'owner'
where user_id = (select user_id from public.admins order by created_at asc limit 1)
  and not exists (select 1 from public.admins where role = 'owner');

create or replace function public.admin_role()
returns text language sql stable security definer set search_path = public as $$
  select role from admins where user_id = auth.uid();
$$;
grant execute on function public.admin_role() to authenticated;

create or replace function public.is_full_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid() and role in ('owner', 'admin'));
$$;
grant execute on function public.is_full_admin() to authenticated;

-- ============ ٣) البحث والمنح والسحب ============
create or replace function public.find_member(p_query text)
returns table (user_id uuid, full_name text, phone text, email text, role text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_full_admin() then
    raise exception 'ليست لديك صلاحية البحث عن الأعضاء';
  end if;
  if length(coalesce(trim(p_query), '')) < 3 then
    raise exception 'اكتب ثلاثة أحرف على الأقل';
  end if;
  return query
    select u.id, u.full_name, u.phone, u.email, a.role
    from users u
    left join admins a on a.user_id = u.id
    where lower(u.email) = lower(trim(p_query))
       or replace(u.phone, ' ', '') like '%' || replace(trim(p_query), ' ', '') || '%'
       or u.full_name ilike '%' || trim(p_query) || '%'
    limit 10;
end;
$$;
grant execute on function public.find_member(text) to authenticated;

create or replace function public.grant_admin(p_user_id uuid, p_role text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_caller text := public.admin_role();
  v_target text;
begin
  if v_caller is null or v_caller = 'editor' then
    raise exception 'ليست لديك صلاحية منح الصلاحيات';
  end if;
  if p_role not in ('admin', 'editor') then
    raise exception 'الدرجة غير صحيحة';
  end if;
  if v_caller = 'admin' and p_role <> 'editor' then
    raise exception 'الإداري يمنح درجة المحرّر فقط';
  end if;
  if not exists (select 1 from users where id = p_user_id) then
    raise exception 'لا يوجد عضو بهذا المعرّف';
  end if;
  select role into v_target from admins where user_id = p_user_id;
  if v_target = 'owner' then
    raise exception 'لا تُغيَّر درجة المالك';
  end if;
  insert into admins (user_id, role) values (p_user_id, p_role)
  on conflict (user_id) do update set role = excluded.role;
  return p_role;
end;
$$;
grant execute on function public.grant_admin(uuid, text) to authenticated;

create or replace function public.revoke_admin(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_caller text := public.admin_role();
  v_target text;
begin
  if v_caller is null or v_caller = 'editor' then
    raise exception 'ليست لديك صلاحية سحب الصلاحيات';
  end if;
  select role into v_target from admins where user_id = p_user_id;
  if v_target is null then return false; end if;
  if v_target = 'owner' then
    raise exception 'لا تُسحب صلاحية المالك';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'لا تسحب صلاحيتك من نفسك';
  end if;
  if v_caller = 'admin' and v_target <> 'editor' then
    raise exception 'الإداري يسحب درجة المحرّر فقط';
  end if;
  delete from admins where user_id = p_user_id;
  return true;
end;
$$;
grant execute on function public.revoke_admin(uuid) to authenticated;

-- ============ ٤) ما صار للإدارة الكاملة وحدها ============
drop policy if exists "settings admin write" on public.app_settings;
create policy "settings admin write" on public.app_settings
  for update using (public.is_full_admin()) with check (public.is_full_admin());

drop policy if exists "contact admin write" on public.app_contact;
create policy "contact admin write" on public.app_contact
  for all using (public.is_full_admin()) with check (public.is_full_admin());

select
  (select count(*) from public.admins where role = 'owner') as owners,
  (select count(*) from public.news) as news_rows,
  'done' as status;
