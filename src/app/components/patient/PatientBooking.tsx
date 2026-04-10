import { useState, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Clock, CheckCircle, Loader2, X, Info,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/AuthContext";
import { PageLoader } from "../common/PageLoader";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────

interface SlotRow {
  id: string;
  doctor_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAY_HEADERS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// ─── Component ─────────────────────────────────────────────────────────────

export function PatientBooking() {
  const { user } = useAuth();

  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [slots, setSlots]                   = useState<SlotRow[]>([]);
  const [confirmedIds, setConfirmedIds]     = useState<Set<string>>(new Set());
  const [myPendingIds, setMyPendingIds]     = useState<Set<string>>(new Set());
  const [myConfirmedIds, setMyConfirmedIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<string | null>(null);
  const [notes, setNotes]     = useState<Record<string, string>>({});

  // ── Fetch month's slots + appointment status ───────────────────────────
  const fetchMonth = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setSelectedDate(null);

    const mm    = String(viewMonth + 1).padStart(2, "0");
    const yy    = viewYear;
    const first = `${yy}-${mm}-01`;
    const lastDay = new Date(yy, viewMonth + 1, 0).getDate();
    const last  = `${yy}-${mm}-${String(lastDay).padStart(2, "0")}`;

    const { data: avails, error: availErr } = await supabase
      .from("availabilities")
      .select("id, doctor_id, slot_date, start_time, end_time")
      .eq("is_active", true)
      .gte("slot_date", first)
      .lte("slot_date", last)
      .order("slot_date")
      .order("start_time");

    if (availErr) { toast.error("Erreur : " + availErr.message); setLoading(false); return; }
    if (!avails || avails.length === 0) {
      setSlots([]); setConfirmedIds(new Set()); setMyPendingIds(new Set()); setMyConfirmedIds(new Set());
      setLoading(false); return;
    }

    const ids = avails.map((a: SlotRow) => a.id);

    const [{ data: confirmedAppts }, { data: myAppts }] = await Promise.all([
      supabase.from("appointments").select("availability_id").in("availability_id", ids).eq("status", "confirmed"),
      supabase.from("appointments").select("availability_id, status").in("availability_id", ids).eq("patient_id", user.id).in("status", ["pending", "confirmed"]),
    ]);

    setSlots(avails as SlotRow[]);
    setConfirmedIds(new Set((confirmedAppts ?? []).map((a: { availability_id: string }) => a.availability_id)));
    setMyPendingIds(new Set(
      (myAppts ?? []).filter((a: { status: string }) => a.status === "pending").map((a: { availability_id: string }) => a.availability_id)
    ));
    setMyConfirmedIds(new Set(
      (myAppts ?? []).filter((a: { status: string }) => a.status === "confirmed").map((a: { availability_id: string }) => a.availability_id)
    ));
    setLoading(false);
  }, [user?.id, viewYear, viewMonth]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  // ── Month navigation ───────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // ── Calendar grid ──────────────────────────────────────────────────────
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  let startDow = firstOfMonth.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const calendarDays: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const fmtDate = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const todayStr = today.toISOString().split("T")[0];

  const slotsByDate = slots.reduce((acc, s) => {
    (acc[s.slot_date] ??= []).push(s);
    return acc;
  }, {} as Record<string, SlotRow[]>);

  const hasAvailableOnDate = (dateStr: string) =>
    (slotsByDate[dateStr] ?? []).some(s => !confirmedIds.has(s.id));

  const selectedSlots = selectedDate ? (slotsByDate[selectedDate] ?? []) : [];

  // ── Book ───────────────────────────────────────────────────────────────
  const handleBook = async (slot: SlotRow) => {
    if (!user?.id) return;
    setBooking(slot.id);
    const note = (notes[slot.id] ?? "").trim() || null;
    const { error } = await supabase
      .from("appointments")
      .insert({ availability_id: slot.id, patient_id: user.id, doctor_id: slot.doctor_id, status: "pending", note });
    setBooking(null);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setMyPendingIds(prev => new Set([...prev, slot.id]));
    toast.success("Demande envoyée ! Le docteur va valider votre rendez-vous.", { duration: 5000 });
  };

  if (loading) return <PageLoader text="Chargement des disponibilités..." />;

  const currentMonthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const todayMonthKey   = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-3">
          <CalendarIcon className="text-brand-600" size={32} />
          Réserver un Rendez-vous
        </h1>
        <p className="text-gray-500">Consultez les disponibilités et envoyez une demande de rendez-vous</p>
      </div>

      {/* ── Info banner ── */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">
          Votre demande sera <strong>en attente de validation</strong> par le docteur.
          Vous pouvez réserver un créneau même si d'autres patients l'ont demandé.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Calendar ── */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-brand-600 to-teal-600">
            <button
              onClick={prevMonth}
              disabled={currentMonthKey <= todayMonthKey}
              className="p-2 rounded-lg text-white hover:bg-white/20 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-bold text-white">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
            {DAY_HEADERS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`e-${i}`} className="aspect-square bg-gray-50/40" />;
              const dateStr    = fmtDate(day);
              const isToday    = dateStr === todayStr;
              const isPast     = dateStr < todayStr;
              const isSelected = selectedDate === dateStr;
              const hasSlots   = (slotsByDate[dateStr] ?? []).length > 0;
              const hasAvail   = hasAvailableOnDate(dateStr);
              const dotColor   = hasAvail
                ? (isSelected ? "bg-white" : "bg-emerald-500")
                : (isSelected ? "bg-white/50" : "bg-gray-300");

              return (
                <button
                  key={dateStr}
                  onClick={() => !isPast && hasSlots && setSelectedDate(isSelected ? null : dateStr)}
                  disabled={isPast || !hasSlots}
                  className={`aspect-square flex flex-col items-center justify-center gap-0.5 text-sm font-semibold border border-transparent transition-all
                    ${isSelected
                      ? "bg-brand-600 text-white"
                      : isToday
                        ? "border-brand-400 text-brand-700 bg-brand-50"
                        : isPast || !hasSlots
                          ? "text-gray-300 cursor-default"
                          : "text-gray-700 hover:bg-brand-50 hover:border-brand-200 cursor-pointer"
                    }`}
                >
                  <span>{day}</span>
                  {hasSlots && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 px-6 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Disponible
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-gray-300" /> Complet
            </div>
          </div>
        </div>

        {/* ── Side panel ── */}
        <div className="lg:col-span-2">
          {!selectedDate ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-16 px-6 text-center h-full min-h-[300px]">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
                <Clock size={24} className="text-brand-400" />
              </div>
              <p className="font-semibold text-gray-500">Sélectionnez un jour</p>
              <p className="text-sm text-gray-400 mt-1">
                Les jours avec un point vert ont des créneaux disponibles
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-brand-50 to-teal-50">
                <div>
                  <p className="font-bold text-gray-900 capitalize text-sm">
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("fr-FR", {
                      weekday: "long", day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {selectedSlots.filter(s => !confirmedIds.has(s.id)).length} créneau(x) disponible(s)
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto">
                {selectedSlots.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8 italic">Aucun créneau</p>
                )}
                {selectedSlots.map(slot => {
                  const isConfirmed   = confirmedIds.has(slot.id);
                  const isMyPending   = myPendingIds.has(slot.id);
                  const isMyConfirmed = myConfirmedIds.has(slot.id);
                  const isBooking     = booking === slot.id;

                  let statusLabel = "";
                  let wrapperClass = "";
                  if (isMyConfirmed)      { statusLabel = "Votre RDV confirmé ✓"; wrapperClass = "bg-emerald-50 border-emerald-300"; }
                  else if (isMyPending)   { statusLabel = "Demande envoyée…";      wrapperClass = "bg-amber-50 border-amber-300"; }
                  else if (isConfirmed)   { statusLabel = "Déjà réservé";          wrapperClass = "bg-gray-50 border-gray-200"; }
                  else                    { wrapperClass = "bg-white border-gray-200 hover:border-brand-300 hover:bg-brand-50"; }

                  return (
                    <div key={slot.id} className={`rounded-xl border p-4 transition-all ${wrapperClass}`}>
                      {/* Time row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className={isConfirmed || isMyPending || isMyConfirmed ? "text-gray-400" : "text-brand-500"} />
                          <span className={`font-bold text-base ${isConfirmed ? "text-gray-400" : isMyConfirmed ? "text-emerald-700" : isMyPending ? "text-amber-700" : "text-gray-800"}`}>
                            {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                          </span>
                        </div>
                        {(isConfirmed || isMyPending || isMyConfirmed) && (
                          <span className={`text-xs font-semibold ${isMyConfirmed ? "text-emerald-600" : isMyPending ? "text-amber-600" : "text-gray-400"}`}>
                            {statusLabel}
                          </span>
                        )}
                      </div>

                      {/* Note textarea + book button — only for available slots */}
                      {!isConfirmed && !isMyPending && !isMyConfirmed && (
                        <div className="mt-3 space-y-2">
                          <textarea
                            rows={2}
                            placeholder="Motif de la consultation (facultatif)…"
                            value={notes[slot.id] ?? ""}
                            onChange={e => setNotes(prev => ({ ...prev, [slot.id]: e.target.value }))}
                            maxLength={300}
                            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg resize-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 focus:outline-none placeholder:text-gray-300"
                          />
                          <button
                            onClick={() => handleBook(slot)}
                            disabled={!!booking}
                            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
                          >
                            {isBooking ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                            Envoyer la demande
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400 text-center">
                  Le docteur confirmera votre demande dans les plus brefs délais
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tips ── */}
      <div className="bg-brand-50 border border-brand-200 rounded-2xl px-6 py-5">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Info size={16} className="text-brand-500" /> Informations importantes
        </h3>
        <ul className="space-y-2 text-sm text-gray-600">
          {[
            "Votre demande est envoyée au docteur pour validation.",
            "Le créneau reste visible tant qu'il n'est pas confirmé à un autre patient.",
            "Veuillez arriver 5 minutes avant l'heure de votre rendez-vous.",
            "Pour annuler, contactez le cabinet au moins 24h à l'avance.",
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle className="text-brand-500 shrink-0 mt-0.5" size={14} />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
