alter table players enable row level security;

drop policy if exists "allow public read players" on players;
drop policy if exists "allow public insert players" on players;
drop policy if exists "allow public update players" on players;

create policy "allow public read players" on players for select using (true);
create policy "allow public insert players" on players for insert with check (true);
create policy "allow public update players" on players for update using (true);
