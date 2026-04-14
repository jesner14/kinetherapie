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

create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
create index if not exists messages_created_at_idx on public.messages(created_at);

-- ─────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Profiles are viewable by all authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

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
-- 5. REALTIME
-- ─────────────────────────────────────────
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

-- ─────────────────────────────────────────
-- 6. SITE CONTENT (textes & images du site)
-- ─────────────────────────────────────────
create table if not exists public.site_content (
  id          text primary key,            -- ex: "home.hero.slide1.title"
  page        text not null,               -- "home" | "about" | "contact" | "team" | "global"
  section     text not null,               -- "hero" | "services" | "stats" | "values" | ...
  key         text not null,               -- "title" | "subtitle" | "text" | "image" | ...
  value       text not null default '',    -- valeur texte ou base64 pour images
  type        text not null default 'text' check (type in ('text', 'textarea', 'image')),
  label       text not null default '',    -- libelle lisible pour l'admin
  updated_at  timestamptz default now()
);

alter table public.site_content enable row level security;

-- Lecture publique (anon + authenticated)
create policy "site_content readable by all"
  on public.site_content for select using (true);

-- Ecriture réservée aux doctors
create policy "site_content writable by doctors"
  on public.site_content for all to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor')
  );

-- ─────────────────────────────────────────
-- 7. TEAM MEMBERS
-- ─────────────────────────────────────────
create table if not exists public.team_members (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  title         text not null,
  specialty     text not null,
  bio           text not null default '',
  photo_base64  text,                        -- image en base64 ou URL
  order_index   integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz default now()
);

alter table public.team_members enable row level security;

create policy "team_members readable by all"
  on public.team_members for select using (true);

create policy "team_members writable by doctors"
  on public.team_members for all to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor')
  );

-- ─────────────────────────────────────────
-- 8. DISPONIBILITÉS MÉDECIN
-- ─────────────────────────────────────────
drop table if exists public.availabilities;

create table if not exists public.availabilities (
  id           uuid primary key default gen_random_uuid(),
  doctor_id    uuid not null references public.profiles(id) on delete cascade,
  slot_date    date not null,
  start_time   time not null,
  end_time     time not null,
  is_active    boolean not null default true,
  created_at   timestamptz default now(),
  constraint no_overlap_check check (start_time < end_time)
);

create index if not exists availabilities_doctor_date_idx on public.availabilities(doctor_id, slot_date);

alter table public.availabilities enable row level security;

create policy "availabilities readable by all"
  on public.availabilities for select using (true);

create policy "availabilities writable by doctors"
  on public.availabilities for all to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor')
  );

-- ─────────────────────────────────────────
-- 9. GALLERY PHOTOS
-- ─────────────────────────────────────────
create table if not exists public.gallery_photos (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  image_base64  text,                        -- legacy : image en base64 ou URL directe
  image_url     text,                        -- URL Supabase Storage (nouveau)
  media_type    text not null default 'image' check (media_type in ('image', 'video')),
  is_published  boolean not null default false,
  created_at    timestamptz default now()
);

-- Migration pour les bases déjà existantes (sans erreur si colonne déjà présente)
alter table public.gallery_photos add column if not exists image_url   text;
alter table public.gallery_photos add column if not exists media_type  text not null default 'image'
  check (media_type in ('image', 'video'));

alter table public.gallery_photos enable row level security;

create policy "gallery_photos readable by all"
  on public.gallery_photos for select using (true);

create policy "gallery_photos writable by doctors"
  on public.gallery_photos for all to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor')
  );

-- ─────────────────────────────────────────
-- 10. RESERVATIONS (appointments patients)
-- ─────────────────────────────────────────
create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  availability_id  uuid not null references public.availabilities(id) on delete cascade,
  patient_id       uuid not null references public.profiles(id) on delete cascade,
  doctor_id        uuid not null references public.profiles(id) on delete cascade,
  status           text not null default 'pending'
                     check (status in ('pending', 'confirmed', 'rejected', 'rescheduled')),
  note             text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists appointments_availability_idx on public.appointments(availability_id);
