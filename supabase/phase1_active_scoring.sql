-- OGS Golf Phase 1 active scoring foundation.
-- Safe intent: add normalized active-match tables/columns without deleting
-- existing roster data, completed rounds, or rounds.raw_data history.

create extension if not exists pgcrypto;

create table if not exists round_groups (
  id text primary key,
  round_id text not null references rounds(id) on delete cascade,
  group_number integer not null,
  starting_hole integer not null default 1,
  holes_to_play integer not null default 18,
  status text not null default 'not_started',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint round_groups_status_check check (status in ('not_started', 'in_progress', 'completed')),
  constraint round_groups_starting_hole_check check (starting_hole between 1 and 18),
  constraint round_groups_holes_to_play_check check (holes_to_play between 1 and 18),
  constraint round_groups_round_number_unique unique (round_id, group_number)
);

alter table round_players add column if not exists id text;
alter table round_players add column if not exists group_id text references round_groups(id) on delete set null;
alter table round_players add column if not exists playing boolean not null default true;
alter table round_players add column if not exists skins_enabled boolean not null default false;
alter table round_players add column if not exists points_enabled boolean not null default false;
alter table round_players add column if not exists created_at timestamptz not null default now();
alter table round_players add column if not exists updated_at timestamptz not null default now();
update round_players
set id = coalesce(id, round_id || ':' || player_id)
where id is null;
alter table round_players alter column id set not null;
create unique index if not exists round_players_id_unique on round_players(id);

alter table hole_scores add column if not exists group_id text references round_groups(id) on delete set null;
alter table hole_scores add column if not exists updated_by text;
alter table hole_scores add column if not exists created_at timestamptz not null default now();
alter table hole_scores add column if not exists updated_at timestamptz not null default now();
alter table hole_scores alter column tee drop not null;
alter table hole_scores alter column par drop not null;
alter table hole_scores alter column handicap drop not null;
alter table hole_scores alter column strokes_received set default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'hole_scores_hole_check'
  ) then
    alter table hole_scores
      add constraint hole_scores_hole_check check (hole between 1 and 18);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'hole_scores_gross_positive_check'
  ) then
    alter table hole_scores
      add constraint hole_scores_gross_positive_check check (gross is null or gross > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'hole_scores_net_consistent_check'
  ) then
    alter table hole_scores
      add constraint hole_scores_net_consistent_check
      check (net is null or gross is null or net = gross - coalesce(strokes_received, 0));
  end if;
end $$;

create unique index if not exists hole_scores_round_player_hole_unique
  on hole_scores(round_id, player_id, hole);

create table if not exists player_statuses (
  id text primary key,
  round_id text not null references rounds(id) on delete cascade,
  player_id text not null,
  status text not null default 'active',
  holes_completed integer not null default 0,
  gross_strokes integer not null default 0,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_statuses_status_check check (status in ('active', 'dnf')),
  constraint player_statuses_holes_completed_check check (holes_completed between 0 and 18),
  constraint player_statuses_gross_strokes_check check (gross_strokes >= 0),
  constraint player_statuses_round_player_unique unique (round_id, player_id)
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_round_groups_updated_at on round_groups;
create trigger set_round_groups_updated_at
before update on round_groups
for each row execute function set_updated_at();

drop trigger if exists set_round_players_updated_at on round_players;
create trigger set_round_players_updated_at
before update on round_players
for each row execute function set_updated_at();

drop trigger if exists set_hole_scores_updated_at on hole_scores;
create trigger set_hole_scores_updated_at
before update on hole_scores
for each row execute function set_updated_at();

drop trigger if exists set_player_statuses_updated_at on player_statuses;
create trigger set_player_statuses_updated_at
before update on player_statuses
for each row execute function set_updated_at();

alter table round_groups enable row level security;
alter table player_statuses enable row level security;

drop policy if exists "allow beta read round_groups" on round_groups;
drop policy if exists "allow beta insert round_groups" on round_groups;
drop policy if exists "allow beta update round_groups" on round_groups;
create policy "allow beta read round_groups" on round_groups for select using (true);
create policy "allow beta insert round_groups" on round_groups for insert with check (true);
create policy "allow beta update round_groups" on round_groups for update using (true);

drop policy if exists "allow beta read player_statuses" on player_statuses;
drop policy if exists "allow beta insert player_statuses" on player_statuses;
drop policy if exists "allow beta update player_statuses" on player_statuses;
create policy "allow beta read player_statuses" on player_statuses for select using (true);
create policy "allow beta insert player_statuses" on player_statuses for insert with check (true);
create policy "allow beta update player_statuses" on player_statuses for update using (true);

drop policy if exists "allow public update hole_scores" on hole_scores;
create policy "allow public update hole_scores" on hole_scores for update using (true);
