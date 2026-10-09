-- fmcode.de: Kasten „Persönliche Seiten“ (persoenlich.js). Einmal im SQL-Editor von Supabase ausführen
-- (Projekt yzzipjtounvktdhhvrnt, dasselbe wie Mitbringliste, Petri Heil und Feuer Frei). Enthält keine Passwörter.
-- Die eigentlichen Einträge (welche Seiten, welches Konto freigegeben ist) stehen nicht im Repo, sie werden getrennt eingefügt.

-- Links, die nach der Anmeldung erscheinen
create table if not exists public.fm_seiten (
  id bigint generated always as identity primary key,
  titel text not null,
  beschreibung text,
  adresse text not null check (adresse like 'https://%'),
  reihenfolge int not null default 0
);

-- Konten, die die Links sehen dürfen (Nutzer-ID aus Authentication → Users)
create table if not exists public.fm_freigabe (
  uid uuid primary key references auth.users (id) on delete cascade
);

-- Row Level Security: ohne Anmeldung nichts, angemeldet nur mit Freigabe; schreiben nur über das Supabase-Dashboard
alter table public.fm_seiten enable row level security;
alter table public.fm_freigabe enable row level security;
revoke all on public.fm_seiten, public.fm_freigabe from anon;
revoke insert, update, delete, truncate on public.fm_seiten, public.fm_freigabe from authenticated;
grant select on public.fm_seiten, public.fm_freigabe to authenticated;

drop policy if exists fm_freigabe_eigene on public.fm_freigabe;
create policy fm_freigabe_eigene on public.fm_freigabe
  for select to authenticated using (uid = (select auth.uid()));

drop policy if exists fm_seiten_freigegeben on public.fm_seiten;
create policy fm_seiten_freigegeben on public.fm_seiten
  for select to authenticated using (exists (select 1 from public.fm_freigabe f where f.uid = (select auth.uid())));