create index if not exists appointments_patient_idx      on public.appointments(patient_id);
create index if not exists appointments_doctor_idx       on public.appointments(doctor_id);
create index if not exists appointments_status_idx       on public.appointments(status);

alter table public.appointments enable row level security;

-- All authenticated users see confirmed appointments (to know which slots are taken)
-- + each patient sees their own appointments (all statuses)
-- + doctors see everything
create policy "appointments select"
  on public.appointments for select to authenticated
  using (
    auth.uid() = patient_id
    or status = 'confirmed'
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor')
  );

-- Patients can create their own pending appointments
create policy "patients create appointments"
  on public.appointments for insert to authenticated
  with check (auth.uid() = patient_id);

-- Doctors can update appointment status (confirm, reject, reschedule)
create policy "doctors update appointments"
  on public.appointments for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));

-- Doctors can also insert appointments (rescheduling creates a new confirmed row)
create policy "doctors insert appointments"
  on public.appointments for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));

alter publication supabase_realtime add table public.appointments;

-- ─────────────────────────────────────────
-- 11. MESSAGES DU FORMULAIRE DE CONTACT
-- ─────────────────────────────────────────
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text,
  message    text not null,
  status     text not null default 'new' check (status in ('new', 'read', 'replied')),
  created_at timestamptz default now()
);

alter table public.contact_messages enable row level security;

-- Tout visiteur (même anonyme) peut soumettre un message
create policy "public can submit contact message"
  on public.contact_messages for insert
  with check (true);

-- Seuls les médecins authentifiés peuvent lire
create policy "doctors read contact messages"
  on public.contact_messages for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));

-- Les médecins peuvent mettre à jour le statut
create policy "doctors update contact messages"
  on public.contact_messages for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));

alter publication supabase_realtime add table public.contact_messages;

-- ─────────────────────────────────────────
-- 12. SERVICES / PRESTATIONS MÉDICALES
-- ─────────────────────────────────────────
create table if not exists public.services (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text,
  price          numeric(10, 2),
  -- Le lien Wave global est stocké dans site_content (id: global.wave.payment_link)
  is_active      boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz default now()
);

alter table public.services enable row level security;

-- Lecture publique : seuls les services actifs sont visibles côté client
create policy "services readable by all (active only)"
  on public.services for select
  using (is_active = true);

-- Les médecins peuvent lire tous les services (y compris inactifs)
create policy "services readable by doctors"
  on public.services for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor')
  );

-- Les médecins peuvent créer / modifier / supprimer des services
create policy "services writable by doctors"
  on public.services for all to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor')
  );

-- ─────────────────────────────────────────
-- 13. JOURS DE CONSULTATION
-- ─────────────────────────────────────────
create table if not exists public.consultation_schedules (
  day_of_week  integer primary key check (day_of_week between 0 and 6),
  -- 0=Dimanche  1=Lundi  2=Mardi  3=Mercredi  4=Jeudi  5=Vendredi  6=Samedi
  start_time   time not null default '09:00:00',
  is_active    boolean not null default false,
  updated_at   timestamptz default now()
);

alter table public.consultation_schedules enable row level security;

create policy "consultation_schedules readable by all"
  on public.consultation_schedules for select using (true);

create policy "consultation_schedules writable by doctors"
  on public.consultation_schedules for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));

-- Pré-remplissage des 7 jours (inactifs par défaut)
insert into public.consultation_schedules (day_of_week, start_time, is_active)
values (0,'09:00',false),(1,'09:00',false),(2,'09:00',false),(3,'09:00',false),
       (4,'09:00',false),(5,'09:00',false),(6,'09:00',false)
on conflict (day_of_week) do nothing;

