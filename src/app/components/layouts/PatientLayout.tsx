import { Outlet, Link, useLocation, useNavigate } from "react-router";
import {
  Calendar,
  MessageSquare,
  Home as HomeIcon,
  LogOut,
  Star,
} from "lucide-react";
import { useAuth } from "../../../lib/AuthContext";

export function PatientLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const navItems = [
    { path: "/patient", label: "Accueil", icon: HomeIcon },
    { path: "/patient/booking", label: "Réservations", icon: Calendar },
    { path: "/patient/messages", label: "Messages", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <span className="text-green-600 text-2xl font-bold">K</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Espace Patient</h1>
                <p className="text-green-100 text-sm">Kiné Excellence</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="text-white hover:text-green-100 transition-all"
              >
                Retour au site
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-green-100">{profile?.full_name ?? ""}</span>
                <div className="w-10 h-10 bg-green-700 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {profile?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? ""}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-4 overflow-x-auto py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === "/patient"
                  ? location.pathname === "/patient"
                  : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-green-600 text-white"
                      : "text-gray-700 hover:bg-green-50 hover:text-green-600"
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-green-700 text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-green-100">© 2026 Kiné Excellence</p>
              <p className="text-green-100 text-sm">
                Tous droits réservés
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-800 transition-all"
            >
              <LogOut size={20} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
