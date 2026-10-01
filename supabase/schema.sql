-- Colle ce script dans Supabase : SQL Editor → New query → Run
-- Projet : aljasquvpmcespjwnmmb
-- Install neuve (avec auteur). Base existante : utiliser migration-auteur.sql

create table if not exists public.phrases (
  jour date not null,
  auteur text not null default 'zakaria' check (auteur in ('zakaria', 'anyssa')),
  texte text not null check (char_length(texte) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (jour, auteur)
);

create table if not exists public.notes (
  jour date primary key,
  score smallint not null check (score between 1 and 10),
  commentaire text not null default '' check (char_length(commentaire) <= 400),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_phrase_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists phrases_updated_at on public.phrases;
create trigger phrases_updated_at
before update on public.phrases
for each row execute function public.touch_phrase_updated_at();

create or replace function public.touch_note_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_updated_at on public.notes;
create trigger notes_updated_at
before update on public.notes
for each row execute function public.touch_note_updated_at();

alter table public.phrases enable row level security;
alter table public.notes enable row level security;

drop policy if exists "phrases pour le site" on public.phrases;
create policy "phrases pour le site"
on public.phrases
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "notes pour le site" on public.notes;
create policy "notes pour le site"
on public.notes
for all
to anon, authenticated
using (true)
with check (true);

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.phrases to anon, authenticated, service_role;
grant select, insert, update, delete on public.notes to anon, authenticated, service_role;

insert into public.phrases (jour, auteur, texte)
values (
  '2026-09-28',
  'zakaria',
  'Oui, effectivement, j''ai pris 2h à faire tout ça. Mais réellement, la femme avec qui je parle, elle vaut beaucoup plus que 2h.'
)
on conflict (jour, auteur) do update set texte = excluded.texte, updated_at = now();

notify pgrst, 'reload schema';
