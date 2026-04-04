import { Mail, Award, Stethoscope } from "lucide-react";
import { useTeamMembers } from "../../../lib/hooks/useTeamMembers";
import { useSiteContent } from "../../../lib/hooks/useSiteContent";

const DEFAULTS: Record<string, string> = {
  "team.hero.title":               "Notre Équipe",
  "team.hero.text":                "Des professionnels passionnés et expérimentés, dédiés à votre bien-être et votre rétablissement.",
  "team.qualifications.title":     "Nos Qualifications",
  "team.qualifications.q1_title":  "Diplômes d'État",
  "team.qualifications.q1_text":   "Tous nos kinésithérapeutes sont diplômés d'État et inscrits au Conseil de l'Ordre.",
  "team.qualifications.q2_title":  "Formation Continue",
  "team.qualifications.q2_text":   "Mise à jour régulière des compétences avec des formations spécialisées.",
  "team.qualifications.q3_title":  "Spécialisations",
  "team.qualifications.q3_text":   "Expertise en rééducation sportive, neurologique, respiratoire et périnéale.",
};

export function TeamPage() {
  const { members, loading } = useTeamMembers();
  const { content } = useSiteContent("team", DEFAULTS);
  const c = (key: string) => content[key] ?? DEFAULTS[key] ?? "";

  const qualifications = [
    { titleKey: "team.qualifications.q1_title", textKey: "team.qualifications.q1_text" },
    { titleKey: "team.qualifications.q2_title", textKey: "team.qualifications.q2_text" },
    { titleKey: "team.qualifications.q3_title", textKey: "team.qualifications.q3_text" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <section className="py-20 bg-gradient-to-r from-teal-600 via-teal-500 to-brand-500 text-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-black mb-5">{c("team.hero.title")}</h1>
          <p className="text-brand-50 text-base md:text-xl max-w-3xl mx-auto">{c("team.hero.text")}</p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl bg-gray-100 h-96 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {members.map((member) => (
                <article key={member.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden">
                  <div className="relative h-72 overflow-hidden">
                    <img
                      src={member.photo_base64 ?? "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400"}
                      alt={member.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-700/65 via-slate-500/15 to-transparent" />
                    <div className="absolute left-4 bottom-4 right-4">
                      <h3 className="text-2xl font-black text-white mb-1">{member.name}</h3>
                      <p className="text-sm text-brand-100 font-medium">{member.title}</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-700 bg-brand-50 rounded-full px-3 py-1 mb-4">
                      <Award size={14} /> {member.specialty}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-5">{member.bio}</p>
                    <button className="w-full inline-flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                      <Mail size={16} /> Contacter
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 text-center mb-12">{c("team.qualifications.title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {qualifications.map((item) => (
              <article key={item.titleKey} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mb-4">
                  <Stethoscope size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{c(item.titleKey)}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{c(item.textKey)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
