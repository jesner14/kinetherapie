import { useState } from "react";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import { useSiteContent } from "../../../lib/hooks/useSiteContent";

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
  const { content } = useSiteContent("contact", DEFAULTS);
  const c = (key: string) => content[key] ?? DEFAULTS[key] ?? "";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
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
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-brand-600 text-white px-6 py-3 rounded-xl hover:from-teal-600 hover:to-brand-700 transition-all text-sm font-semibold"
                >
                  <Send size={16} /> Envoyer
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
    </div>
  );
}
