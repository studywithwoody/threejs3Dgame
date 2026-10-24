-- Run this in the Supabase SQL Editor AFTER `npm run db:migrate`.
-- Better Auth connects as the database owner and bypasses RLS.
-- The browser uses the publishable/anon key, so these policies matter.

alter table public."user" enable row level security;
alter table public.session enable row level security;
alter table public.account enable row level security;
alter table public.verification enable row level security;
alter table public.island_progress enable row level security;

revoke all on table public."user" from anon, authenticated;
revoke all on table public.session from anon, authenticated;
revoke all on table public.account from anon, authenticated;
revoke all on table public.verification from anon, authenticated;

grant select, insert, update on table public.island_progress to anon, authenticated;

drop policy if exists island_progress_read on public.island_progress;
drop policy if exists island_progress_insert on public.island_progress;
drop policy if exists island_progress_update on public.island_progress;

create policy island_progress_read
  on public.island_progress for select
  to anon, authenticated
  using (true);

create policy island_progress_insert
  on public.island_progress for insert
  to anon, authenticated
  with check (true);

create policy island_progress_update
  on public.island_progress for update
  to anon, authenticated
  using (true)
  with check (true);
