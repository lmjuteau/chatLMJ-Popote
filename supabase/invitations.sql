-- chatLMJ Popote : invitations privées (à exécuter une fois dans Supabase SQL Editor)
create table if not exists public.popote_invitations (
 id uuid primary key default gen_random_uuid(),
 family_id uuid not null references public.popote_families(id) on delete cascade,
 email text not null,
 token uuid not null unique default gen_random_uuid(),
 invited_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now() + interval '14 days'),
 accepted_at timestamptz
);
create index if not exists popote_invitations_token_idx on public.popote_invitations(token);
alter table public.popote_invitations enable row level security;
revoke all on public.popote_invitations from anon, authenticated;
create or replace function public.popote_invite_member(p_family_id uuid,p_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_token uuid; v_email text;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 if not exists(select 1 from public.popote_members where family_id=p_family_id and user_id=auth.uid() and role='admin') then
  raise exception 'Seul un administrateur peut inviter';
 end if;
 v_email:=lower(btrim(p_email));
 if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(v_email)>254 then
  raise exception 'Adresse courriel invalide';
 end if;
 if exists(select 1 from public.popote_members m join auth.users u on u.id=m.user_id where m.family_id=p_family_id and lower(u.email)=v_email) then
  raise exception 'Cette personne est déjà membre';
 end if;
 update public.popote_invitations set expires_at=now()
 where family_id=p_family_id and email=v_email and accepted_at is null and expires_at>now();
 insert into public.popote_invitations(family_id,email,invited_by) values(p_family_id,v_email,auth.uid()) returning token into v_token;
 return v_token;
end $$;
create or replace function public.popote_accept_invitation(p_token uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_inv public.popote_invitations%rowtype; v_email text; v_confirmed timestamptz;
begin
 if auth.uid() is null then raise exception 'Connecte-toi avant d’accepter'; end if;
 select lower(email),email_confirmed_at into v_email,v_confirmed from auth.users where id=auth.uid();
 if v_confirmed is null then raise exception 'Confirme ton adresse courriel'; end if;
 select * into v_inv from public.popote_invitations where token=p_token for update;
 if not found or v_inv.accepted_at is not null or v_inv.expires_at<=now() then raise exception 'Invitation invalide ou expirée'; end if;
 if lower(v_inv.email)<>v_email then raise exception 'Cette invitation est destinée à une autre adresse courriel'; end if;
 if exists(select 1 from public.popote_members where user_id=auth.uid()) then raise exception 'Ce compte appartient déjà à un foyer'; end if;
 insert into public.popote_members(family_id,user_id,role) values(v_inv.family_id,auth.uid(),'member');
 update public.popote_invitations set accepted_at=now() where id=v_inv.id;
 return v_inv.family_id;
end $$;
revoke all on function public.popote_invite_member(uuid,text) from public,anon;
revoke all on function public.popote_accept_invitation(uuid) from public,anon;
grant execute on function public.popote_invite_member(uuid,text) to authenticated;
grant execute on function public.popote_accept_invitation(uuid) to authenticated;
