# Supabase SQL Schema — Kiné Excellence Messaging

Colle ce SQL dans le **SQL Editor** de ton projet Supabase (https://supabase.com/dashboard/project/_/sql/new), puis clique **Run**.

```sql
-- ─────────────────────────────────────────
-- 1. PROFILES (extension de auth.users)
-- ─────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        text not null check (role in ('patient', 'doctor')),
  avatar_url  text,
  created_at  timestamptz default now()
);

-- Trigger : créer automatiquement un profil lors du signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'patient')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────
-- 2. CONVERSATIONS
-- ─────────────────────────────────────────
create table if not exists public.conversations (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.profiles(id) on delete cascade,
  doctor_id        uuid not null references public.profiles(id) on delete cascade,
  created_at       timestamptz default now(),
  last_message_at  timestamptz,
  unique (patient_id, doctor_id)
);

-- ─────────────────────────────────────────
-- 3. MESSAGES
-- ─────────────────────────────────────────
create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  sender_id        uuid not null references public.profiles(id) on delete cascade,
  content          text not null,
  created_at       timestamptz default now(),
  read_at          timestamptz
);

-- Index pour les queries fréquentes
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
create index if not exists messages_created_at_idx on public.messages(created_at);

-- ─────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- PROFILES
create policy "Profiles are viewable by all authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

-- CONVERSATIONS
create policy "Users can view their own conversations"
  on public.conversations for select to authenticated using (
    auth.uid() = patient_id or auth.uid() = doctor_id
  );

create policy "Patients can create conversations"
  on public.conversations for insert to authenticated with check (
    auth.uid() = patient_id
  );

create policy "Participants can update conversation"
  on public.conversations for update to authenticated using (
    auth.uid() = patient_id or auth.uid() = doctor_id
  );

-- MESSAGES
create policy "Participants can view messages"
  on public.messages for select to authenticated using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.patient_id = auth.uid() or c.doctor_id = auth.uid())
    )
  );

create policy "Participants can send messages"
  on public.messages for insert to authenticated with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.patient_id = auth.uid() or c.doctor_id = auth.uid())
    )
  );

create policy "Participants can mark messages as read"
  on public.messages for update to authenticated using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.patient_id = auth.uid() or c.doctor_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────
-- 5. REALTIME — activer les tables
-- ─────────────────────────────────────────
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

-- ─────────────────────────────────────────
-- 6. DONNÉES DE TEST
-- ─────────────────────────────────────────
-- Crée d'abord les comptes dans Authentication > Users :
--   doctor@kine-excellence.fr  |  password: Doctor123!  |  metadata: {"full_name":"Dr. Pierre Laurent","role":"doctor"}
--   patient@email.com          |  password: Patient123! |  metadata: {"full_name":"Marie Dupont","role":"patient"}
```

## Variables d'environnement

Crée un fichier `.env.local` à la racine du projet avec :

```
VITE_SUPABASE_URL=https://TON_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=TON_ANON_KEY
```

Récupère ces valeurs dans **Settings > API** de ton projet Supabase.
