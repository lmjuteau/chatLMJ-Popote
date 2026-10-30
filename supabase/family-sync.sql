-- chatLMJ Popote v0.7 : stockage familial avec contrôle d'accès par foyer
create table if not exists public.popote_family_items (
 family_id uuid not null references public.popote_families(id) on delete cascade,
 kind text not null check(kind in ('inventory','recipes','shopping','plan')),
 item_id text not null,
 payload jsonb not null,
 updated_at timestamptz not null default now(),
 primary key(family_id,kind,item_id)
);
create index if not exists popote_family_items_family_idx on public.popote_family_items(family_id,kind);
alter table public.popote_family_items enable row level security;
drop policy if exists popote_items_read on public.popote_family_items;
drop policy if exists popote_items_insert on public.popote_family_items;
drop policy if exists popote_items_update on public.popote_family_items;
drop policy if exists popote_items_delete on public.popote_family_items;
create policy popote_items_read on public.popote_family_items for select to authenticated using (
 exists(select 1 from public.popote_members m where m.family_id=popote_family_items.family_id and m.user_id=(select auth.uid()))
);
create policy popote_items_insert on public.popote_family_items for insert to authenticated with check (
 exists(select 1 from public.popote_members m where m.family_id=popote_family_items.family_id and m.user_id=(select auth.uid()))
);
create policy popote_items_update on public.popote_family_items for update to authenticated using (
 exists(select 1 from public.popote_members m where m.family_id=popote_family_items.family_id and m.user_id=(select auth.uid()))
) with check (
 exists(select 1 from public.popote_members m where m.family_id=popote_family_items.family_id and m.user_id=(select auth.uid()))
);
create policy popote_items_delete on public.popote_family_items for delete to authenticated using (
 exists(select 1 from public.popote_members m where m.family_id=popote_family_items.family_id and m.user_id=(select auth.uid()))
);
grant select,insert,update,delete on public.popote_family_items to authenticated;
-- Realtime pour recevoir les changements d'autres appareils.
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='popote_family_items') then
  alter publication supabase_realtime add table public.popote_family_items;
 end if;
end $$;
