import { Link } from "react-router";
import { SearchX } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="min-h-[65vh] flex items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full text-center bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <div className="w-14 h-14 mx-auto rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-4">
          <SearchX size={26} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 mb-2">Erreur 404</p>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-3">Page introuvable</h1>
        <p className="text-sm text-gray-600 mb-6">
          Le lien que vous avez ouvert n'existe pas ou a ete deplace.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="px-4 py-2.5 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors">
            Retour a l'accueil
          </Link>
          <Link to="/gallery" className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">
            Voir la galerie
          </Link>
        </div>
      </div>
    </div>
  );
}
