import { useEffect, useState } from "react";
import {
  CalendarCheck, CheckCircle, XCircle, Eye, Loader2, ClipboardList,
  Phone, Mail, User, Send,
} from "lucide-react";
import { toast } from "sonner";
import { supabase, type BookingRequest, type ConsultationSchedule } from "../../../lib/supabase";
import { PageLoader } from "../common/PageLoader";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

// ─── Utilities ───────────────────────────────────────────────────────────────

/** Returns the next active consultation date after today */
function getNextConsultationDate(
  schedules: ConsultationSchedule[]
): { date: Date; time: string } | null {
  const active = schedules
    .filter((s) => s.is_active)
    .sort((a, b) => a.day_of_week - b.day_of_week);
  if (!active.length) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= 14; i++) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + i);
    const slot = active.find((s) => s.day_of_week === candidate.getDay());
    if (slot) return { date: candidate, time: slot.start_time.slice(0, 5) };
  }
  return null;
}

function formatDateFR(date: Date, time: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  const fullDate = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  if (diffDays === 1) return `demain à ${time}`;
  if (diffDays === 2)
    return `après-demain (${date.toLocaleDateString("fr-FR", { weekday: "long" })}) à ${time}`;
  return `${fullDate} à ${time}`;
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  validated: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  validated: "Validé",
  rejected: "Refusé",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminBookingRequests() {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<ConsultationSchedule[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "validated" | "rejected" | "all">("pending");

  // Screenshot viewer
  const [screenViewer, setScreenViewer] = useState<string | null>(null);

  // Validation modal
  const [confirmingReq, setConfirmingReq] = useState<BookingRequest | null>(null);
  const [nextDate, setNextDate] = useState<{ date: Date; time: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Rejection modal
  const [rejectingReq, setRejectingReq] = useState<BookingRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Resend email
  const [resendingId, setResendingId] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    const [reqRes, schedRes] = await Promise.all([
      supabase.from("booking_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("consultation_schedules").select("*"),
    ]);
    setRequests((reqRes.data ?? []) as BookingRequest[]);
    setSchedules((schedRes.data ?? []) as ConsultationSchedule[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Realtime: new booking request
    const channel = supabase
      .channel("admin_booking_requests")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "booking_requests" },
        (payload) => {
          const req = payload.new as BookingRequest;
          setRequests((prev) => [req, ...prev]);
          toast.info("🗓 Nouvelle demande de réservation", {
            description: `${req.first_name} ${req.last_name} — ${req.service_name}`,
            duration: 8000,
          });
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  // ── Validate ──────────────────────────────────────────────────────────────
  const openValidate = (req: BookingRequest) => {
    setNextDate(getNextConsultationDate(schedules));
    setConfirmingReq(req);
  };

  const handleConfirmValidation = async () => {
    if (!confirmingReq) return;
    setConfirming(true);

    const assignedDate = nextDate?.date.toISOString().split("T")[0] ?? null;
    const assignedTime = nextDate?.time ?? null;

    const { error } = await supabase
      .from("booking_requests")
      .update({ status: "validated", assigned_date: assignedDate, assigned_time: assignedTime })
      .eq("id", confirmingReq.id);

    if (error) {
      toast.error("Erreur lors de la validation.");
      setConfirming(false);
      return;
    }

    toast.success(
      `Réservation validée — ${assignedDate ? formatDateFR(new Date(assignedDate + "T00:00:00"), assignedTime ?? "") : "sans date"}`
    );

    // Send confirmation email via Edge Function (non-blocking)
    supabase.functions
      .invoke("send-booking-confirmation", { body: { booking_request_id: confirmingReq.id } })
      .then(({ error: fnErr }) => {
        if (fnErr) {
          toast.warning("Réservation validée mais l'email n'a pas pu être envoyé. Utilisez le bouton \"Renvoyer l'email\".");
        } else {
          setRequests((prev) =>
            prev.map((r) => r.id === confirmingReq.id ? { ...r, email_sent: true } : r)
          );
        }
      });

    setRequests((prev) =>
      prev.map((r) =>
        r.id === confirmingReq.id
          ? { ...r, status: "validated", assigned_date: assignedDate, assigned_time: assignedTime, email_sent: false }
          : r
      )
    );

    setConfirmingReq(null);
    setConfirming(false);
  };

  // ── Resend email ──────────────────────────────────────────────────────────
  const handleResendEmail = async (req: BookingRequest) => {
    setResendingId(req.id);
    const { error: fnErr } = await supabase.functions.invoke("send-booking-confirmation", {
      body: { booking_request_id: req.id },
    });
    if (fnErr) {
      toast.error("L'email n'a pas pu être envoyé. Vérifiez la configuration de l'Edge Function.");
    } else {
      toast.success(`Email renvoyé à ${req.email}`);
      setRequests((prev) =>
        prev.map((r) => r.id === req.id ? { ...r, email_sent: true } : r)
      );
    }
    setResendingId(null);
  };

  // ── Reject ────────────────────────────────────────────────────────────────
  const openReject = (req: BookingRequest) => {
    setRejectionReason("");
    setRejectingReq(req);
  };

  const handleReject = async () => {
    if (!rejectingReq) return;
    setRejecting(true);

    const { error } = await supabase
      .from("booking_requests")
      .update({ status: "rejected", rejection_reason: rejectionReason.trim() || null })
      .eq("id", rejectingReq.id);

    if (error) {
      toast.error("Erreur lors du refus.");
    } else {
      toast.success("Demande refusée.");
      setRequests((prev) =>
        prev.map((r) =>
          r.id === rejectingReq.id
            ? { ...r, status: "rejected", rejection_reason: rejectionReason.trim() || null }
            : r
        )
      );
    }

    setRejectingReq(null);
    setRejectionReason("");
    setRejecting(false);
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = requests.filter((r) =>
    activeTab === "all" ? true : r.status === activeTab
  );
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const tabs: { key: "pending" | "validated" | "rejected" | "all"; label: string }[] = [
    { key: "pending", label: `En attente${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
    { key: "validated", label: "Validées" },
    { key: "rejected", label: "Refusées" },
    { key: "all", label: "Toutes" },
  ];

  if (loading) return <PageLoader text="Chargement des demandes..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Demandes de Réservation</h1>
        <p className="text-gray-600">
          Validez ou refusez les demandes reçues — un email de confirmation sera envoyé automatiquement.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
              activeTab === tab.key
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <ClipboardList className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 font-medium">Aucune demande</p>
          </div>
        ) : (
          filtered.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                {/* Left: patient info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[req.status]}`}
                    >
                      {STATUS_LABELS[req.status]}
                    </span>
                    <span className="text-xs text-gray-400">{relTime(req.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400 shrink-0" />
                    <p className="font-bold text-gray-900 text-lg">
                      {req.first_name} {req.last_name}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <Phone size={13} className="text-gray-400" />
                      {req.phone}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mail size={13} className="text-gray-400" />
                      {req.email}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <CalendarCheck size={15} className="text-brand-600" />
                    <p className="text-sm font-semibold text-brand-700">{req.service_name}</p>
                    {req.service_price != null && (
                      <span className="text-xs text-gray-500">
                        — {Number(req.service_price).toLocaleString("fr-FR")} FCFA
                      </span>
                    )}
                  </div>

                  {req.status === "validated" && req.assigned_date && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
                      <CheckCircle size={14} />
                      RDV : {formatDateFR(
                        new Date(req.assigned_date + "T00:00:00"),
                        req.assigned_time?.slice(0, 5) ?? ""
                      )}
                    </div>
                  )}

                  {req.status === "validated" && (
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      req.email_sent
                        ? "bg-blue-50 text-blue-600 border-blue-200"
                        : "bg-orange-50 text-orange-600 border-orange-200"
                    }`}>
                      <Mail size={11} />
                      {req.email_sent ? "Email envoyé" : "Email non envoyé"}
                    </div>
                  )}

                  {req.status === "rejected" && req.rejection_reason && (
                    <p className="text-sm text-red-500 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">
                      Motif : {req.rejection_reason}
                    </p>
                  )}
                </div>

                {/* Right: actions */}
                <div className="flex flex-col gap-2 min-w-[130px]">
                  {req.payment_screenshot && (
                    <button
                      onClick={() => setScreenViewer(req.payment_screenshot!)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
                    >
                      <Eye size={14} />
                      Voir capture
                    </button>
                  )}

                  {req.status === "pending" && (
                    <>
                      <button
                        onClick={() => openValidate(req)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-all"
                      >
                        <CheckCircle size={14} />
                        Valider
                      </button>
                      <button
                        onClick={() => openReject(req)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all"
                      >
                        <XCircle size={14} />
                        Refuser
                      </button>
                    </>
                  )}

                  {req.status === "validated" && !req.email_sent && (
                    <button
                      onClick={() => handleResendEmail(req)}
                      disabled={resendingId === req.id}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-orange-600 border border-orange-300 rounded-xl hover:bg-orange-50 transition-all disabled:opacity-60"
                    >
                      {resendingId === req.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Send size={13} />}
                      Renvoyer l'email
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Screenshot Viewer ─────────────────────────────────────────────── */}
      <Dialog open={!!screenViewer} onOpenChange={(o) => { if (!o) setScreenViewer(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Capture du paiement Wave</DialogTitle>
          </DialogHeader>
          {screenViewer && (
            <img
              src={screenViewer}
              alt="Capture paiement"
              className="w-full rounded-xl border border-gray-200 mt-2 max-h-[70vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Validation Confirm Modal ──────────────────────────────────────── */}
      <AlertDialog open={!!confirmingReq} onOpenChange={(o) => { if (!o) setConfirmingReq(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la réservation ?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Patient : <strong>{confirmingReq?.first_name} {confirmingReq?.last_name}</strong>
                  <br />
                  Prestation : <strong>{confirmingReq?.service_name}</strong>
                </p>
                {nextDate ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-800 font-semibold text-sm">
                    📅 Prochain créneau : {formatDateFR(nextDate.date, nextDate.time)}
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-sm">
                    ⚠️ Aucun jour de consultation actif configuré. La réservation sera validée sans date assignée.
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Un email de confirmation sera envoyé automatiquement à <strong>{confirmingReq?.email}</strong>.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirming}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmValidation}
              disabled={confirming}
              className="bg-brand-600 hover:bg-brand-700 text-white"
            >
              {confirming ? <Loader2 size={14} className="animate-spin mr-1 inline" /> : null}
              Confirmer et envoyer email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Rejection Modal ───────────────────────────────────────────────── */}
      <AlertDialog open={!!rejectingReq} onOpenChange={(o) => { if (!o) setRejectingReq(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refuser la demande ?</AlertDialogTitle>
            <AlertDialogDescription>
              La demande de <strong>{rejectingReq?.first_name} {rejectingReq?.last_name}</strong> sera marquée comme refusée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 py-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Motif du refus (optionnel)
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:border-brand-500 focus:outline-none resize-none"
              placeholder="Ex : Paiement non confirmé, créneau indisponible..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejecting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={rejecting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {rejecting ? <Loader2 size={14} className="animate-spin mr-1 inline" /> : null}
              Confirmer le refus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
