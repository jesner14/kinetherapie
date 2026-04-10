import { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, Check, CheckCheck, Loader2, UserCircle2, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../lib/AuthContext";
import { useConversations } from "../../../lib/hooks/useConversations";
import { useMessages } from "../../../lib/hooks/useMessages";
import { supabase } from "../../../lib/supabase";
import type { Conversation, Profile } from "../../../lib/supabase";
import { PageLoader } from "../common/PageLoader";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "maintenant";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const s = size === "sm" ? "w-8 h-8 text-xs" : "w-9 h-9 text-sm";
  return (
    <div className={`${s} rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center shrink-0`}>
      {initials}
    </div>
  );
}

export function AdminMessages() {
  const { user, profile } = useAuth();
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [unreadConvIds, setUnreadConvIds] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  const { conversations, loading: convsLoading } = useConversations(
    user?.id ?? null,
    profile?.role ?? null
  );

  // Toast when a new message arrives in the currently open conversation
  const { messages, loading: msgsLoading, sendMessage, markRead } = useMessages(
    selectedConv?.id ?? null,
    (msg) => {
      if (msg.sender_id !== user?.id) {
        const senderName = (msg.sender as Profile)?.full_name ?? "Patient";
        toast.info(`💬 ${senderName}`, {
          description: msg.content.length > 80 ? msg.content.slice(0, 80) + "…" : msg.content,
        });
      }
    }
  );

  // Watch ALL new messages to badge non-selected conversations
  useEffect(() => {
    if (!user?.id || conversations.length === 0) return;

    const channel = supabase
      .channel("admin-unread-watch")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as { sender_id: string; conversation_id: string; content: string };
          // Ignore own messages and messages in the currently selected conversation
          if (msg.sender_id === user.id) return;
          if (msg.conversation_id === selectedConv?.id) return;
          // Only badge if it belongs to one of our conversations
          const conv = conversations.find((c) => c.id === msg.conversation_id);
          if (!conv) return;
          setUnreadConvIds((prev) => new Set([...prev, msg.conversation_id]));
          const patientName = (conv.patient as Profile | undefined)?.full_name ?? "Patient";
          toast.info(`💬 ${patientName}`, { description: msg.content.length > 80 ? msg.content.slice(0, 80) + "…" : msg.content });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, conversations, selectedConv?.id]);

  // Auto-select first conversation
  useEffect(() => {
    if (conversations.length > 0 && !selectedConv) {
      setSelectedConv(conversations[0]);
    }
  }, [conversations]);

  // Mark messages as read + scroll
  useEffect(() => {
    if (selectedConv && user?.id) markRead(user.id);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.id || sending) return;
    setSending(true);
    await sendMessage(newMessage, user.id);
    setNewMessage("");
    setSending(false);
  };

  const filteredConvs = conversations.filter((c) => {
    const patientName = (c.patient as Profile)?.full_name?.toLowerCase() ?? "";
    return patientName.includes(search.toLowerCase());
  });

  const selectedPatient = selectedConv?.patient as Profile | undefined;

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3 text-gray-400">
        <UserCircle2 size={40} className="opacity-40" />
        <p className="text-sm">Connectez-vous pour accéder à la messagerie.</p>
      </div>
    );
  }

  if (convsLoading) return <PageLoader text="Chargement de la messagerie..." />;

  return (
    <div className="space-y-3">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare size={20} className="text-brand-600" />
          Messagerie
        </h1>
        <p className="text-xs text-gray-500">Communiquez directement avec vos patients</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 h-[520px]">
        {/* ── Sidebar: patient list ───────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-3 border-b">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {convsLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 size={20} className="animate-spin text-brand-500" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <p className="text-xs text-gray-400 text-center p-4">Aucune conversation</p>
            ) : (
              filteredConvs.map((conv) => {
                const patient = conv.patient as Profile | undefined;
                const isSelected = conv.id === selectedConv?.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConv(conv);
                      setNewMessage("");
                      // Clear unread badge for this conversation
                      setUnreadConvIds((prev) => {
                        const next = new Set(prev);
                        next.delete(conv.id);
                        return next;
                      });
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors border-b border-gray-100 last:border-0 ${
                      isSelected
                        ? "bg-brand-50 text-brand-700"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <Avatar name={patient?.full_name ?? "?"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${isSelected ? "text-brand-700" : "text-gray-800"}`}>
                        {patient?.full_name ?? "Patient"}
                      </p>
                      {conv.last_message_at && (
                        <p className="text-[10px] text-gray-400">{relativeTime(conv.last_message_at)}</p>
                      )}
                    </div>
                    {unreadConvIds.has(conv.id) && (
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Conversation panel ──────────────────────────────── */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-gray-50">
            {selectedPatient ? (
              <>
                <Avatar name={selectedPatient.full_name} size="md" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selectedPatient.full_name}</p>
                  <p className="text-xs text-gray-400">Patient</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">Sélectionnez une conversation</p>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50">
            {!selectedConv ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-300">
                <MessageSquare size={36} className="opacity-40" />
                <p className="text-sm">Aucune conversation sélectionnée</p>
              </div>
            ) : msgsLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 size={24} className="animate-spin text-brand-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                <MessageSquare size={32} className="opacity-30" />
                <p className="text-sm">Aucun message dans cette conversation</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === user.id;
                const senderName = (msg.sender as Profile)?.full_name ?? "…";
                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                    {!isMe && <Avatar name={senderName} size="sm" />}
                    <div
                      className={`max-w-[72%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                        isMe
                          ? "bg-brand-600 text-white rounded-br-sm"
                          : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
                      }`}
                    >
                      <p className="leading-relaxed">{msg.content}</p>
                      <div className={`flex items-center gap-1 mt-0.5 justify-end text-[10px] ${isMe ? "text-brand-200" : "text-gray-400"}`}>
                        <span>{relativeTime(msg.created_at)}</span>
                        {isMe && (msg.read_at ? <CheckCheck size={12} /> : <Check size={12} />)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 border-t bg-white">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={selectedConv ? "Répondre au patient..." : "Sélectionnez une conversation"}
                disabled={!selectedConv || sending}
                className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-gray-50"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || !selectedConv || sending}
                className="flex items-center gap-1.5 bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Envoyer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
