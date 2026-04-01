import { useState, useEffect, useCallback } from "react";
import { supabase, TeamMemberDB } from "../supabase";

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMemberDB[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("is_active", true)
      .order("order_index");

    if (error) {
      console.error("[useTeamMembers] fetch error:", error.message);
    } else {
      setMembers(data as TeamMemberDB[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const addMember = useCallback(
    async (
      member: Omit<TeamMemberDB, "id" | "created_at">
    ): Promise<{ error: string | null }> => {
      const { data, error } = await supabase
        .from("team_members")
        .insert(member)
        .select()
        .single();

      if (error) return { error: error.message };
      setMembers((prev) =>
        [...prev, data as TeamMemberDB].sort((a, b) => a.order_index - b.order_index)
      );
      return { error: null };
    },
    []
  );

  const updateMember = useCallback(
    async (
      id: string,
      updates: Partial<Omit<TeamMemberDB, "id" | "created_at">>
    ): Promise<{ error: string | null }> => {
      const { error } = await supabase
        .from("team_members")
        .update(updates)
        .eq("id", id);

      if (error) return { error: error.message };
      setMembers((prev) =>
        prev
          .map((m) => (m.id === id ? { ...m, ...updates } : m))
          .sort((a, b) => a.order_index - b.order_index)
      );
      return { error: null };
    },
    []
  );

  const deleteMember = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      const { error } = await supabase
        .from("team_members")
        .update({ is_active: false })
        .eq("id", id);

      if (error) return { error: error.message };
      setMembers((prev) => prev.filter((m) => m.id !== id));
      return { error: null };
    },
    []
  );

  return { members, loading, addMember, updateMember, deleteMember, refetch: fetchMembers };
}
