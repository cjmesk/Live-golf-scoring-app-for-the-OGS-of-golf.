create table if not exists players (
  id text primary key,
  name text not null,
  ghin text,
  handicap_index numeric,
  preferred_tee text,
  active boolean default true
);

create table if not exists courses (
  id text primary key,
  name text not null,
  par integer not null,
  raw_data jsonb default '{}'::jsonb
);

create table if not exists rounds (
  id text primary key,
  played_at timestamptz not null,
  course_id text references courses(id),
  completed boolean default false,
  raw_data jsonb not null
);

create table if not exists round_players (
  round_id text references rounds(id) on delete cascade,
  player_id text not null,
  tee text not null,
  handicap_index numeric,
  course_handicap integer,
  primary key (round_id, player_id)
);

create table if not exists hole_scores (
  id bigint generated always as identity primary key,
  round_id text references rounds(id) on delete cascade,
  player_id text not null,
  hole integer not null,
  tee text not null,
  par integer not null,
  handicap integer not null,
  yards integer,
  gross integer,
  strokes_received integer default 0,
  net integer,
  points integer default 0
);

create table if not exists round_results (
  round_id text references rounds(id) on delete cascade,
  player_id text not null,
  gross_total integer,
  net_total integer,
  points_total integer,
  front_points integer,
  back_points integer,
  skins_won integer,
  skin_holes integer[] default '{}',
  primary key (round_id, player_id)
);

alter table players enable row level security;
alter table courses enable row level security;
alter table rounds enable row level security;
alter table round_players enable row level security;
alter table hole_scores enable row level security;
alter table round_results enable row level security;

create policy "allow public read players" on players for select using (true);
create policy "allow public read courses" on courses for select using (true);
create policy "allow public read rounds" on rounds for select using (true);
create policy "allow public read round_players" on round_players for select using (true);
create policy "allow public read hole_scores" on hole_scores for select using (true);
create policy "allow public read round_results" on round_results for select using (true);

create policy "allow public insert players" on players for insert with check (true);
create policy "allow public update players" on players for update using (true);
create policy "allow public insert courses" on courses for insert with check (true);
create policy "allow public update courses" on courses for update using (true);
create policy "allow public insert rounds" on rounds for insert with check (true);
create policy "allow public update rounds" on rounds for update using (true);
create policy "allow public insert round_players" on round_players for insert with check (true);
create policy "allow public update round_players" on round_players for update using (true);
create policy "allow public insert hole_scores" on hole_scores for insert with check (true);
create policy "allow public delete hole_scores" on hole_scores for delete using (true);
create policy "allow public insert round_results" on round_results for insert with check (true);
create policy "allow public update round_results" on round_results for update using (true);
