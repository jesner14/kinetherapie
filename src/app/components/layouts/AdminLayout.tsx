import { Outlet, Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  FileText,
  Users,
  Calendar,
  Images,
  MessageSquare,
  Star,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../../lib/AuthContext";

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const navItems = [
    { path: "/admin", label: "Tableau de Bord", icon: LayoutDashboard },
    { path: "/admin/content", label: "Gestion du Contenu", icon: FileText },
    { path: "/admin/gallery", label: "Galerie", icon: Images },
    { path: "/admin/patients", label: "Patients", icon: Users },
    { path: "/admin/calendar", label: "Calendrier", icon: Calendar },
    { path: "/admin/messages", label: "Messages", icon: MessageSquare },
    { path: "/admin/reviews", label: "Avis", icon: Star },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-green-700 text-white flex flex-col">
        <div className="p-4 border-b border-green-600">
          <h1 className="text-lg font-bold">Admin Panel</h1>
          <p className="text-green-200 text-xs mt-0.5">Kiné Excellence</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-green-600 text-white"
                    : "text-green-100 hover:bg-green-600"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-green-600">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-green-100 hover:bg-green-600 transition-all"
          >
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm px-6 py-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">
              Espace Administrateur
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{profile?.full_name ?? ""}</span>
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {profile?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? ""}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
