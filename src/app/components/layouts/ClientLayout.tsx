import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router";
import { Menu, X } from "lucide-react";
import { useSiteContent } from "../../../lib/hooks/useSiteContent";

const FOOTER_SOCIAL_PLATFORMS = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    color: "#25D366",
    svgPath:
      "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z",
  },
  {
    key: "facebook",
    label: "Facebook",
    color: "#1877F2",
    svgPath:
      "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  {
    key: "instagram",
    label: "Instagram",
    color: "#E4405F",
    svgPath:
      "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  },
  {
    key: "tiktok",
    label: "TikTok",
    color: "#010101",
    svgPath:
      "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.68a4.85 4.85 0 01-1.01.01z",
  },
  {
    key: "twitter",
    label: "Twitter / X",
    color: "#000000",
    svgPath:
      "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
] as const;

export function ClientLayout() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { content: footer } = useSiteContent("footer", {
    "footer.brand.name":        "Kiné Excellence",
    "footer.brand.description": "Centre de kinésithérapie moderne offrant des soins personnalisés et de qualité depuis 2010.",
    "footer.contact.address":   "123 Rue de la Santé, Paris",
    "footer.contact.phone":     "01 23 45 67 89",
    "footer.contact.email":     "contact@kine-excellence.fr",
    "footer.hours.weekdays":    "Lun – Ven : 8h – 19h",
    "footer.hours.saturday":    "Samedi : 9h – 13h",
    "footer.hours.sunday":      "Dimanche : Fermé",
    "footer.legal.copyright":   "© 2026 Kiné Excellence. Tous droits réservés.",
    "footer.social.whatsapp.url": "",
    "footer.social.whatsapp.visible": "false",
    "footer.social.facebook.url": "",
    "footer.social.facebook.visible": "false",
    "footer.social.instagram.url": "",
    "footer.social.instagram.visible": "false",
    "footer.social.tiktok.url": "",
    "footer.social.tiktok.visible": "false",
    "footer.social.twitter.url": "",
    "footer.social.twitter.visible": "false",
  });

  const visibleSocials = FOOTER_SOCIAL_PLATFORMS.filter(
    (p) => footer[`footer.social.${p.key}.visible`] === "true" && footer[`footer.social.${p.key}.url`]
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const navItems = [
    { path: "/", label: "Accueil" },
    { path: "/about", label: "À Propos" },
    { path: "/gallery", label: "Galerie" },
    { path: "/team", label: "Notre Équipe" },
    { path: "/contact", label: "Contact" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-md shadow-md" : "bg-white shadow-sm border-b border-gray-100"}`}>
        <div className="max-w-6xl mx-auto px-6 py-3.5">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-brand-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-brand-200 transition-shadow">
                <span className="text-white text-lg font-black">K</span>
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">Kiné Excellence</h1>
                <p className="text-[10px] text-brand-600 font-medium tracking-wide uppercase">Cabinet de Kinésithérapie</p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-teal-500 to-brand-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-brand-700 hover:bg-brand-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden md:flex items-center gap-2">
              <Link
                to="/login?role=patient"
                className="px-4 py-2 text-sm font-semibold text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-50 transition-all"
              >
                Espace Patient
              </Link>
              <Link
                to="/login?role=admin"
                className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-teal-500 to-brand-600 text-white rounded-lg hover:from-teal-600 hover:to-brand-700 shadow-sm transition-all"
              >
                Connexion
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <nav className="md:hidden pt-3 pb-2 border-t border-gray-100 mt-3 flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive ? "bg-gradient-to-r from-teal-500 to-brand-600 text-white" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                <Link to="/login?role=patient" className="flex-1 text-center py-2 text-sm font-semibold text-brand-700 border border-brand-200 rounded-lg">Espace Patient</Link>
                <Link to="/login?role=admin" className="flex-1 text-center py-2 text-sm font-semibold bg-gradient-to-r from-teal-500 to-brand-600 text-white rounded-lg">Connexion</Link>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 text-white mt-20 border-t-2 border-brand-500/20">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-brand-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-black">K</span>
                </div>
                <span className="text-lg font-bold">{footer["footer.brand.name"]}</span>
              </div>
              <p className="text-slate-200/85 text-sm leading-relaxed max-w-xs">
                {footer["footer.brand.description"]}
              </p>
              {visibleSocials.length > 0 && (
                <div className="flex gap-2 mt-4">
                  {visibleSocials.map((p) => (
                    <a
                      key={p.key}
                      href={footer[`footer.social.${p.key}.url`]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={p.label}
                      className="w-9 h-9 rounded-xl flex items-center justify-center hover:scale-110 hover:shadow-lg transition-all"
                      style={{ backgroundColor: p.color }}
                    >
                      <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                        <path d={p.svgPath} />
                      </svg>
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-100 mb-3">Contact</h4>
              <ul className="space-y-1.5 text-sm text-slate-200/85">
                <li>{footer["footer.contact.address"]}</li>
                <li>{footer["footer.contact.phone"]}</li>
                <li>{footer["footer.contact.email"]}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-100 mb-3">Horaires</h4>
              <ul className="space-y-1.5 text-sm text-slate-200/85">
                <li>{footer["footer.hours.weekdays"]}</li>
                <li>{footer["footer.hours.saturday"]}</li>
                <li className="text-red-400">{footer["footer.hours.sunday"]}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-500/50 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-200/75">
            <p>{footer["footer.legal.copyright"]}</p>
            <div className="flex gap-4">
              <Link to="/about" className="hover:text-brand-400 transition-colors">À propos</Link>
              <Link to="/contact" className="hover:text-brand-400 transition-colors">Contact</Link>
              <Link to="/login?role=patient" className="hover:text-brand-400 transition-colors">Espace Patient</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
