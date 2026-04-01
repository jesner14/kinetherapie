export interface Review {
  id: string;
  patientName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface TeamMember {
  id: string;
  name: string;
  title: string;
  specialty: string;
  image: string;
  bio: string;
}

export interface TimeSlot {
  id: string;
  date: string;
  time: string;
  available: boolean;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastVisit: string;
}

export interface ContentSection {
  id: string;
  section: string;
  title: string;
  content: string;
  image?: string;
}

export const mockReviews: Review[] = [
  {
    id: "1",
    patientName: "Marie Dupont",
    rating: 5,
    comment: "Excellent professionnel ! J'ai retrouvé ma mobilité après seulement quelques séances. Je recommande vivement.",
    date: "2026-03-15",
  },
  {
    id: "2",
    patientName: "Jean Martin",
    rating: 5,
    comment: "Très compétent et à l'écoute. Le cabinet est moderne et bien équipé.",
    date: "2026-03-10",
  },
  {
    id: "3",
    patientName: "Sophie Bernard",
    rating: 4,
    comment: "Bon suivi et conseils personnalisés. Merci pour votre professionnalisme.",
    date: "2026-03-05",
  },
];

export const mockTeam: TeamMember[] = [
  {
    id: "1",
    name: "Dr. Pierre Laurent",
    title: "Kinésithérapeute D.E.",
    specialty: "Rééducation sportive et traumatologie",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400",
    bio: "15 ans d'expérience en rééducation sportive. Diplômé de l'IFMK de Paris.",
  },
  {
    id: "2",
    name: "Dr. Sophie Moreau",
    title: "Kinésithérapeute D.E.",
    specialty: "Rééducation périnéale et post-natale",
    image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400",
    bio: "Spécialisée en rééducation périnéale avec une approche holistique.",
  },
  {
    id: "3",
    name: "Dr. Thomas Dubois",
    title: "Kinésithérapeute D.E.",
    specialty: "Thérapie manuelle et ostéopathie",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400",
    bio: "Expert en thérapie manuelle et traitement des douleurs chroniques.",
  },
];

export const mockTimeSlots: TimeSlot[] = [
  { id: "1", date: "2026-03-31", time: "09:00", available: true },
  { id: "2", date: "2026-03-31", time: "10:00", available: true },
  { id: "3", date: "2026-03-31", time: "11:00", available: false },
  { id: "4", date: "2026-03-31", time: "14:00", available: true },
  { id: "5", date: "2026-03-31", time: "15:00", available: true },
  { id: "6", date: "2026-03-31", time: "16:00", available: true },
  { id: "7", date: "2026-04-01", time: "09:00", available: true },
  { id: "8", date: "2026-04-01", time: "10:00", available: true },
  { id: "9", date: "2026-04-01", time: "11:00", available: true },
  { id: "10", date: "2026-04-01", time: "14:00", available: false },
];

export const mockMessages: Message[] = [
  {
    id: "1",
    from: "Dr. Laurent",
    to: "Patient",
    content: "Bonjour, votre prochain rendez-vous est confirmé pour demain à 10h.",
    timestamp: "2026-03-29T15:30:00",
    read: true,
  },
  {
    id: "2",
    from: "Patient",
    to: "Dr. Laurent",
    content: "Merci ! J'ai une question sur les exercices à faire à la maison.",
    timestamp: "2026-03-29T16:00:00",
    read: true,
  },
  {
    id: "3",
    from: "Dr. Laurent",
    to: "Patient",
    content: "Bien sûr ! Continuez les étirements que nous avons vus ensemble, 3 fois par jour pendant 10 minutes.",
    timestamp: "2026-03-29T16:15:00",
    read: false,
  },
];

export const mockPatients: Patient[] = [
  {
    id: "1",
    name: "Marie Dupont",
    email: "marie.dupont@email.com",
    phone: "06 12 34 56 78",
    lastVisit: "2026-03-25",
  },
  {
    id: "2",
    name: "Jean Martin",
    email: "jean.martin@email.com",
    phone: "06 23 45 67 89",
    lastVisit: "2026-03-20",
  },
  {
    id: "3",
    name: "Sophie Bernard",
    email: "sophie.bernard@email.com",
    phone: "06 34 56 78 90",
    lastVisit: "2026-03-15",
  },
];

export const mockContent: ContentSection[] = [
  {
    id: "home-hero",
    section: "home",
    title: "Centre de Kinésithérapie Excellence",
    content: "Votre bien-être est notre priorité. Des soins personnalisés par des professionnels diplômés.",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200",
  },
  {
    id: "home-about",
    section: "home",
    title: "Nos Services",
    content: "Rééducation sportive, post-opératoire, périnéale, et bien plus encore. Des techniques modernes pour des résultats optimaux.",
  },
  {
    id: "about-intro",
    section: "about",
    title: "À Propos de Notre Cabinet",
    content: "Fondé en 2010, notre cabinet de kinésithérapie s'engage à offrir des soins de qualité supérieure dans un environnement moderne et accueillant. Notre équipe de professionnels qualifiés met tout en œuvre pour vous accompagner vers une récupération optimale.",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200",
  },
  {
    id: "about-values",
    section: "about",
    title: "Nos Valeurs",
    content: "Excellence - Nous nous engageons à fournir les meilleurs soins possibles. Écoute - Chaque patient est unique et mérite une attention personnalisée. Innovation - Nous utilisons les techniques les plus récentes et éprouvées.",
  },
];
