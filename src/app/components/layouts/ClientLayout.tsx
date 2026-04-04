import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router";
import { Menu, X } from "lucide-react";

export function ClientLayout() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
                <span className="text-lg font-bold">Kiné Excellence</span>
              </div>
              <p className="text-slate-200/85 text-sm leading-relaxed max-w-xs">
                Centre de kinésithérapie moderne offrant des soins personnalisés et de qualité depuis 2010.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-100 mb-3">Contact</h4>
              <ul className="space-y-1.5 text-sm text-slate-200/85">
                <li>123 Rue de la Santé, Paris</li>
                <li>01 23 45 67 89</li>
                <li>contact@kine-excellence.fr</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-100 mb-3">Horaires</h4>
              <ul className="space-y-1.5 text-sm text-slate-200/85">
                <li>Lun – Ven : 8h – 19h</li>
                <li>Samedi : 9h – 13h</li>
                <li className="text-red-400">Dimanche : Fermé</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-500/50 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-200/75">
            <p>© 2026 Kiné Excellence. Tous droits réservés.</p>
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
