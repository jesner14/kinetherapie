import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, XCircle, RefreshCw, Clock, CalendarDays,
  Loader2, User, ChevronRight, X, Calendar,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/AuthContext";
import { PageLoader } from "../common/PageLoader";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────

type AppointmentStatus = "pending" | "confirmed" | "rejected" | "rescheduled";

interface AppointmentRow {
  id: string;
  availability_id: string;
  patient_id: string;
  doctor_id: string;
  status: AppointmentStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  patient: { full_name: string };
  availability: { slot_date: string; start_time: string; end_time: string };
}

interface FreeSlot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending:     "En attente",
  confirmed:   "Confirmé",
  rejected:    "Refusé",
  rescheduled: "Reprogrammé",
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending:     "bg-amber-100 text-amber-700 border border-amber-200",
  confirmed:   "bg-emerald-100 text-emerald-700 border border-emerald-200",
  rejected:    "bg-red-100 text-red-600 border border-red-200",
  rescheduled: "bg-blue-100 text-blue-700 border border-blue-200",
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
function fmtTime(t: string) { return t.slice(0, 5); }

// ─── Component ─────────────────────────────────────────────────────────────

type TabFilter = "all" | AppointmentStatus;

export function AdminAppointments() {
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState<TabFilter>("pending");

  // Per-row busy state
  const [busy, setBusy] = useState<Set<string>>(new Set());

  // Reschedule modal state
  const [rescheduleTarget, setRescheduleTarget]   = useState<AppointmentRow | null>(null);
  const [freeSlots, setFreeSlots]                 = useState<FreeSlot[]>([]);
  const [slotsLoading, setSlotsLoading]           = useState(false);
  const [selectedNewSlot, setSelectedNewSlot]     = useState<string | null>(null);
  const [rescheduling, setRescheduling]           = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        patient:profiles!patient_id ( full_name ),
        availability:availabilities ( slot_date, start_time, end_time )
      `)
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: false });

    if (error) toast.error("Erreur : " + error.message);
    else setAppointments((data ?? []) as AppointmentRow[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // ── Confirm ────────────────────────────────────────────────────────────
  const handleConfirm = async (appt: AppointmentRow) => {
    setBusy(prev => new Set([...prev, appt.id]));
    const now = new Date().toISOString();

    // 1. Confirm this appointment
    const { error: confirmErr } = await supabase
      .from("appointments")
      .update({ status: "confirmed", updated_at: now })
      .eq("id", appt.id);

    if (confirmErr) {
      toast.error("Erreur : " + confirmErr.message);
      setBusy(prev => { const s = new Set(prev); s.delete(appt.id); return s; });
      return;
    }

    // 2. Auto-reject all other pending on the same slot
    await supabase
      .from("appointments")
      .update({ status: "rejected", updated_at: now })
      .eq("availability_id", appt.availability_id)
      .eq("status", "pending")
      .neq("id", appt.id);

    setBusy(prev => { const s = new Set(prev); s.delete(appt.id); return s; });
    toast.success(`Rendez-vous de ${appt.patient.full_name} confirmé !`);
    fetchAppointments();
  };

  // ── Reject ─────────────────────────────────────────────────────────────
  const handleReject = async (appt: AppointmentRow) => {
    setBusy(prev => new Set([...prev, appt.id + "_rej"]));
    const { error } = await supabase
      .from("appointments")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", appt.id);
    setBusy(prev => { const s = new Set(prev); s.delete(appt.id + "_rej"); return s; });
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Rendez-vous refusé.");
    fetchAppointments();
  };

  // ── Open reschedule modal ───────────────────────────────────────────────
  const openReschedule = async (appt: AppointmentRow) => {
    setRescheduleTarget(appt);
    setSelectedNewSlot(null);
    setSlotsLoading(true);

    // Fetch free slots: is_active, no confirmed appointment, not the current slot
    const { data: avails } = await supabase
      .from("availabilities")
      .select("id, slot_date, start_time, end_time")
      .eq("doctor_id", appt.doctor_id)
      .eq("is_active", true)
      .gt("slot_date", new Date().toISOString().split("T")[0])
      .order("slot_date")
      .order("start_time");

    if (avails && avails.length > 0) {
      const ids = avails.map((a: FreeSlot) => a.id);
      const { data: confirmed } = await supabase
        .from("appointments")
        .select("availability_id")
        .in("availability_id", ids)
        .eq("status", "confirmed");

      const confirmedSet = new Set((confirmed ?? []).map((c: { availability_id: string }) => c.availability_id));
      const free = avails.filter((a: FreeSlot) => !confirmedSet.has(a.id) && a.id !== appt.availability_id);
      setFreeSlots(free as FreeSlot[]);
    } else {
      setFreeSlots([]);
    }
    setSlotsLoading(false);
  };

  // ── Confirm reschedule ─────────────────────────────────────────────────
  const handleReschedule = async () => {
    if (!rescheduleTarget || !selectedNewSlot || !user?.id) return;
    setRescheduling(true);
    const now = new Date().toISOString();

    // 1. Mark old appointment as rescheduled
    const { error: oldErr } = await supabase
      .from("appointments")
      .update({ status: "rescheduled", updated_at: now })
      .eq("id", rescheduleTarget.id);

    if (oldErr) {
      toast.error("Erreur : " + oldErr.message);
      setRescheduling(false);
      return;
    }

    // 2. Create new confirmed appointment on the new slot
    const { error: newErr } = await supabase
      .from("appointments")
      .insert({
        availability_id: selectedNewSlot,
        patient_id:      rescheduleTarget.patient_id,
        doctor_id:       user.id,
        status:          "confirmed",
        note:            "Reprogrammé par le docteur",
      });

    if (newErr) {
      toast.error("Erreur création : " + newErr.message);
      setRescheduling(false);
      return;
    }

    // 3. Reject other pending on the new slot
    await supabase
      .from("appointments")
      .update({ status: "rejected", updated_at: now })
      .eq("availability_id", selectedNewSlot)
      .eq("status", "pending");

    setRescheduling(false);
    setRescheduleTarget(null);
    toast.success(`${rescheduleTarget.patient.full_name} reprogrammé(e) avec succès !`);
    fetchAppointments();
  };

  if (loading) return <PageLoader text="Chargement des rendez-vous..." />;

  // ── Filtered list ───────────────────────────────────────────────────────
  const filtered = tab === "all"
    ? appointments
    : appointments.filter(a => a.status === tab);

  const counts: Record<TabFilter, number> = {
    all:         appointments.length,
    pending:     appointments.filter(a => a.status === "pending").length,
    confirmed:   appointments.filter(a => a.status === "confirmed").length,
    rejected:    appointments.filter(a => a.status === "rejected").length,
    rescheduled: appointments.filter(a => a.status === "rescheduled").length,
  };

  const tabs: { key: TabFilter; label: string; color: string }[] = [
    { key: "pending",   label: "En attente",  color: "text-amber-600 border-amber-500" },
    { key: "confirmed", label: "Confirmés",   color: "text-emerald-600 border-emerald-500" },
    { key: "rejected",  label: "Refusés",     color: "text-red-500 border-red-500" },
    { key: "all",       label: "Tous",        color: "text-gray-600 border-gray-400" },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rendez-vous</h1>
          <p className="text-gray-500 text-sm mt-1">
            Validez, refusez ou reprogrammez les demandes de vos patients
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-black text-amber-700">{counts.pending}</p>
            <p className="text-xs text-amber-500 font-medium">En attente</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-black text-emerald-700">{counts.confirmed}</p>
            <p className="text-xs text-emerald-500 font-medium">Confirmés</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.key
                ? t.color + " bg-transparent"
                : "text-gray-400 border-transparent hover:text-gray-600"
            }`}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.key ? "bg-current opacity-20 text-current" : "bg-gray-100 text-gray-500"
              }`}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── List ── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays size={40} className="text-gray-300 mb-3" />
            <p className="font-semibold text-gray-400">Aucun rendez-vous ici</p>
            <p className="text-sm text-gray-300 mt-1">Les nouvelles demandes apparaîtront automatiquement</p>
          </div>
        ) : (
          filtered.map(appt => {
            const isBusy    = busy.has(appt.id) || busy.has(appt.id + "_rej");
            const isPending = appt.status === "pending";

            return (
              <div
                key={appt.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">

                  {/* Patient avatar */}
                  <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center shrink-0">
                    {appt.patient.full_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">{appt.patient.full_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[appt.status]}`}>
                        {STATUS_LABELS[appt.status]}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-brand-400" />
                        <span className="capitalize">{fmtDate(appt.availability.slot_date)}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-brand-400" />
                        {fmtTime(appt.availability.start_time)} – {fmtTime(appt.availability.end_time)}
                      </span>
                      {appt.note && (
                        <span className="text-gray-400 italic truncate max-w-xs">"{appt.note}"</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-300 mt-1">
                      Demandé le {new Date(appt.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>

                  {/* Actions */}
                  {isPending && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => handleConfirm(appt)}
                        disabled={isBusy}
                        title="Confirmer"
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        {busy.has(appt.id)
                          ? <Loader2 size={14} className="animate-spin" />
                          : <CheckCircle2 size={14} />}
                        Accepter
                      </button>
                      <button
                        onClick={() => openReschedule(appt)}
                        disabled={isBusy}
                        title="Reprogrammer"
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 text-sm font-semibold rounded-xl hover:bg-blue-100 disabled:opacity-50 transition-colors border border-blue-200"
                      >
                        <RefreshCw size={14} />
                        Reprogrammer
                      </button>
                      <button
                        onClick={() => handleReject(appt)}
                        disabled={isBusy}
                        title="Refuser"
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors border border-red-200"
                      >
                        {busy.has(appt.id + "_rej")
                          ? <Loader2 size={14} className="animate-spin" />
                          : <XCircle size={14} />}
                        Refuser
                      </button>
                    </div>
                  )}

                  {/* Non-pending: chevron detail */}
                  {!isPending && (
                    <div className="shrink-0">
                      <ChevronRight size={18} className="text-gray-300" />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Reschedule modal ── */}
      {rescheduleTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-brand-600 to-teal-600">
              <div>
                <h2 className="text-lg font-bold text-white">Reprogrammer le patient</h2>
                <p className="text-brand-100 text-sm">
                  {rescheduleTarget.patient.full_name} — actuellement le{" "}
                  {fmtDate(rescheduleTarget.availability.slot_date)} à{" "}
                  {fmtTime(rescheduleTarget.availability.start_time)}
                </p>
              </div>
              <button
                onClick={() => setRescheduleTarget(null)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Slot list */}
            <div className="px-6 py-4">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Choisir un nouveau créneau disponible
              </p>

              {slotsLoading ? (
                <div className="flex items-center justify-center py-10 text-gray-400">
                  <Loader2 size={22} className="animate-spin" />
                </div>
              ) : freeSlots.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-gray-400 gap-2">
                  <Calendar size={32} className="text-gray-300" />
                  <p className="text-sm">Aucun créneau libre disponible</p>
                  <p className="text-xs text-gray-300">Ajoutez des créneaux dans le Calendrier</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {freeSlots.map(slot => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedNewSlot(slot.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        selectedNewSlot === slot.id
                          ? "border-brand-500 bg-brand-50"
                          : "border-gray-200 hover:border-brand-300 hover:bg-gray-50"
                      }`}
                    >
                      <div>
                        <p className={`font-semibold text-sm capitalize ${selectedNewSlot === slot.id ? "text-brand-700" : "text-gray-800"}`}>
                          {fmtDate(slot.slot_date)}
                        </p>
                        <p className={`text-xs mt-0.5 ${selectedNewSlot === slot.id ? "text-brand-500" : "text-gray-400"}`}>
                          {fmtTime(slot.start_time)} – {fmtTime(slot.end_time)}
                        </p>
                      </div>
                      {selectedNewSlot === slot.id && (
                        <CheckCircle2 size={18} className="text-brand-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setRescheduleTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReschedule}
                disabled={!selectedNewSlot || rescheduling}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {rescheduling ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Confirmer la reprogrammation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
