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
-- 8. GALLERY PHOTOS
-- ─────────────────────────────────────────
create table if not exists public.gallery_photos (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  image_base64  text,                        -- image en base64 ou URL
  is_published  boolean not null default false,
  created_at    timestamptz default now()
);

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
('global.tagline',               'global', 'brand', 'tagline',      'Kinésithérapie Premium',                                                                        'text',     'Slogan du cabinet')
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
on conflict do nothing;