-- ─────────────────────────────────────────
-- 14. DEMANDES DE RÉSERVATION
-- ─────────────────────────────────────────
create table if not exists public.booking_requests (
  id                  uuid primary key default gen_random_uuid(),
  first_name          text not null,
  last_name           text not null,
  phone               text not null,
  email               text not null,
  service_id          uuid references public.services(id) on delete set null,
  service_name        text not null,
  service_price       numeric(10, 2),
  payment_screenshot  text,             -- base64 de la capture de paiement
  status              text not null default 'pending'
                        check (status in ('pending', 'validated', 'rejected')),
  assigned_date       date,
  assigned_time       time,
  rejection_reason    text,
  created_at          timestamptz default now()
);

alter table public.booking_requests enable row level security;

create policy "public can submit booking request"
  on public.booking_requests for insert with check (true);

create policy "doctors read booking requests"
  on public.booking_requests for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));

create policy "doctors update booking requests"
  on public.booking_requests for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));

create policy "doctors delete booking requests"
  on public.booking_requests for delete to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));

alter publication supabase_realtime add table public.booking_requests;

-- ─────────────────────────────────────────
-- 9. SEED: contenu initial du site
-- ─────────────────────────────────────────
insert into public.site_content (id, page, section, key, value, type, label) values
-- HOME — Hero slide 1
('home.hero.slide1.title',       'home', 'hero', 'slide1_title',    'Kiné Excellence — Votre Récupération, Notre Priorité',                                          'text',     'Hero Slide 1 — Titre'),
('home.hero.slide1.text',        'home', 'hero', 'slide1_text',     'Des soins personnalisés pour retrouver mobilité, force et bien-être. Experts en rééducation.',  'textarea', 'Hero Slide 1 — Texte'),
('home.hero.slide1.cta',         'home', 'hero', 'slide1_cta',      'Prendre Rendez-vous',                                                                           'text',     'Hero Slide 1 — Bouton'),
('home.hero.slide1.image',       'home', 'hero', 'slide1_image',    'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1400',                              'image',    'Hero Slide 1 — Image'),
-- HOME — Hero slide 2
('home.hero.slide2.title',       'home', 'hero', 'slide2_title',    'Rééducation de Haute Précision',                                                               'text',     'Hero Slide 2 — Titre'),
('home.hero.slide2.text',        'home', 'hero', 'slide2_text',     'Une équipe diplômée et une approche personnalisée pour accélérer votre récupération.',          'textarea', 'Hero Slide 2 — Texte'),
('home.hero.slide2.cta',         'home', 'hero', 'slide2_cta',      'Découvrir l''équipe',                                                                           'text',     'Hero Slide 2 — Bouton'),
('home.hero.slide2.image',       'home', 'hero', 'slide2_image',    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1400',                           'image',    'Hero Slide 2 — Image'),
-- HOME — Hero slide 3
('home.hero.slide3.title',       'home', 'hero', 'slide3_title',    'Cabinet Moderne et Humain',                                                                     'text',     'Hero Slide 3 — Titre'),
('home.hero.slide3.text',        'home', 'hero', 'slide3_text',     'Des équipements récents et un accompagnement bienveillant à chaque étape.',                     'textarea', 'Hero Slide 3 — Texte'),
('home.hero.slide3.cta',         'home', 'hero', 'slide3_cta',      'En savoir plus',                                                                                'text',     'Hero Slide 3 — Bouton'),
('home.hero.slide3.image',       'home', 'hero', 'slide3_image',    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1400',                           'image',    'Hero Slide 3 — Image'),
-- HOME — Stats
('home.stats.patients',          'home', 'stats', 'patients',       '3000+',                                                                                         'text',     'Stats — Patients suivis (valeur)'),
('home.stats.patients_label',    'home', 'stats', 'patients_label', 'Patients suivis',                                                                               'text',     'Stats — Patients suivis (label)'),
('home.stats.satisfaction',      'home', 'stats', 'satisfaction',   '98%',                                                                                           'text',     'Stats — Satisfaction (valeur)'),
('home.stats.satisfaction_label','home', 'stats', 'satisfaction_label','Satisfaction',                                                                               'text',     'Stats — Satisfaction (label)'),
('home.stats.years',             'home', 'stats', 'years',          '15+',                                                                                           'text',     'Stats — Années d''expérience (valeur)'),
('home.stats.years_label',       'home', 'stats', 'years_label',    'Années d''expérience',                                                                          'text',     'Stats — Années d''expérience (label)'),
('home.stats.care',              'home', 'stats', 'care',           'Personnalisée',                                                                                 'text',     'Stats — Prise en charge (valeur)'),
('home.stats.care_label',        'home', 'stats', 'care_label',     'Prise en charge',                                                                               'text',     'Stats — Prise en charge (label)'),
-- HOME — Services section
('home.services.title',          'home', 'services', 'title',       'Nos Expertises Thérapeutiques',                                                                 'text',     'Services — Titre de section'),
('home.services.subtitle',       'home', 'services', 'subtitle',    'Une gamme complète de soins kinésithérapiques pour chaque besoin.',                             'textarea', 'Services — Sous-titre'),
('home.services.s1_title',       'home', 'services', 's1_title',    'Rééducation Sportive',                                                                          'text',     'Service 1 — Titre'),
('home.services.s1_text',        'home', 'services', 's1_text',     'Reprenez votre activité en sécurité après blessure.',                                           'textarea', 'Service 1 — Texte'),
('home.services.s2_title',       'home', 'services', 's2_title',    'Post-Opératoire',                                                                               'text',     'Service 2 — Titre'),
('home.services.s2_text',        'home', 'services', 's2_text',     'Suivi ciblé et progressif après intervention.',                                                 'textarea', 'Service 2 — Texte'),
('home.services.s3_title',       'home', 'services', 's3_title',    'Rééducation Périnéale',                                                                         'text',     'Service 3 — Titre'),
('home.services.s3_text',        'home', 'services', 's3_text',     'Prise en charge spécialisée pré/post-natal.',                                                   'textarea', 'Service 3 — Texte'),
('home.services.s4_title',       'home', 'services', 's4_title',    'Thérapie Manuelle',                                                                             'text',     'Service 4 — Titre'),
('home.services.s4_text',        'home', 'services', 's4_text',     'Techniques expertes pour soulager vos douleurs.',                                               'textarea', 'Service 4 — Texte'),
-- HOME — CTA section
('home.cta.title',               'home', 'cta', 'title',            'Prêt à relancer votre mobilité ?',                                                              'text',     'CTA — Titre'),
('home.cta.text',                'home', 'cta', 'text',             'Planifiez votre première séance et bénéficiez d''un accompagnement professionnel, humain et mesurable.',  'textarea', 'CTA — Texte'),
('home.cta.button',              'home', 'cta', 'button',           'Réserver maintenant',                                                                           'text',     'CTA — Bouton'),
-- ABOUT — Hero
('about.hero.title',             'about', 'hero', 'title',          'Excellence, Écoute et Dévouement',                                                              'text',     'About — Titre du hero'),
('about.hero.image',             'about', 'hero', 'image',          'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1400',                           'image',    'About — Image du hero'),
-- ABOUT — Histoire
('about.history.title',          'about', 'history', 'title',       'Notre Histoire',                                                                                'text',     'Histoire — Titre'),
('about.history.text1',          'about', 'history', 'text1',       'Fondé il y a plus de 15 ans, notre cabinet s''est construit sur une volonté d''offrir des soins de kinésithérapie d''excellence dans un cadre humain et bienveillant.',  'textarea', 'Histoire — Paragraphe 1'),
('about.history.text2',          'about', 'history', 'text2',       'Nous croyons fermement qu''une rééducation efficace repose sur un mélange d''expertise clinique, d''écoute active et d''objectifs clairs. Chaque patient bénéficie d''un plan adapté, revu régulièrement selon sa progression.',  'textarea', 'Histoire — Paragraphe 2'),
-- ABOUT — Stats
('about.stats.years',            'about', 'stats', 'years',         '15+',                                                                                           'text',     'About Stats — Années'),
('about.stats.years_label',      'about', 'stats', 'years_label',   'Ans d''expérience',                                                                             'text',     'About Stats — Années (label)'),
('about.stats.patients',         'about', 'stats', 'patients',      '3000+',                                                                                         'text',     'About Stats — Patients'),
('about.stats.patients_label',   'about', 'stats', 'patients_label','Patients suivis',                                                                               'text',     'About Stats — Patients (label)'),
('about.stats.satisfaction',     'about', 'stats', 'satisfaction',  '98%',                                                                                           'text',     'About Stats — Satisfaction'),
('about.stats.satisfaction_label','about','stats', 'satisfaction_label','Satisfaction',                                                                              'text',     'About Stats — Satisfaction (label)'),
('about.stats.team',             'about', 'stats', 'team',          '5',                                                                                             'text',     'About Stats — Professionnels'),
('about.stats.team_label',       'about', 'stats', 'team_label',    'Professionnels',                                                                                'text',     'About Stats — Professionnels (label)'),
-- ABOUT — Values
('about.values.title',           'about', 'values', 'title',        'Nos Valeurs',                                                                                   'text',     'Valeurs — Titre'),
('about.values.v1_title',        'about', 'values', 'v1_title',     'Excellence',                                                                                    'text',     'Valeur 1 — Titre'),
('about.values.v1_text',         'about', 'values', 'v1_text',      'Nous garantissons des soins de haut niveau, basés sur des protocoles fiables.',                 'textarea', 'Valeur 1 — Texte'),
('about.values.v2_title',        'about', 'values', 'v2_title',     'Écoute',                                                                                        'text',     'Valeur 2 — Titre'),
('about.values.v2_text',         'about', 'values', 'v2_text',      'Chaque patient est écouté, compris et accompagné selon son rythme.',                            'textarea', 'Valeur 2 — Texte'),
('about.values.v3_title',        'about', 'values', 'v3_title',     'Précision',                                                                                     'text',     'Valeur 3 — Titre'),
('about.values.v3_text',         'about', 'values', 'v3_text',      'Chaque séance suit des objectifs concrets et mesurables.',                                      'textarea', 'Valeur 3 — Texte'),
('about.values.v4_title',        'about', 'values', 'v4_title',     'Engagement',                                                                                    'text',     'Valeur 4 — Titre'),
('about.values.v4_text',         'about', 'values', 'v4_text',      'Nous nous investissons pleinement dans votre récupération.',                                    'textarea', 'Valeur 4 — Texte'),
-- ABOUT — Mission
('about.mission.title',          'about', 'mission', 'title',       'Notre Mission',                                                                                 'text',     'Mission — Titre'),
('about.mission.text',           'about', 'mission', 'text',        'Offrir à chaque patient des soins de kinésithérapie de la plus haute qualité dans un environnement professionnel et chaleureux. Nous vous accompagnons tout au long de votre parcours avec expertise, compassion et détermination.',  'textarea', 'Mission — Texte'),
-- CONTACT — Info
('contact.hero.title',           'contact', 'hero', 'title',        'Contactez-Nous',                                                                                'text',     'Contact — Titre hero'),
('contact.hero.text',            'contact', 'hero', 'text',         'Nous sommes à votre écoute pour répondre à vos questions et planifier votre prise en charge.',  'textarea', 'Contact — Texte hero'),
('contact.info.address1',        'contact', 'info', 'address1',     '123 Rue de la Santé',                                                                           'text',     'Contact — Adresse ligne 1'),
('contact.info.address2',        'contact', 'info', 'address2',     '75000 Paris, France',                                                                           'text',     'Contact — Adresse ligne 2'),
('contact.info.phone1',          'contact', 'info', 'phone1',       '01 23 45 67 89',                                                                                'text',     'Contact — Téléphone principal'),
('contact.info.phone2',          'contact', 'info', 'phone2',       'Urgences: 06 98 76 54 32',                                                                      'text',     'Contact — Téléphone urgences'),
('contact.info.email1',          'contact', 'info', 'email1',       'contact@kine-excellence.fr',                                                                    'text',     'Contact — Email principal'),
('contact.info.email2',          'contact', 'info', 'email2',       'rdv@kine-excellence.fr',                                                                        'text',     'Contact — Email RDV'),
('contact.info.hours1',          'contact', 'info', 'hours1',       'Lundi - Vendredi : 8h - 19h',                                                                   'text',     'Contact — Horaires lundi-vendredi'),
('contact.info.hours2',          'contact', 'info', 'hours2',       'Samedi : 9h - 13h',                                                                             'text',     'Contact — Horaires samedi'),
('contact.info.hours3',          'contact', 'info', 'hours3',       'Dimanche : Fermé',                                                                              'text',     'Contact — Horaires dimanche'),
('contact.info.office_image',    'contact', 'info', 'office_image', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900',                            'image',    'Contact — Photo du cabinet'),
-- TEAM — Page hero
('team.hero.title',              'team', 'hero', 'title',           'Notre Équipe',                                                                                  'text',     'Équipe — Titre hero'),
('team.hero.text',               'team', 'hero', 'text',            'Des professionnels passionnés et expérimentés, dédiés à votre bien-être et votre rétablissement.', 'textarea', 'Équipe — Texte hero'),
-- TEAM — Qualifications
('team.qualifications.title',    'team', 'qualifications', 'title', 'Nos Qualifications',                                                                            'text',     'Qualifications — Titre'),
('team.qualifications.q1_title', 'team', 'qualifications', 'q1_title','Diplômes d''État',                                                                           'text',     'Qualification 1 — Titre'),
('team.qualifications.q1_text',  'team', 'qualifications', 'q1_text', 'Tous nos kinésithérapeutes sont diplômés d''État et inscrits au Conseil de l''Ordre.',        'textarea', 'Qualification 1 — Texte'),
('team.qualifications.q2_title', 'team', 'qualifications', 'q2_title','Formation Continue',                                                                          'text',     'Qualification 2 — Titre'),
('team.qualifications.q2_text',  'team', 'qualifications', 'q2_text', 'Mise à jour régulière des compétences avec des formations spécialisées.',                     'textarea', 'Qualification 2 — Texte'),
('team.qualifications.q3_title', 'team', 'qualifications', 'q3_title','Spécialisations',                                                                             'text',     'Qualification 3 — Titre'),
('team.qualifications.q3_text',  'team', 'qualifications', 'q3_text', 'Expertise en rééducation sportive, neurologique, respiratoire et périnéale.',                 'textarea', 'Qualification 3 — Texte'),
-- GLOBAL
('global.cabinet_name',          'global', 'brand', 'cabinet_name', 'Kiné Excellence',                                                                               'text',     'Nom du cabinet'),
('global.tagline',               'global', 'brand', 'tagline',      'Kinésithérapie Premium',                                                                        'text',     'Slogan du cabinet'),
('global.logo_url',              'global', 'brand', 'logo_url',     '',                                                                                              'image',    'Logo du cabinet'),
-- FOOTER
('footer.brand.name',            'footer', 'brand', 'name',         'Kiné Excellence',                                                                               'text',     'Footer — Nom du cabinet'),
('footer.brand.description',     'footer', 'brand', 'description',  'Centre de kinésithérapie moderne offrant des soins personnalisés et de qualité depuis 2010.',    'textarea', 'Footer — Description'),
('footer.contact.address',       'footer', 'contact', 'address',    '123 Rue de la Santé, Paris',                                                                    'text',     'Footer — Adresse'),
('footer.contact.phone',         'footer', 'contact', 'phone',      '01 23 45 67 89',                                                                                'text',     'Footer — Téléphone'),
('footer.contact.email',         'footer', 'contact', 'email',      'contact@kine-excellence.fr',                                                                    'text',     'Footer — Email'),
('footer.hours.weekdays',        'footer', 'hours', 'weekdays',     'Lun – Ven : 8h – 19h',                                                                          'text',     'Footer — Horaires lundi-vendredi'),
('footer.hours.saturday',        'footer', 'hours', 'saturday',     'Samedi : 9h – 13h',                                                                             'text',     'Footer — Horaires samedi'),
('footer.hours.sunday',          'footer', 'hours', 'sunday',       'Dimanche : Fermé',                                                                              'text',     'Footer — Dimanche'),
('footer.legal.copyright',       'footer', 'legal', 'copyright',    '© 2026 Kiné Excellence. Tous droits réservés.',                                                  'text',     'Footer — Copyright'),
-- FOOTER — Réseaux sociaux
('footer.social.whatsapp.url',      'footer', 'social', 'whatsapp_url',      '',      'text', 'Footer — WhatsApp (lien)'),
('footer.social.whatsapp.visible',  'footer', 'social', 'whatsapp_visible',  'false', 'text', 'Footer — WhatsApp visible'),
('footer.social.facebook.url',      'footer', 'social', 'facebook_url',      '',      'text', 'Footer — Facebook (lien)'),
('footer.social.facebook.visible',  'footer', 'social', 'facebook_visible',  'false', 'text', 'Footer — Facebook visible'),
('footer.social.instagram.url',     'footer', 'social', 'instagram_url',     '',      'text', 'Footer — Instagram (lien)'),
('footer.social.instagram.visible', 'footer', 'social', 'instagram_visible', 'false', 'text', 'Footer — Instagram visible'),
('footer.social.tiktok.url',        'footer', 'social', 'tiktok_url',        '',      'text', 'Footer — TikTok (lien)'),
('footer.social.tiktok.visible',    'footer', 'social', 'tiktok_visible',    'false', 'text', 'Footer — TikTok visible'),
('footer.social.twitter.url',       'footer', 'social', 'twitter_url',       '',      'text', 'Footer — Twitter/X (lien)'),
('footer.social.twitter.visible',   'footer', 'social', 'twitter_visible',   'false', 'text', 'Footer — Twitter/X visible')
on conflict (id) do nothing;

-- SEED: membres de l'équipe initiaux
insert into public.team_members (name, title, specialty, bio, photo_base64, order_index, is_active) values
(
  'Dr. Pierre Laurent',
  'Kinésithérapeute D.E.',
  'Rééducation sportive et traumatologie',
  '15 ans d''expérience en rééducation sportive. Diplômé de l''IFMK de Paris.',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400',
  1,
  true
),
(
  'Dr. Sophie Moreau',
  'Kinésithérapeute D.E.',
  'Rééducation périnéale et post-natale',
  'Spécialisée en rééducation périnéale avec une approche holistique.',
  'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400',
  2,
  true
),
(
  'Dr. Thomas Dubois',
  'Kinésithérapeute D.E.',
  'Thérapie manuelle et ostéopathie',
  'Expert en thérapie manuelle et traitement des douleurs chroniques.',
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400',
  3,
  true
)
;

-- ─────────────────────────────────────────
-- 15. AVIS PATIENTS
-- ─────────────────────────────────────────
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  patient_name  text not null,
  rating        integer not null check (rating between 1 and 5),
  comment       text not null default '',
  review_date   date not null default current_date,
  is_visible    boolean not null default true,
  created_at    timestamptz default now()
);

alter table public.reviews enable row level security;

-- Lecture publique : seuls les avis visibles sont lisibles côté client
create policy "reviews readable by all (visible only)"
  on public.reviews for select
  using (is_visible = true);

-- Les médecins peuvent lire tous les avis (y compris masqués)
create policy "reviews readable by doctors"
  on public.reviews for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor')
  );

-- Les médecins peuvent créer / modifier / supprimer des avis
create policy "reviews writable by doctors"
  on public.reviews for all to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor')
  );

-- SEED : avis initiaux
insert into public.reviews (patient_name, rating, comment, review_date, is_visible) values
('Marie Dupont',   5, 'Excellent professionnel ! J''ai retrouvé ma mobilité après seulement quelques séances. Je recommande vivement.', '2026-03-15', true),
('Jean Martin',    5, 'Très compétent et à l''écoute. Le cabinet est moderne et bien équipé.',                                          '2026-03-10', true),
('Sophie Bernard', 4, 'Bon suivi et conseils personnalisés. Merci pour votre professionnalisme.',                                        '2026-03-05', true)
on conflict do nothing;
on conflict do nothing;
