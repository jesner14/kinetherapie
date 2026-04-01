import { Users, Calendar, MessageSquare, Star, TrendingUp, FileText } from "lucide-react";
import { mockPatients, mockReviews, mockTimeSlots, mockMessages } from "../../data/mockData";

export function AdminDashboard() {
  const availableSlots = mockTimeSlots.filter((slot) => slot.available).length;
  const unreadMessages = mockMessages.filter((msg) => !msg.read).length;
  const averageRating =
    mockReviews.reduce((acc, review) => acc + review.rating, 0) /
    mockReviews.length;

  const stats = [
    {
      label: "Total Patients",
      value: mockPatients.length,
      icon: Users,
      color: "bg-blue-500",
      trend: "+12%",
    },
    {
      label: "Créneaux Disponibles",
      value: availableSlots,
      icon: Calendar,
      color: "bg-green-500",
      trend: `${availableSlots}/${mockTimeSlots.length}`,
    },
    {
      label: "Messages Non Lus",
      value: unreadMessages,
      icon: MessageSquare,
      color: "bg-orange-500",
      trend: "Urgent",
    },
    {
      label: "Note Moyenne",
      value: averageRating.toFixed(1),
      icon: Star,
      color: "bg-yellow-500",
      trend: `${mockReviews.length} avis`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Tableau de Bord
        </h1>
        <p className="text-gray-600">
          Vue d'ensemble de votre cabinet de kinésithérapie
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-600"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="text-white" size={24} />
                </div>
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp size={16} />
                  <span className="text-sm font-semibold">{stat.trend}</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
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
            <Users className="text-green-600" size={24} />
            Patients Récents
          </h3>
          <div className="space-y-4">
            {mockPatients.slice(0, 3).map((patient) => (
              <div
                key={patient.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-semibold text-gray-900">{patient.name}</p>
                  <p className="text-sm text-gray-600">{patient.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Dernière visite</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(patient.lastVisit).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="text-yellow-500" size={24} />
            Derniers Avis
          </h3>
          <div className="space-y-4">
            {mockReviews.slice(0, 3).map((review) => (
              <div key={review.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">
                    {review.patientName}
                  </p>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={
                          i < review.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {review.comment}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Actions Rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="p-4 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-all">
            <Calendar className="mx-auto mb-2" size={32} />
            <span className="block font-semibold">Gérer le Calendrier</span>
          </button>
          <button className="p-4 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-all">
            <Users className="mx-auto mb-2" size={32} />
            <span className="block font-semibold">Ajouter un Patient</span>
          </button>
          <button className="p-4 border-2 border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50 transition-all">
            <MessageSquare className="mx-auto mb-2" size={32} />
            <span className="block font-semibold">Voir les Messages</span>
          </button>
          <button className="p-4 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-all">
            <FileText className="mx-auto mb-2" size={32} />
            <span className="block font-semibold">Modifier le Contenu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
