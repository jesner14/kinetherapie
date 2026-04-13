import { useState, useEffect, useRef } from "react";
import { MapPin, Phone, Mail, Clock, Send, Loader2, Stethoscope, ExternalLink, Upload, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useSiteContent } from "../../../lib/hooks/useSiteContent";
import { PageLoader } from "../common/PageLoader";
import { supabase, type Service } from "../../../lib/supabase";
import { useIsMobile } from "../ui/use-mobile";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";

// ── Wave URL builder (handles existing params safely) ──────────────────────
function buildWaveUrl(baseLink: string | null, price: number | null | undefined): string | null {
  if (!baseLink) return null;
  try {
    const url = new URL(baseLink);
    if (price != null) url.searchParams.set("amount", String(price));
    return url.toString();
  } catch {
    return baseLink;
  }
}

// ── Self-contained booking form (owns its own state) ─────────────────────
interface BookingFormBodyProps {
  selectedService: Service | null;
  waveBaseLink: string | null;
  onClose: () => void;
}

function BookingFormBody({ selectedService, waveBaseLink, onClose }: BookingFormBodyProps) {
  const [bookingData, setBookingData] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setError("L'image doit faire moins de 3 Mo."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setPaymentScreenshot(ev.target?.result as string); setError(null); };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    console.log("=== handleSubmit called ===");
    console.log("bookingData:", bookingData);
    console.log("paymentScreenshot:", !!paymentScreenshot);
    console.log("selectedService:", selectedService);
    setError(null);
    if (!bookingData.firstName.trim()) { setError("Veuillez entrer votre prénom."); return; }
    if (!bookingData.lastName.trim()) { setError("Veuillez entrer votre nom."); return; }
    if (!bookingData.phone.trim()) { setError("Veuillez entrer votre numéro de téléphone."); return; }
    if (!bookingData.email.trim()) { setError("Veuillez entrer votre adresse email."); return; }
    if (!paymentScreenshot) { setError("Veuillez joindre la capture de votre paiement Wave."); return; }
    if (!selectedService) { setError("Aucune prestation sélectionnée."); return; }

    console.log("=== All validations passed, calling supabase ===");
    setSubmitting(true);
    try {
      const { error: dbError } = await supabase.from("booking_requests").insert({
        first_name: bookingData.firstName.trim(),
        last_name: bookingData.lastName.trim(),
        phone: bookingData.phone.trim(),
        email: bookingData.email.trim(),
        service_id: selectedService.id,
        service_name: selectedService.name,
        service_price: selectedService.price,
        payment_screenshot: paymentScreenshot,
        status: "pending",
      });
      console.log("=== Supabase result ===", dbError);
      if (dbError) throw dbError;
      setSuccess(true);
    } catch (e) {
      console.error("Booking error:", e);
      setError("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-5 py-8 text-center">
        <CheckCircle2 className="text-green-500" size={64} />
        <h3 className="text-xl font-bold text-gray-900">Demande enregistrée !</h3>
        <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
          Votre demande a bien été transmise. Le médecin la traitera dans les plus brefs délais
          et vous recevrez un email de confirmation avec la date de votre rendez-vous.
        </p>
        <button
          onClick={onClose}
          className="mt-1 w-full max-w-xs px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-base transition-colors"
        >
          Fermer
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {/* ── Étape 1 : Payer via Wave ── */}
      <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 flex flex-col gap-3">
        <p className="font-semibold text-brand-800 text-sm flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold shrink-0">1</span>
          Effectuez le paiement
        </p>
        {selectedService?.price != null && (
          <div className="text-center py-1">
            <p className="text-xs text-brand-500 font-medium mb-0.5">Montant à payer</p>
            <p className="text-brand-700 font-black text-3xl">
              {Number(selectedService.price).toLocaleString("fr-FR")} FCFA
            </p>
          </div>
        )}
        {waveBaseLink ? (
          <a
            href={buildWaveUrl(waveBaseLink, selectedService?.price) ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-brand-600 text-white px-5 py-4 rounded-2xl font-bold text-base active:scale-95 transition-all"
          >
            <ExternalLink size={18} />
            Payer via Wave
          </a>
        ) : (
          <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-xl px-3 py-3 text-center">
            Lien de paiement non configuré. Contactez-nous directement.
          </p>
        )}
        <p className="text-xs text-brand-500 text-center">Après avoir payé, remplissez le formulaire ci-dessous.</p>
      </div>

      {/* ── Étape 2 : Vos informations ── */}
      <div className="flex flex-col gap-3">
        <p className="font-semibold text-gray-700 text-sm flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold shrink-0">2</span>
          Vos informations
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-600">Prénom *</label>
            <input
              autoComplete="given-name"
              value={bookingData.firstName}
              onChange={(e) => { setBookingData((d) => ({ ...d, firstName: e.target.value })); setError(null); }}
              placeholder="Prénom"
              className="border border-gray-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-600">Nom *</label>
            <input
              autoComplete="family-name"
              value={bookingData.lastName}
              onChange={(e) => { setBookingData((d) => ({ ...d, lastName: e.target.value })); setError(null); }}
              placeholder="Nom de famille"
              className="border border-gray-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-600">Téléphone *</label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={bookingData.phone}
              onChange={(e) => { setBookingData((d) => ({ ...d, phone: e.target.value })); setError(null); }}
              placeholder="+225 07 00 00 00 00"
              className="border border-gray-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-600">Email *</label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={bookingData.email}
              onChange={(e) => { setBookingData((d) => ({ ...d, email: e.target.value })); setError(null); }}
              placeholder="votre@email.com"
              className="border border-gray-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>
      </div>

      {/* ── Étape 3 : Capture du paiement ── */}
      <div className="flex flex-col gap-3">
        <p className="font-semibold text-gray-700 text-sm flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold shrink-0">3</span>
          Capture de votre paiement *
        </p>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        {paymentScreenshot ? (
          <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200">
            <img src={paymentScreenshot} alt="Capture paiement" className="w-full max-h-56 object-contain bg-gray-50" />
            <button
              type="button"
              onClick={() => { setPaymentScreenshot(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="absolute top-2.5 right-2.5 bg-red-500 text-white rounded-full p-2 shadow-md"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 hover:border-brand-400 rounded-2xl py-10 text-gray-400 hover:text-brand-500 transition-colors"
          >
            <Upload size={32} />
            <span className="text-sm font-medium">Appuyez pour ajouter une photo</span>
            <span className="text-xs text-gray-300">Galerie ou appareil photo · max 3 Mo</span>
          </button>
        )}
      </div>

      {/* ── Submit ── */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-60 text-white py-4 rounded-2xl font-bold text-base transition-colors"
      >
        {submitting ? <><Loader2 className="animate-spin" size={20} /> Envoi en cours…</> : "Envoyer ma demande"}
      </button>
    </div>
  );
}

const DEFAULTS: Record<string, string> = {
  "contact.hero.title":        "Contactez-Nous",
  "contact.hero.text":         "Nous sommes à votre écoute pour répondre à vos questions et planifier votre prise en charge.",
  "contact.info.address1":     "123 Rue de la Santé",
  "contact.info.address2":     "75000 Paris, France",
  "contact.info.phone1":       "01 23 45 67 89",
  "contact.info.phone2":       "Urgences: 06 98 76 54 32",
  "contact.info.email1":       "contact@kine-excellence.fr",
  "contact.info.email2":       "rdv@kine-excellence.fr",
  "contact.info.hours1":       "Lundi - Vendredi : 8h - 19h",
  "contact.info.hours2":       "Samedi : 9h - 13h",
  "contact.info.hours3":       "Dimanche : Fermé",
  "contact.info.office_image": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900",
};

export function ContactPage() {
  const { content, loading } = useSiteContent("contact", DEFAULTS);
  const c = (key: string) => content[key] ?? DEFAULTS[key] ?? "";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const isMobile = useIsMobile();

  // ── Services ──────────────────────────────────────────────────────────────
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [waveBaseLink, setWaveBaseLink] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setServices((data ?? []) as Service[]));

    supabase
      .from("site_content")
      .select("value")
      .eq("id", "global.wave.payment_link")
      .single()
      .then(({ data }) => { if (data) setWaveBaseLink(data.value || null); });
  }, []);

  const handleConfirmYes = () => {
    setShowConfirmDialog(false);
    setShowBookingDialog(true);
  };

  const handleConfirmNo = () => {
    setShowConfirmDialog(false);
    setSelectedService(null);
  };

  const closeBookingDialog = () => {
    setShowBookingDialog(false);
    setSelectedService(null);
  };

  if (loading) return <PageLoader text="Chargement de la page..." />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      message: formData.message,
    });
    setSending(false);
    if (error) {
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
      return;
    }
    toast.success("Message envoyé ! Nous vous répondrons rapidement.");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
    setFormData({ name: "", email: "", phone: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-white">
      <section className="py-20 bg-gradient-to-r from-teal-600 via-teal-500 to-brand-500 text-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-black mb-5">{c("contact.hero.title")}</h1>
          <p className="text-slate-100 text-base md:text-xl max-w-3xl mx-auto">{c("contact.hero.text")}</p>
        </div>
      </section>

      {/* ── Service Selector ─────────────────────────────────────────────── */}
      {services.length > 0 && (
        <section className="py-12 bg-gray-50 border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">
                Réserver une consultation
              </h2>
              <p className="text-gray-500 text-sm md:text-base">
                Sélectionnez une prestation puis demandez votre réservation
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Type de prestation
                </label>
                <select
                  value={selectedService?.id ?? ""}
                  onChange={(e) => {
                    const found = services.find((s) => s.id === e.target.value) ?? null;
                    setSelectedService(found);
                  }}
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none bg-white text-gray-900 text-base"
                >
                  <option value="">-- Choisir une prestation --</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.price != null ? ` — ${Number(s.price).toLocaleString("fr-FR")} FCFA` : ""}
                    </option>
                  ))}
                </select>
                {selectedService?.description && (
                  <p className="mt-2 text-sm text-gray-500">{selectedService.description}</p>
                )}
              </div>

              <button
                disabled={!selectedService}
                onClick={() => selectedService && setShowConfirmDialog(true)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-brand-600 text-white px-6 py-4 rounded-xl hover:from-teal-600 hover:to-brand-700 transition-all text-base font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Stethoscope size={20} />
                Demander une réservation
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Contact Form + Sidebar ──────────────────────────────────────── */}
      <section className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl shadow-sm p-6 md:p-8">
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-7">Envoyez-nous un message</h2>

              {submitted && (
                <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 text-brand-700 px-4 py-3 text-sm">
                  Merci, votre message a ete envoye. Nous vous repondrons rapidement.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Nom complet</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                      placeholder="Jean Dupont"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Telephone</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                      placeholder="06 12 34 56 78"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                    placeholder="jean.dupont@email.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Message</label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none resize-none"
                    placeholder="Decrivez votre besoin..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-brand-600 text-white px-6 py-3 rounded-xl hover:from-teal-600 hover:to-brand-700 transition-all text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {sending ? "Envoi en cours..." : "Envoyer"}
                </button>
              </form>
            </div>

            <aside className="lg:col-span-2 space-y-4">
              {[
                {
                  icon: MapPin,
                  title: "Adresse",
                  lines: [c("contact.info.address1"), c("contact.info.address2")],
                },
                {
                  icon: Phone,
                  title: "Telephone",
                  lines: [c("contact.info.phone1"), c("contact.info.phone2")],
                },
                {
                  icon: Mail,
                  title: "Email",
                  lines: [c("contact.info.email1"), c("contact.info.email2")],
                },
                {
                  icon: Clock,
                  title: "Horaires",
                  lines: [c("contact.info.hours1"), c("contact.info.hours2"), c("contact.info.hours3")],
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
                        <Icon size={18} />
                      </div>
                      <h3 className="text-base font-bold text-gray-900">{item.title}</h3>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      {item.lines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="rounded-2xl overflow-hidden border border-gray-100">
                <img
                  src={c("contact.info.office_image")}
                  alt="Cabinet"
                  className="w-full h-56 object-cover"
                />
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── Dialog 1: Confirmation ───────────────────────────────────────── */}
      <AlertDialog open={showConfirmDialog} onOpenChange={(o) => { if (!o) setShowConfirmDialog(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réserver une consultation</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous réserver une consultation pour{" "}
              <strong>{selectedService?.name}</strong> ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleConfirmNo}>Non</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmYes} className="bg-brand-600 hover:bg-brand-700 text-white">
              Oui
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Booking modal: Drawer on mobile, Dialog on desktop ─────────── */}
      {isMobile ? (
        <Drawer open={showBookingDialog} onOpenChange={(o) => { if (!o) closeBookingDialog(); }} direction="bottom">
          <DrawerContent className="max-h-[94svh] flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-scroll overscroll-contain px-5 pb-10">
              <DrawerHeader className="px-0 pb-3 pt-1">
                <DrawerTitle className="text-lg font-bold text-gray-900">
                  {`Réserver — ${selectedService?.name ?? ""}`}
                </DrawerTitle>
              </DrawerHeader>
              <BookingFormBody
                selectedService={selectedService}
                waveBaseLink={waveBaseLink}
                onClose={closeBookingDialog}
              />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={showBookingDialog} onOpenChange={(o) => { if (!o) closeBookingDialog(); }}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-gray-900">
                {`Réserver — ${selectedService?.name ?? ""}`}
              </DialogTitle>
            </DialogHeader>
            <BookingFormBody
              selectedService={selectedService}
              waveBaseLink={waveBaseLink}
              onClose={closeBookingDialog}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

