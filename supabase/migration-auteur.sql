-- À lancer une fois dans Supabase SQL Editor (si la table phrases existe déjà)

alter table public.notes drop constraint if exists notes_jour_fkey;

alter table public.phrases add column if not exists auteur text;

update public.phrases
set auteur = 'zakaria'
where auteur is null or auteur = '';

alter table public.phrases alter column auteur set default 'zakaria';
alter table public.phrases alter column auteur set not null;

alter table public.phrases drop constraint if exists phrases_pkey;
alter table public.phrases drop constraint if exists phrases_auteur_check;

alter table public.phrases
add constraint phrases_auteur_check check (auteur in ('zakaria', 'anyssa'));

alter table public.phrases add primary key (jour, auteur);

notify pgrst, 'reload schema';
