import { useEffect, useRef, useState, useCallback } from "react";
import { supabase, type Conversation, type Profile } from "../supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

export function useConversations(userId: string | null, role: "patient" | "doctor" | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [doctors, setDoctors] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!userId || !role) return;
    setLoading(true);

    // Fetch conversations without FK hints to avoid name mismatch issues
    let query = supabase
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (role === "patient") {
      query = query.eq("patient_id", userId);
    } else {
      query = query.eq("doctor_id", userId);
    }

    const { data: convData, error: convError } = await query;
    if (convError) {
      console.error("Error fetching conversations:", convError.message);
      setLoading(false);
      return;
    }

    if (!convData || convData.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Fetch all involved profiles in one query
    const allIds = [...new Set([
      ...convData.map((c: any) => c.patient_id),
      ...convData.map((c: any) => c.doctor_id),
    ])];

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .in("id", allIds);

    const profileMap = new Map((profilesData ?? []).map((p: Profile) => [p.id, p]));

    const enriched = convData.map((c: any) => ({
      ...c,
      patient: profileMap.get(c.patient_id) ?? null,
      doctor: profileMap.get(c.doctor_id) ?? null,
    }));

    setConversations(enriched as Conversation[]);
    setLoading(false);
  }, [userId, role]);

  const fetchDoctors = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "doctor");
    setDoctors((data as Profile[]) ?? []);
  }, []);

  useEffect(() => {
    fetchConversations();
    if (role === "patient") fetchDoctors();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    if (!userId) return;

    const channel = supabase
      .channel(`conversations:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, role, fetchConversations, fetchDoctors]);

  /**
   * Get or create a conversation between a patient and a doctor.
   * Returns the conversation id.
   */
  const getOrCreateConversation = async (
    patientId: string,
    doctorId: string
  ): Promise<string | null> => {
    // Check if conversation already exists
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("patient_id", patientId)
      .eq("doctor_id", doctorId)
      .maybeSingle();

    if (existing) return existing.id;

    // Create new conversation
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ patient_id: patientId, doctor_id: doctorId })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating conversation:", error.message);
      return null;
    }

    return created.id;
  };

  /**
   * Unread count in a conversation for the given user
   */
  const unreadCount = (conversationId: string): number => {
    // This is a derived value — for real-time unread we keep it simple:
    // messages without read_at from the other party
    // We'll compute this separately when needed
    return 0;
  };

  return {
    conversations,
    doctors,
    loading,
    getOrCreateConversation,
    refetch: fetchConversations,
    unreadCount,
  };
}
