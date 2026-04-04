import { Calendar, MessageSquare, Star, Clock } from "lucide-react";
import { Link } from "react-router";
import { mockTimeSlots, mockMessages } from "../../data/mockData";

export function PatientDashboard() {
  const upcomingAppointments = mockTimeSlots
    .filter((slot) => !slot.available && new Date(slot.date) >= new Date())
    .slice(0, 3);

  const unreadMessages = mockMessages.filter(
    (msg) => msg.from === "Dr. Laurent" && !msg.read
  ).length;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bienvenue, Marie !
        </h1>
        <p className="text-gray-600 text-lg">
          Gérez vos rendez-vous et communiquez avec votre kinésithérapeute
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-brand-600">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="text-brand-600" size={32} />
            <span className="text-3xl font-bold text-gray-900">
              {upcomingAppointments.length}
            </span>
          </div>
          <p className="text-gray-600">Rendez-vous à venir</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-600">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare className="text-orange-600" size={32} />
            <span className="text-3xl font-bold text-gray-900">
              {unreadMessages}
            </span>
          </div>
          <p className="text-gray-600">Messages non lus</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-600">
          <div className="flex items-center justify-between mb-2">
            <Star className="text-yellow-600" size={32} />
            <span className="text-3xl font-bold text-gray-900">5.0</span>
          </div>
          <p className="text-gray-600">Votre satisfaction</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/patient/booking">
          <div className="bg-gradient-to-r from-teal-500 to-brand-600 text-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all cursor-pointer">
            <Calendar size={48} className="mb-4" />
            <h3 className="text-2xl font-bold mb-2">Réserver un Rendez-vous</h3>
            <p className="text-brand-100">
              Consultez les disponibilités et prenez rendez-vous en ligne
            </p>
          </div>
        </Link>

        <Link to="/patient/messages">
          <div className="bg-gradient-to-r from-teal-500 to-brand-600 text-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all cursor-pointer">
            <MessageSquare size={48} className="mb-4" />
            <h3 className="text-2xl font-bold mb-2">Messagerie</h3>
            <p className="text-brand-100">
              Communiquez directement avec votre kinésithérapeute
            </p>
          </div>
        </Link>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="text-brand-600" size={28} />
            Vos Prochains Rendez-vous
          </h3>
          <Link
            to="/patient/booking"
            className="text-brand-600 hover:text-brand-700 font-semibold"
          >
            Voir tout
          </Link>
        </div>

        {upcomingAppointments.length > 0 ? (
          <div className="space-y-4">
            {upcomingAppointments.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between p-4 bg-brand-50 border-l-4 border-brand-600 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-brand-600 rounded-lg flex flex-col items-center justify-center text-white">
                    <span className="text-2xl font-bold">
                      {new Date(slot.date).getDate()}
                    </span>
                    <span className="text-xs">
                      {new Date(slot.date).toLocaleDateString("fr-FR", {
                        month: "short",
                      })}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">
                      {new Date(slot.date).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-gray-600 flex items-center gap-2">
                      <Clock size={16} />
                      {slot.time}
                    </p>
                  </div>
                </div>
                <button className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-all">
                  Détails
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="mx-auto text-gray-300 mb-4" size={64} />
            <p className="text-gray-500 text-lg mb-4">
              Aucun rendez-vous à venir
            </p>
            <Link
              to="/patient/booking"
              className="inline-block bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 transition-all"
            >
              Prendre Rendez-vous
            </Link>
          </div>
        )}
      </div>

      {/* Leave a Review */}
      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-4 mb-4">
          <Star className="text-yellow-500" size={48} />
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Partagez Votre Expérience
            </h3>
            <p className="text-gray-600">
              Votre avis nous aide à améliorer nos services
            </p>
          </div>
        </div>
        <button className="bg-yellow-500 text-white px-8 py-3 rounded-lg hover:bg-yellow-600 transition-all font-semibold">
          Laisser un Avis
        </button>
      </div>
    </div>
  );
}
