import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Star, Calendar, CheckCircle2, Heart, Sparkles, Activity, ArrowRight } from "lucide-react";
import { mockReviews } from "../../data/mockData";
import { Link } from "react-router";
import { useSiteContent } from "../../../lib/hooks/useSiteContent";
import { PageLoader } from "../common/PageLoader";

const DEFAULTS: Record<string, string> = {
  "home.hero.slide1.title":        "Kiné Excellence — Votre Récupération, Notre Priorité",
  "home.hero.slide1.text":         "Des soins personnalisés pour retrouver mobilité, force et bien-être.",
  "home.hero.slide1.cta":          "Prendre Rendez-vous",
  "home.hero.slide1.image":        "",
  "home.hero.slide2.title":        "Rééducation de Haute Précision",
  "home.hero.slide2.text":         "Une équipe diplômée et une approche personnalisée pour accélérer votre récupération.",
  "home.hero.slide2.cta":          "Découvrir l'équipe",
  "home.hero.slide2.image":        "",
  "home.hero.slide3.title":        "Cabinet Moderne et Humain",
  "home.hero.slide3.text":         "Des équipements récents et un accompagnement bienveillant à chaque étape.",
  "home.hero.slide3.cta":          "En savoir plus",
  "home.hero.slide3.image":        "",
  "home.stats.patients":           "3000+",
  "home.stats.patients_label":     "Patients suivis",
  "home.stats.satisfaction":       "98%",
  "home.stats.satisfaction_label": "Satisfaction",
  "home.stats.years":              "15+",
  "home.stats.years_label":        "Années d'expérience",
  "home.stats.care":               "Personnalisée",
  "home.stats.care_label":         "Prise en charge",
  "home.services.title":           "Nos Expertises Thérapeutiques",
  "home.services.subtitle":        "Une gamme complète de soins kinésithérapiques pour chaque besoin.",
  "home.services.s1_title":        "Rééducation Sportive",
  "home.services.s1_text":         "Reprenez votre activité en sécurité après blessure.",
  "home.services.s2_title":        "Post-Opératoire",
  "home.services.s2_text":         "Suivi ciblé et progressif après intervention.",
  "home.services.s3_title":        "Rééducation Périnéale",
  "home.services.s3_text":         "Prise en charge spécialisée pré/post-natal.",
  "home.services.s4_title":        "Thérapie Manuelle",
  "home.services.s4_text":         "Techniques expertes pour soulager vos douleurs.",
  "home.cta.title":                "Prêt à relancer votre mobilité ?",
  "home.cta.text":                 "Planifiez votre première séance et bénéficiez d'un accompagnement professionnel, humain et mesurable.",
  "home.cta.button":               "Réserver maintenant",
};

