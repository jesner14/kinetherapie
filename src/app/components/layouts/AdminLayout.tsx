import { useState, useEffect, useRef } from "react";
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
  CalendarCheck,
  Stethoscope,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "../../../lib/AuthContext";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, user } = useAuth();

  // Badge: count of new pending appointments not yet seen by doctor
  const [pendingBadge, setPendingBadge] = useState(0);
  const [bookingBadge, setBookingBadge] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // On mount: fetch current pending count
  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("doctor_id", user.id)
      .eq("status", "pending")
      .then(({ count }) => setPendingBadge(count ?? 0));

    supabase
      .from("booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }) => setBookingBadge(count ?? 0));

    // Subscribe to new appointments (realtime)
    const channel = supabase
      .channel("admin_appointments_notify")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments" },
        async (payload) => {
          // Only notify the doctor targeted by this appointment
          if ((payload.new as { doctor_id: string }).doctor_id !== user.id) return;

          // Fetch the patient's name for the toast
          const { data: patientData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", (payload.new as { patient_id: string }).patient_id)
            .single();

          const { data: slotData } = await supabase
            .from("availabilities")
            .select("slot_date, start_time")
            .eq("id", (payload.new as { availability_id: string }).availability_id)
            .single();

          const name = patientData?.full_name ?? "Un patient";
          const date = slotData
            ? new Date(slotData.slot_date + "T00:00:00").toLocaleDateString("fr-FR", {
                day: "numeric", month: "long",
              }) + " à " + slotData.start_time.slice(0, 5)
            : "";

          toast.info(`🗓 Nouveau rendez-vous`, {
            description: `${name} a réservé${date ? " le " + date : ""}.`,
            action: {
              label: "Voir",
              onClick: () => navigate("/admin/appointments"),
            },
            duration: 8000,
          });

          setPendingBadge(n => n + 1);
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [user?.id]);

  // Reset badge when doctor visits the appointments page
  useEffect(() => {
    if (location.pathname.startsWith("/admin/appointments")) setPendingBadge(0);
    if (location.pathname.startsWith("/admin/bookings")) setBookingBadge(0);
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const navItems = [
    { path: "/admin",              label: "Tableau de Bord",    icon: LayoutDashboard },
    { path: "/admin/appointments", label: "Rendez-vous",        icon: CalendarCheck, badge: pendingBadge },
    { path: "/admin/content",      label: "Gestion du Contenu", icon: FileText },
    { path: "/admin/gallery",      label: "Galerie",            icon: Images },
    { path: "/admin/patients",     label: "Patients",           icon: Users },
    { path: "/admin/calendar",     label: "Calendrier",         icon: Calendar },
    { path: "/admin/messages",     label: "Messages",           icon: MessageSquare },
    { path: "/admin/reviews",      label: "Avis",               icon: Star },
    { path: "/admin/services",     label: "Prestations",        icon: Stethoscope },
    { path: "/admin/bookings",     label: "Réservations",       icon: ClipboardList, badge: bookingBadge },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-700 text-white flex flex-col">
        <div className="p-4 border-b border-brand-600">
          <h1 className="text-lg font-bold">Admin Panel</h1>
          <p className="text-brand-200 text-xs mt-0.5">Kiné Excellence</p>
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
                    ? "bg-brand-600 text-white"
                    : "text-brand-100 hover:bg-brand-600"
                }`}
              >
                <Icon size={20} />
                <span className="flex-1">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="bg-red-500 text-white text-xs font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full px-1">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-brand-600">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-brand-100 hover:bg-brand-600 transition-all"
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
              <div className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center">
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
