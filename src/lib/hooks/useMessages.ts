import { useEffect, useRef, useState, useCallback } from "react";
import { supabase, type Message } from "../supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

export function useMessages(
  conversationId: string | null,
  onNewMessage?: (msg: Message) => void
) {
  // Use a ref to avoid stale closure in Realtime callback
  const onNewMessageRef = useRef(onNewMessage);
  useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*, sender:profiles(*)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) console.error("Error fetching messages:", error.message);
    setMessages((data as Message[]) ?? []);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    fetchMessages();

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to new messages — no filter to avoid free-tier Realtime limitations
    // We filter client-side after receiving
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          // Only handle messages for this conversation
          if (payload.new.conversation_id !== conversationId) return;
          // Fetch the full message with sender profile
          const { data } = await supabase
            .from("messages")
            .select("*, sender:profiles(*)")
            .eq("id", payload.new.id)
            .single();
          if (data) {
            setMessages((prev: Message[]) => {
              // Avoid duplicates
              if (prev.find((m) => m.id === (data as Message).id)) return prev;
              return [...prev, data as Message];
            });
            onNewMessageRef.current?.(data as Message);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchMessages]);

  const sendMessage = async (content: string, senderId: string) => {
    if (!conversationId || !content.trim()) return { error: "No conversation" };

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
    });

    if (error) {
      console.error("Error sending message:", error.message);
      return { error: error.message };
    }

    // Update last_message_at on the conversation
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    return { error: null };
  };

  const markRead = async (senderId: string) => {
    if (!conversationId) return;
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", senderId)
      .is("read_at", null);
  };

  return { messages, loading, sendMessage, markRead };
}