export function HomePage() {
  const { content, loading } = useSiteContent("home", DEFAULTS);
  const c = (key: string) => content[key] ?? DEFAULTS[key] ?? "";

  if (loading) return <PageLoader text="Chargement de la page..." />;

  const carouselSettings = {
    dots: true,
    infinite: true,
    speed: 700,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    arrows: false,
    pauseOnHover: true,
  };

  const reviewSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3500,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 2 } },
      { breakpoint: 640, settings: { slidesToShow: 1 } },
    ],
  };

  const slides = [
    { num: "1", to: "/contact" },
    { num: "2", to: "/team" },
    { num: "3", to: "/about" },
  ];

  const services = [
    { icon: Heart,        titleKey: "home.services.s1_title", textKey: "home.services.s1_text" },
    { icon: CheckCircle2, titleKey: "home.services.s2_title", textKey: "home.services.s2_text" },
    { icon: Activity,     titleKey: "home.services.s3_title", textKey: "home.services.s3_text" },
    { icon: Calendar,     titleKey: "home.services.s4_title", textKey: "home.services.s4_text" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero Carousel ── */}
      <section className="relative">
        {loading ? (
          <div className="h-[76vh] min-h-[520px] max-h-[760px] bg-slate-200 animate-pulse" />
        ) : null}
        <Slider {...carouselSettings} className={loading ? "invisible h-0 overflow-hidden" : ""}>
          {slides.map((s) => (
            <div key={s.num} className="relative h-[76vh] min-h-[520px] max-h-[760px]">
              <img src={c(`home.hero.slide${s.num}.image`)} alt={c(`home.hero.slide${s.num}.title`)} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-teal-900/75 via-brand-900/45 to-transparent" />
              <div className="absolute inset-0 flex items-center">
                <div className="max-w-6xl mx-auto px-6 w-full text-white">
                  <div className="max-w-2xl">
                    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-teal-200 bg-teal-600/20 border border-teal-300/30 rounded-full px-3 py-1 mb-5">
                      <Sparkles size={14} /> Kinesitherapie Premium
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black leading-tight mb-5">{c(`home.hero.slide${s.num}.title`)}</h1>
                    <p className="text-base md:text-xl text-gray-100 mb-8 leading-relaxed max-w-xl">{c(`home.hero.slide${s.num}.text`)}</p>
                    <div className="flex flex-wrap gap-3">
                      <Link to={s.to} className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-brand-600 hover:from-teal-400 hover:to-brand-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand-900/20">
                        {c(`home.hero.slide${s.num}.cta`)}
                        <ArrowRight size={16} />
                      </Link>
                      <Link to="/login?role=patient" className="inline-flex items-center gap-2 border border-white/40 hover:border-white text-white px-6 py-3 rounded-xl font-semibold transition-all">
                        Espace Patient
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </section>

      {/* ── Stats bar ── */}
      <section className="-mt-10 relative z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 md:p-6">
            {[
              { val: "home.stats.patients",    lbl: "home.stats.patients_label" },
              { val: "home.stats.satisfaction", lbl: "home.stats.satisfaction_label" },
              { val: "home.stats.years",        lbl: "home.stats.years_label" },
              { val: "home.stats.care",         lbl: "home.stats.care_label" },
            ].map((item) => (
              <div key={item.val} className="text-center">
                <p className="text-2xl md:text-3xl font-black text-gray-900">{c(item.val)}</p>
                <p className="text-xs md:text-sm text-gray-500">{c(item.lbl)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">{c("home.services.title")}</h2>
            <p className="text-gray-600 text-base md:text-lg">{c("home.services.subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <article key={service.titleKey} className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mb-5 group-hover:bg-gradient-to-br group-hover:from-teal-500 group-hover:to-brand-600 group-hover:text-white transition-all">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{c(service.titleKey)}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{c(service.textKey)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Reviews ── */}
      <section className="py-20 bg-gradient-to-br from-gray-50 via-brand-50/30 to-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">Ce Que Disent Nos Patients</h2>
            <p className="text-gray-600">Des resultats concrets, une relation de confiance durable.</p>
          </div>
          <Slider {...reviewSettings}>
            {mockReviews.map((review) => (
              <div key={review.id} className="px-2">
                <div className="h-full rounded-2xl bg-white border border-gray-200 p-6 shadow-md hover:shadow-xl transition-shadow">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} />
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed italic mb-5">"{review.comment}"</p>
                  <div className="pt-4 border-t border-gray-100">
                    <p className="font-semibold text-gray-900">{review.patientName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(review.date).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-gradient-to-r from-teal-500 via-teal-400 to-brand-500">
        <div className="max-w-5xl mx-auto px-6 text-center text-white">
          <h2 className="text-3xl md:text-5xl font-black mb-4">{c("home.cta.title")}</h2>
          <p className="text-brand-50 text-base md:text-xl mb-8 max-w-2xl mx-auto">{c("home.cta.text")}</p>
          <Link to="/contact" className="inline-flex items-center gap-2 bg-white text-brand-700 px-7 py-3 rounded-xl font-bold hover:bg-brand-50 transition-all shadow-xl">
            {c("home.cta.button")}
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
