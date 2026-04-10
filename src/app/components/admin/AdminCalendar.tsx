import { useState, useEffect } from "react";
import {
  Plus, Trash2, Clock, ChevronLeft, ChevronRight, Pencil,
  CheckCircle2, Loader2, X, Info,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/AuthContext";
import { PageLoader } from "../common/PageLoader";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Availability {
  id: string;
  doctor_id: string;
  slot_date: string; // "YYYY-MM-DD"
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAY_HEADERS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];


// ─── Component ─────────────────────────────────────────────────────────────

export function AdminCalendar() {
  const { user } = useAuth();

  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-based
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [slots, setSlots]     = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft]             = useState({ start: "", end: "" });
  const [saving, setSaving]           = useState(false);

  // Edit
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editDraft, setEditDraft]   = useState({ start: "", end: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Delete
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  // ── Fetch month's slots ─────────────────────────────────────────────────
  const fetchSlots = async () => {
    if (!user?.id) return;
    setLoading(true);
    const mm    = String(viewMonth + 1).padStart(2, "0");
    const yy    = viewYear;
    const first = `${yy}-${mm}-01`;
    const last  = new Date(yy, viewMonth + 1, 0);
    const lastStr = `${yy}-${mm}-${String(last.getDate()).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("availabilities")
      .select("*")
      .eq("doctor_id", user.id)
      .gte("slot_date", first)
      .lte("slot_date", lastStr)
      .order("slot_date",  { ascending: true })
      .order("start_time", { ascending: true });

    if (error) toast.error("Erreur : " + error.message);
    else setSlots((data as Availability[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchSlots(); }, [user?.id, viewYear, viewMonth]);

  // ── Month navigation ────────────────────────────────────────────────────
  const prevMonth = () => {
    setSelectedDate(null);
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    setSelectedDate(null);
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // ── Calendar grid ───────────────────────────────────────────────────────
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  let startDow = firstOfMonth.getDay() - 1;
  if (startDow < 0) startDow = 6; // Sunday → last column

  const calendarDays: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const fmtDate = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const todayStr  = today.toISOString().split("T")[0];
  const slotsByDate = slots.reduce((acc, s) => {
    (acc[s.slot_date] ??= []).push(s);
    return acc;
  }, {} as Record<string, Availability[]>);

  const selectedSlots = selectedDate ? (slotsByDate[selectedDate] ?? []) : [];

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!draft.start || !draft.end || !selectedDate || !user?.id) return;
    if (draft.start >= draft.end) { toast.error("L'heure de fin doit être après le début."); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("availabilities")
      .insert({ doctor_id: user.id, slot_date: selectedDate, start_time: draft.start, end_time: draft.end, is_active: true })
      .select().single();
    setSaving(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setSlots(prev => [...prev, data as Availability].sort((a, b) =>
      a.slot_date.localeCompare(b.slot_date) || a.start_time.localeCompare(b.start_time)
    ));
    setDraft({ start: "", end: "" });
    setShowAddForm(false);
    toast.success("Créneau ajouté !");
  };

  const handleEdit = async (id: string) => {
    if (editDraft.start >= editDraft.end) { toast.error("L'heure de fin doit être après le début."); return; }
    setEditSaving(true);
    const { error } = await supabase
      .from("availabilities")
      .update({ start_time: editDraft.start, end_time: editDraft.end })
      .eq("id", id);
    setEditSaving(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setSlots(prev => prev.map(s => s.id === id ? { ...s, start_time: editDraft.start, end_time: editDraft.end } : s));
    setEditingId(null);
    toast.success("Créneau modifié !");
  };

  const handleDelete = async (id: string) => {
    setDeleting(prev => new Set([...prev, id]));
    const { error } = await supabase.from("availabilities").delete().eq("id", id);
    setDeleting(prev => { const s = new Set(prev); s.delete(id); return s; });
    if (error) { toast.error("Erreur : " + error.message); return; }
    setSlots(prev => prev.filter(s => s.id !== id));
    toast.success("Créneau supprimé.");
  };

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Calendrier de Disponibilités</h1>
        <p className="text-gray-500 text-sm mt-1">
          Planifiez vos créneaux pour chaque jour du mois. Cliquez sur un jour pour gérer ses horaires.
        </p>
      </div>

      {/* ── Info ── */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">
          Les créneaux sont définis <strong>par date précise</strong>. Naviguez entre les mois pour planifier à l'avance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Calendar panel ── */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-brand-600 to-teal-600">
            <button onClick={prevMonth} className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-bold text-white">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day name headers */}
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
            {DAY_HEADERS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                if (!day) return <div key={`e-${i}`} className="aspect-square bg-gray-50/40" />;
                const dateStr   = fmtDate(day);
                const daySlots  = slotsByDate[dateStr] ?? [];
                const isToday   = dateStr === todayStr;
                const isSelected = selectedDate === dateStr;
                const isPast    = dateStr < todayStr;

                return (
                  <button
                    key={dateStr}
                    onClick={() => {
                      setSelectedDate(isSelected ? null : dateStr);
                      setShowAddForm(false);
                      setEditingId(null);
                    }}
                    className={`aspect-square flex flex-col items-center justify-center gap-0.5 text-sm font-semibold border border-transparent transition-all
                      ${isSelected
                        ? "bg-brand-600 text-white"
                        : isToday
                          ? "border-brand-400 text-brand-700 bg-brand-50"
                          : isPast
                            ? "text-gray-300 cursor-default"
                            : "text-gray-700 hover:bg-brand-50 hover:border-brand-200"
                      }`}
                  >
                    <span>{day}</span>
                    {daySlots.length > 0 && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-brand-500"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Month stats footer */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
            <div className="py-3 text-center">
              <p className="text-lg font-black text-brand-700">{slots.length}</p>
              <p className="text-xs text-gray-400">Créneaux</p>
            </div>
            <div className="py-3 text-center">
              <p className="text-lg font-black text-teal-700">{new Set(slots.map(s => s.slot_date)).size}</p>
              <p className="text-xs text-gray-400">Jours planifiés</p>
            </div>
            <div className="py-3 text-center">
              <p className="text-lg font-black text-gray-700">{daysInMonth - new Set(slots.map(s => s.slot_date)).size}</p>
              <p className="text-xs text-gray-400">Jours libres</p>
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
              <p className="text-sm text-gray-400 mt-1">Cliquez sur une date du calendrier pour gérer ses créneaux horaires</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Panel header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 capitalize">
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("fr-FR", {
                      weekday: "long", day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {selectedSlots.length} créneau{selectedSlots.length !== 1 ? "x" : ""}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Slots */}
              <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                {selectedSlots.length === 0 && !showAddForm && (
                  <p className="text-sm text-gray-400 text-center py-8 italic">Aucun créneau pour ce jour</p>
                )}

                {selectedSlots.map(slot => {
                  const isEditing = editingId === slot.id;
                  const isDel = deleting.has(slot.id);
                  return (
                    <div key={slot.id} className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">Début</label>
                              <input
                                type="time"
                                value={editDraft.start}
                                onChange={e => setEditDraft(d => ({ ...d, start: e.target.value }))}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:border-brand-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">Fin</label>
                              <input
                                type="time"
                                value={editDraft.end}
                                onChange={e => setEditDraft(d => ({ ...d, end: e.target.value }))}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:border-brand-500 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(slot.id)}
                              disabled={editSaving}
                              className="flex-1 flex items-center justify-center gap-1 bg-brand-600 text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-brand-700 disabled:opacity-60"
                            >
                              {editSaving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                              Sauvegarder
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-300"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-brand-500" />
                            <span className="font-bold text-gray-800 text-sm">
                              {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingId(slot.id);
                                setEditDraft({ start: slot.start_time.slice(0, 5), end: slot.end_time.slice(0, 5) });
                                setShowAddForm(false);
                              }}
                              className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(slot.id)}
                              disabled={isDel}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              {isDel ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add form */}
                {showAddForm && (
                  <div className="bg-brand-50 rounded-xl border border-dashed border-brand-300 p-3 space-y-3">
                    <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider">Nouveau créneau</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Début</label>
                        <input
                          type="time"
                          value={draft.start}
                          onChange={e => setDraft(d => ({ ...d, start: e.target.value }))}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:border-brand-500 focus:outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Fin</label>
                        <input
                          type="time"
                          value={draft.end}
                          onChange={e => setDraft(d => ({ ...d, end: e.target.value }))}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:border-brand-500 focus:outline-none bg-white"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAdd}
                        disabled={!draft.start || !draft.end || saving}
                        className="flex-1 flex items-center justify-center gap-1 bg-brand-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Enregistrer
                      </button>
                      <button
                        onClick={() => { setShowAddForm(false); setDraft({ start: "", end: "" }); }}
                        className="px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add button */}
              {!showAddForm && (
                <div className="px-4 pb-4">
                  <button
                    onClick={() => { setShowAddForm(true); setEditingId(null); }}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-brand-300 text-brand-600 py-2.5 rounded-xl text-sm font-semibold hover:border-brand-500 hover:bg-brand-50 transition-colors"
                  >
                    <Plus size={16} /> Ajouter un créneau
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
