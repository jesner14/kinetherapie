import { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, ChevronDown, Check, CheckCheck, Loader2, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../lib/AuthContext";
import { useConversations } from "../../../lib/hooks/useConversations";
import { useMessages } from "../../../lib/hooks/useMessages";
import type { Profile } from "../../../lib/supabase";

// ─── Relative timestamp helper ────────────────────────────────────────────────
function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "maintenant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// ─── Avatar initials ──────────────────────────────────────────────────────────
function Avatar({ name, size = "sm", color = "green" }: { name: string; size?: "sm" | "md"; color?: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const s = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${s} rounded-full bg-${color}-100 text-${color}-700 font-bold flex items-center justify-center shrink-0`}>
      {initials}
    </div>
  );
}

export function PatientMessages() {
  const { user, profile } = useAuth();
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showDoctorPicker, setShowDoctorPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { doctors, getOrCreateConversation, loading: convsLoading } = useConversations(
    user?.id ?? null,
    profile?.role ?? null
  );

  const { messages, loading: msgsLoading, sendMessage, markRead } = useMessages(
    conversationId,
    (msg) => {
      if (msg.sender_id !== user?.id) {
        const senderName = (msg.sender as Profile)?.full_name ?? "Médecin";
        toast.info(`💬 ${senderName}`, {
          description: msg.content.length > 80 ? msg.content.slice(0, 80) + "…" : msg.content,
        });
      }
    }
  );

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  // Auto-select first doctor
  useEffect(() => {
    if (doctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors, selectedDoctorId]);

  // Load or create conversation when doctor changes
  useEffect(() => {
    if (!user?.id || !selectedDoctorId) return;
    getOrCreateConversation(user.id, selectedDoctorId).then((id) => {
      setConversationId(id);
    });
  }, [user?.id, selectedDoctorId]);

  // Mark messages as read + scroll to bottom
  useEffect(() => {
    if (conversationId && user?.id) markRead(user.id);
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

  // ── Fallback when not authenticated (Supabase not configured) ────────────
  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3 text-gray-400">
        <UserCircle2 size={40} className="opacity-40" />
        <p className="text-sm">Connectez-vous pour accéder à la messagerie.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare size={20} className="text-green-600" />
            Messagerie
          </h1>
          <p className="text-xs text-gray-500">Communiquez avec votre kinésithérapeute</p>
        </div>

        {/* Doctor picker */}
        {doctors.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowDoctorPicker((v) => !v)}
              className="flex items-center gap-2 text-sm border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
            >
              <span>{selectedDoctor?.full_name ?? "Choisir un médecin"}</span>
              <ChevronDown size={14} />
            </button>
            {showDoctorPicker && (
              <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {doctors.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setSelectedDoctorId(doc.id);
                      setShowDoctorPicker(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      doc.id === selectedDoctorId ? "text-green-600 font-semibold" : "text-gray-700"
                    }`}
                  >
                    {doc.full_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat window */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[480px]">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-green-600 rounded-t-xl">
          {selectedDoctor ? (
            <>
              <Avatar name={selectedDoctor.full_name} size="md" color="white" />
              <div>
                <p className="text-sm font-semibold text-white">{selectedDoctor.full_name}</p>
                <p className="text-xs text-green-100">Kinésithérapeute D.E.</p>
              </div>
              <span className="ml-auto flex items-center gap-1 text-xs text-green-100">
                <span className="w-1.5 h-1.5 bg-green-300 rounded-full"></span>
                En ligne
              </span>
            </>
          ) : (
            <p className="text-sm text-white">Sélectionnez un médecin</p>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50">
          {msgsLoading || convsLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 size={24} className="animate-spin text-green-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
              <MessageSquare size={32} className="opacity-30" />
              <p className="text-sm">Aucun message — envoyez le premier !</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user.id;
              const senderName = (msg.sender as Profile)?.full_name ?? "…";
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
                  {!isMine && <Avatar name={senderName} size="sm" color="green" />}
                  <div
                    className={`max-w-[72%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      isMine
                        ? "bg-green-600 text-white rounded-br-sm"
                        : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
                    }`}
                  >
                    <p className="leading-relaxed">{msg.content}</p>
                    <div className={`flex items-center gap-1 mt-0.5 justify-end text-[10px] ${isMine ? "text-green-200" : "text-gray-400"}`}>
                      <span>{relativeTime(msg.created_at)}</span>
                      {isMine && (
                        msg.read_at
                          ? <CheckCheck size={12} />
                          : <Check size={12} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 border-t bg-white rounded-b-xl">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Tapez votre message..."
              className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
              disabled={!conversationId || sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending || !conversationId}
              className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Envoyer
            </button>
          </div>
        </form>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <ul className="space-y-1">
          {[
            "Posez vos questions non urgentes à votre kinésithérapeute",
            "Réponse sous 24h ouvrées",
            "Urgences : appelez le 01 23 45 67 89",
          ].map((text) => (
            <li key={text} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="text-blue-500 mt-0.5">•</span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
