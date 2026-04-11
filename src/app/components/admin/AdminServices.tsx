import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Stethoscope, ToggleLeft, ToggleRight, ArrowUp, ArrowDown, Link as LinkIcon, Save, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase, type Service, type ConsultationSchedule } from "../../../lib/supabase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
// ─── Helpers ─────────────────────────────────────────────────────────

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const DAY_FULL   = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
// display order: Lun–Ven first, then Sam, Dim
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DEFAULT_SCHEDULES: ConsultationSchedule[] = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  start_time: '09:00',
  is_active: false,
  updated_at: '',
}));
// ─── Modal for Add / Edit ───────────────────────────────────────────────────

interface ServiceModalProps {
  open: boolean;
  service: Service | null;
  onClose: () => void;
  onSaved: () => void;
}

function ServiceModal({ open, service, onClose, onSaved }: ServiceModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  // Populate fields when editing
  useEffect(() => {
    if (service) {
      setName(service.name);
      setDescription(service.description ?? "");
      setPrice(service.price != null ? String(service.price) : "");
      setIsActive(service.is_active);
      setSortOrder(service.sort_order);
    } else {
      setName("");
      setDescription("");
      setPrice("");
      setIsActive(true);
      setSortOrder(0);
    }
  }, [service, open]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Le nom de la prestation est obligatoire.");
      return;
    }

    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: price !== "" ? parseFloat(price) : null,
      is_active: isActive,
      sort_order: sortOrder,
    };

    let error;
    if (service) {
      ({ error } = await supabase.from("services").update(payload).eq("id", service.id));
    } else {
      ({ error } = await supabase.from("services").insert(payload));
    }

    setSaving(false);

    if (error) {
      toast.error("Erreur lors de l'enregistrement.");
      return;
    }

    toast.success(service ? "Prestation mise à jour." : "Prestation ajoutée.");
    onSaved();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">
            {service ? "Modifier la prestation" : "Ajouter une prestation"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Nom de la prestation <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
              placeholder="Ex : Kinésithérapie orthopédique"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none resize-none"
              placeholder="Décrivez brièvement la prestation..."
            />
          </div>

          {/* Price + Sort order */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Prix (FCFA)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                placeholder="15000"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Ordre d'affichage
              </label>
              <input
                type="number"
                min="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Prestation active</p>
              <p className="text-xs text-gray-500">Visible sur la page Contact</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={`transition-colors ${isActive ? "text-brand-600" : "text-gray-400"}`}
            >
              {isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
            </button>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-medium disabled:opacity-60"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  // ── Global Wave link ───────────────────────────────────────────────────
  const [waveLink, setWaveLink] = useState("");
  const [waveLinkSaving, setWaveLinkSaving] = useState(false);

  // ── Consultation schedules ────────────────────────────────────
  const [schedules, setSchedules] = useState<ConsultationSchedule[]>(DEFAULT_SCHEDULES);
  const [schedulesSaving, setSchedulesSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("site_content")
      .select("value")
      .eq("id", "global.wave.payment_link")
      .single()
      .then(({ data }) => { if (data) setWaveLink(data.value); });

    supabase
      .from("consultation_schedules")
      .select("*")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSchedules(DEFAULT_SCHEDULES.map(def => {
            const found = (data as ConsultationSchedule[]).find(d => d.day_of_week === def.day_of_week);
            return found ? { ...found, start_time: found.start_time.slice(0, 5) } : def;
          }));
        }
      });
  }, []);

  const saveWaveLink = async () => {
    setWaveLinkSaving(true);
    const { error } = await supabase.from("site_content").upsert({
      id: "global.wave.payment_link",
      page: "global",
      section: "wave",
      key: "payment_link",
      value: waveLink.trim(),
      type: "text",
      label: "Lien de paiement Wave",
    }, { onConflict: "id" });
    setWaveLinkSaving(false);
    if (error) toast.error("Erreur lors de la sauvegarde.");
    else toast.success("Lien Wave sauvegardé.");
  };

  const saveSchedules = async () => {
    setSchedulesSaving(true);
    const { error } = await supabase.from("consultation_schedules").upsert(
      schedules.map(s => ({
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        is_active: s.is_active,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "day_of_week" }
    );
    setSchedulesSaving(false);
    if (error) toast.error("Erreur lors de la sauvegarde des horaires.");
    else toast.success("Jours de consultation sauvegardés.");
  };

  const toggleScheduleDay = (dow: number) =>
    setSchedules(prev => prev.map(s => s.day_of_week === dow ? { ...s, is_active: !s.is_active } : s));

  const setScheduleTime = (dow: number, time: string) =>
    setSchedules(prev => prev.map(s => s.day_of_week === dow ? { ...s, start_time: time } : s));

  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Erreur lors du chargement des prestations.");
    } else {
      setServices((data ?? []) as Service[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  const openAdd = () => { setEditingService(null); setModalOpen(true); };
  const openEdit = (s: Service) => { setEditingService(s); setModalOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("services").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Erreur lors de la suppression.");
    } else {
      toast.success("Prestation supprimée.");
      setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const toggleActive = async (service: Service) => {
    const { error } = await supabase
      .from("services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id);
    if (error) {
      toast.error("Erreur lors de la mise à jour.");
    } else {
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, is_active: !s.is_active } : s))
      );
    }
  };

  const moveOrder = async (service: Service, direction: "up" | "down") => {
    const sorted = [...services];
    const idx = sorted.findIndex((s) => s.id === service.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapIdx];
    const newOrderA = b.sort_order;
    const newOrderB = a.sort_order;

    await Promise.all([
      supabase.from("services").update({ sort_order: newOrderA }).eq("id", a.id),
      supabase.from("services").update({ sort_order: newOrderB }).eq("id", b.id),
    ]);

    await fetchServices();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Prestations Médicales</h1>
          <p className="text-gray-600">Gérez les types de soins et le lien de paiement Wave</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-semibold"
        >
          <Plus size={18} />
          Ajouter une prestation
        </button>
      </div>

      {/* ── Lien Wave global ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
          <LinkIcon size={18} className="text-brand-600" />
          Lien de paiement Wave (global)
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Ce lien est utilisé pour toutes les prestations. Le montant de la prestation y sera ajouté automatiquement.
        </p>
        <div className="flex gap-3">
          <input
            type="url"
            value={waveLink}
            onChange={(e) => setWaveLink(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none text-sm"
            placeholder="https://pay.wave.com/m/M_sn_xxx"
          />
          <button
            onClick={saveWaveLink}
            disabled={waveLinkSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-semibold disabled:opacity-60"
          >
            <Save size={16} />
            {waveLinkSaving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
        {waveLink && (
          <p className="mt-2 text-xs text-gray-400">
            Exemple de lien généré : <span className="text-brand-600">{waveLink}?amount=15000</span>
          </p>
        )}
      </div>
      {/* ── Jours de consultation ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Clock size={18} className="text-brand-600" />
              Jours de consultation
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Les patients seront programmés pour le prochain jour actif après leur réservation.
            </p>
          </div>
          <button
            onClick={saveSchedules}
            disabled={schedulesSaving}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-semibold text-sm disabled:opacity-60"
          >
            <Save size={14} />
            {schedulesSaving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {DAY_ORDER.map((dow) => {
            const s = schedules.find(x => x.day_of_week === dow)!;
            return (
              <div
                key={dow}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  s.is_active
                    ? "border-brand-500 bg-brand-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <p className={`text-xs font-bold uppercase tracking-wider ${s.is_active ? "text-brand-700" : "text-gray-400"}`}>
                  {DAY_LABELS[dow]}
                </p>
                <button
                  type="button"
                  onClick={() => toggleScheduleDay(dow)}
                  className={`transition-colors ${s.is_active ? "text-brand-600" : "text-gray-300"}`}
                  title={DAY_FULL[dow]}
                >
                  {s.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
                <input
                  type="time"
                  value={s.start_time}
                  onChange={(e) => setScheduleTime(dow, e.target.value)}
                  disabled={!s.is_active}
                  className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:border-brand-500 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed text-center"
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="p-16 text-center">
            <Stethoscope className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 font-medium">Aucune prestation enregistrée</p>
            <p className="text-gray-400 text-sm mt-1">
              Ajoutez vos premiers types de soins ci-dessus.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Ordre</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Prestation</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Prix</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Statut</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {services.map((service, idx) => (
                  <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                    {/* Order controls */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveOrder(service, "up")}
                          disabled={idx === 0}
                          className="text-gray-400 hover:text-brand-600 disabled:opacity-20 transition-colors"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => moveOrder(service, "down")}
                          disabled={idx === services.length - 1}
                          className="text-gray-400 hover:text-brand-600 disabled:opacity-20 transition-colors"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </td>

                    {/* Name + description */}
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{service.name}</p>
                      {service.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{service.description}</p>
                      )}
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4">
                      {service.price != null ? (
                        <span className="text-gray-900 font-medium">
                          {Number(service.price).toLocaleString("fr-FR")} FCFA
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>

                    {/* Active toggle */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(service)}
                        className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                          service.is_active ? "text-brand-600" : "text-gray-400"
                        }`}
                      >
                        {service.is_active ? (
                          <><ToggleRight size={20} /> Actif</>
                        ) : (
                          <><ToggleLeft size={20} /> Inactif</>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(service)}
                          className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                          title="Modifier"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(service)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <ServiceModal
        open={modalOpen}
        service={editingService}
        onClose={() => setModalOpen(false)}
        onSaved={fetchServices}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la prestation ?</AlertDialogTitle>
            <AlertDialogDescription>
              La prestation <strong>{deleteTarget?.name}</strong> sera définitivement supprimée.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
