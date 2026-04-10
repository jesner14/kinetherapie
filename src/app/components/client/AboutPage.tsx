import { CheckCircle, Award, Target, Users, Sparkles } from "lucide-react";
import { useSiteContent } from "../../../lib/hooks/useSiteContent";
import { PageLoader } from "../common/PageLoader";

const DEFAULTS: Record<string, string> = {
  "about.hero.title":          "Excellence, Écoute et Dévouement",
  "about.hero.image":          "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1400",
  "about.history.title":       "Notre Histoire",
  "about.history.text1":       "Fondé il y a plus de 15 ans, notre cabinet s'est construit sur une volonté d'offrir des soins de kinésithérapie d'excellence dans un cadre humain et bienveillant.",
  "about.history.text2":       "Nous croyons fermement qu'une rééducation efficace repose sur un mélange d'expertise clinique, d'écoute active et d'objectifs clairs. Chaque patient bénéficie d'un plan adapté, revu régulièrement selon sa progression.",
  "about.stats.years":         "15+",
  "about.stats.years_label":   "Ans d'expérience",
  "about.stats.patients":      "3000+",
  "about.stats.patients_label":"Patients suivis",
  "about.stats.satisfaction":  "98%",
  "about.stats.satisfaction_label":"Satisfaction",
  "about.stats.team":          "5",
  "about.stats.team_label":    "Professionnels",
  "about.values.title":        "Nos Valeurs",
  "about.values.v1_title":     "Excellence",
  "about.values.v1_text":      "Nous garantissons des soins de haut niveau, basés sur des protocoles fiables.",
  "about.values.v2_title":     "Écoute",
  "about.values.v2_text":      "Chaque patient est écouté, compris et accompagné selon son rythme.",
  "about.values.v3_title":     "Précision",
  "about.values.v3_text":      "Chaque séance suit des objectifs concrets et mesurables.",
  "about.values.v4_title":     "Engagement",
  "about.values.v4_text":      "Nous nous investissons pleinement dans votre récupération.",
  "about.mission.title":       "Notre Mission",
  "about.mission.text":        "Offrir à chaque patient des soins de kinésithérapie de la plus haute qualité dans un environnement professionnel et chaleureux. Nous vous accompagnons tout au long de votre parcours avec expertise, compassion et détermination.",
};

export function AboutPage() {
  const { content, loading } = useSiteContent("about", DEFAULTS);
  const c = (key: string) => content[key] ?? DEFAULTS[key] ?? "";

  if (loading) return <PageLoader text="Chargement de la page..." />;

  const values = [
    { icon: Award,        titleKey: "about.values.v1_title", textKey: "about.values.v1_text" },
    { icon: Users,        titleKey: "about.values.v2_title", textKey: "about.values.v2_text" },
    { icon: Target,       titleKey: "about.values.v3_title", textKey: "about.values.v3_text" },
    { icon: CheckCircle,  titleKey: "about.values.v4_title", textKey: "about.values.v4_text" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <section className="relative h-[420px] md:h-[500px] overflow-hidden">
        <img src={c("about.hero.image")} alt="A propos" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-700/75 via-slate-600/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-6xl mx-auto px-6 w-full text-white">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-brand-200 bg-brand-600/20 border border-brand-300/30 rounded-full px-3 py-1 mb-4">
              <Sparkles size={14} /> Notre ADN
            </span>
            <h1 className="text-4xl md:text-6xl font-black max-w-3xl leading-tight">{c("about.hero.title")}</h1>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6">{c("about.history.title")}</h2>
              <p className="text-gray-700 text-base md:text-lg leading-relaxed mb-5">{c("about.history.text1")}</p>
              <p className="text-gray-600 text-base leading-relaxed">{c("about.history.text2")}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { val: "about.stats.years",        lbl: "about.stats.years_label" },
                { val: "about.stats.patients",     lbl: "about.stats.patients_label" },
                { val: "about.stats.satisfaction", lbl: "about.stats.satisfaction_label" },
                { val: "about.stats.team",         lbl: "about.stats.team_label" },
              ].map((item) => (
                <div key={item.val} className="rounded-2xl bg-gradient-to-br from-teal-500 to-brand-600 text-white p-6 shadow-lg">
                  <p className="text-3xl md:text-4xl font-black mb-1">{c(item.val)}</p>
                  <p className="text-sm text-brand-100">{c(item.lbl)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 text-center">{c("about.values.title")}</h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto mb-12">Des principes simples, appliques avec rigueur chaque jour.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.titleKey} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all">
                  <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mb-4">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{c(item.titleKey)}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{c(item.textKey)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 text-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-5">{c("about.mission.title")}</h2>
          <p className="text-slate-100 text-base md:text-xl leading-relaxed max-w-4xl mx-auto">{c("about.mission.text")}</p>
        </div>
      </section>
    </div>
  );
}
