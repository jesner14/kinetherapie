import { useEffect, useState } from "react";
import { Users, Calendar, MessageSquare, Star, TrendingUp, FileText, Image } from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface PatientRow { id: string; full_name: string; created_at: string; }

export function AdminDashboard() {
  const [patientCount, setPatientCount] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [teamCount, setTeamCount] = useState<number>(0);
  const [galleryCount, setGalleryCount] = useState<number>(0);
  const [recentPatients, setRecentPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [patients, unread, team, gallery, recent] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "patient"),
        supabase.from("messages").select("id", { count: "exact", head: true }).is("read_at", null),
        supabase.from("team_members").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("gallery_photos").select("id", { count: "exact", head: true }).eq("is_published", true),
        supabase.from("profiles").select("id, full_name, created_at").eq("role", "patient").order("created_at", { ascending: false }).limit(3),
      ]);
      setPatientCount(patients.count ?? 0);
      setUnreadCount(unread.count ?? 0);
      setTeamCount(team.count ?? 0);
      setGalleryCount(gallery.count ?? 0);
      setRecentPatients((recent.data ?? []) as PatientRow[]);
      setLoading(false);
    }
    fetchStats();
  }, []);

  const stats = [
    { label: "Total Patients",    value: patientCount, icon: Users,         color: "bg-brand-500",   trend: "inscrits" },
    { label: "Messages Non Lus",  value: unreadCount,  icon: MessageSquare, color: "bg-orange-500", trend: unreadCount > 0 ? "À traiter" : "Tout lu" },
    { label: "Membres Équipe",    value: teamCount,    icon: Star,          color: "bg-yellow-500", trend: "actifs" },
    { label: "Photos Publiées",   value: galleryCount, icon: Image,         color: "bg-purple-500", trend: "galerie" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de Bord</h1>
        <p className="text-gray-600">Vue d'ensemble de votre cabinet de kinésithérapie</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-brand-600">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="text-white" size={24} />
                </div>
                <div className="flex items-center gap-1 text-brand-600">
                  <TrendingUp size={16} />
                  <span className="text-sm font-semibold">{stat.trend}</span>
                </div>
              </div>
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mb-1" />
              ) : (
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
              )}
              <div className="text-gray-600">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Patients */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="text-brand-600" size={24} />
            Patients Récents
          </h3>
          <div className="space-y-4">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />
              ))
            ) : recentPatients.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucun patient inscrit</p>
            ) : (
              recentPatients.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">{p.full_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Inscrit le</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(p.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Actions Rapides</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 border-2 border-brand-600 text-brand-600 rounded-lg hover:bg-brand-50 transition-all">
              <Calendar className="mx-auto mb-2" size={32} />
              <span className="block font-semibold text-sm">Calendrier</span>
            </button>
            <button className="p-4 border-2 border-brand-600 text-brand-600 rounded-lg hover:bg-brand-50 transition-all">
              <Users className="mx-auto mb-2" size={32} />
              <span className="block font-semibold text-sm">Patients</span>
            </button>
            <button className="p-4 border-2 border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50 transition-all">
              <MessageSquare className="mx-auto mb-2" size={32} />
              <span className="block font-semibold text-sm">Messages</span>
            </button>
            <button className="p-4 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-all">
              <FileText className="mx-auto mb-2" size={32} />
              <span className="block font-semibold text-sm">Contenu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
