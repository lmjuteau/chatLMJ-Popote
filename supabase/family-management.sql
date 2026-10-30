-- chatLMJ Popote : consultation sécurisée des membres et invitations du foyer
-- À exécuter dans Supabase SQL Editor.
create or replace function public.popote_family_members(p_family_id uuid)
returns table(user_id uuid, email text, member_role text, joined_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
begin
 if auth.uid() is null or not exists (
  select 1 from public.popote_members m
  where m.family_id=p_family_id and m.user_id=auth.uid()
 ) then raise exception 'Accès au foyer refusé'; end if;
 return query
 select m.user_id, u.email::text, m.role::text, null::timestamptz
 from public.popote_members m
 join auth.users u on u.id=m.user_id
 where m.family_id=p_family_id
 order by case when m.role='admin' then 0 else 1 end, u.email;
end $$;

create or replace function public.popote_pending_invitations(p_family_id uuid)
returns table(invitation_id uuid, invited_email text, created_at timestamptz, expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
begin
 if auth.uid() is null or not exists (
  select 1 from public.popote_members m
  where m.family_id=p_family_id and m.user_id=auth.uid() and m.role='admin'
 ) then raise exception 'Seul un administrateur peut consulter les invitations'; end if;
 return query
 select i.id, i.email::text, i.created_at, i.expires_at
 from public.popote_invitations i
 where i.family_id=p_family_id and i.accepted_at is null and i.expires_at>now()
 order by i.created_at desc;
end $$;

create or replace function public.popote_revoke_invitation(p_invitation_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_family uuid;
begin
 select i.family_id into v_family from public.popote_invitations i
 where i.id=p_invitation_id and i.accepted_at is null and i.expires_at>now();
 if v_family is null then return false; end if;
 if auth.uid() is null or not exists (
  select 1 from public.popote_members m
  where m.family_id=v_family and m.user_id=auth.uid() and m.role='admin'
 ) then raise exception 'Seul un administrateur peut annuler une invitation'; end if;
 update public.popote_invitations set expires_at=now()
 where id=p_invitation_id and accepted_at is null and expires_at>now();
 return found;
end $$;

revoke all on function public.popote_family_members(uuid) from public,anon;
revoke all on function public.popote_pending_invitations(uuid) from public,anon;
revoke all on function public.popote_revoke_invitation(uuid) from public,anon;
grant execute on function public.popote_family_members(uuid) to authenticated;
grant execute on function public.popote_pending_invitations(uuid) to authenticated;
grant execute on function public.popote_revoke_invitation(uuid) to authenticated;
