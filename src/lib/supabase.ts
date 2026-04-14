import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase env variables missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local"
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);

// ─── Types aligned with DB schema ──────────────────────────────────────────

export type UserRole = "patient" | "doctor";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  patient_id: string;
  doctor_id: string;
  created_at: string;
  last_message_at: string | null;
  patient?: Profile;
  doctor?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  sender?: Profile;
}

export interface GalleryPhoto {
  id: string;
  title: string;
  description: string | null;
  image_base64: string | null;  // legacy — conservé pour compatibilité
  image_url: string | null;     // nouveau — URL Supabase Storage
  media_type: "image" | "video";
  created_at: string;
  is_published: boolean;
}

export type SiteContentType = "text" | "textarea" | "image";

export interface SiteContent {
  id: string;
  page: string;
  section: string;
  key: string;
  value: string;
  type: SiteContentType;
  label: string;
  updated_at: string;
}

export interface TeamMemberDB {
  id: string;
  name: string;
  title: string;
  specialty: string;
  bio: string;
  photo_base64: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface ConsultationSchedule {
  day_of_week: number; // 0=Dimanche … 6=Samedi (JS getDay())
  start_time: string;  // "HH:MM:SS"
  is_active: boolean;
  updated_at: string;
}

export interface Review {
  id: string;
  patient_name: string;
  rating: number;          // 1–5
  comment: string;
  review_date: string;     // "YYYY-MM-DD"
  is_visible: boolean;
  created_at: string;
}

export type BookingRequestStatus = "pending" | "validated" | "rejected";

export interface BookingRequest {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  service_id: string | null;
  service_name: string;
  service_price: number | null;
  payment_screenshot: string | null;
  status: BookingRequestStatus;
  assigned_date: string | null;   // "YYYY-MM-DD"
  assigned_time: string | null;   // "HH:MM:SS"
  rejection_reason: string | null;
  email_sent: boolean;
  created_at: string;
}
