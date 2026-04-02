import { useState } from "react";
import { Calendar as CalendarIcon, Clock, CheckCircle } from "lucide-react";
import { mockTimeSlots, TimeSlot } from "../../data/mockData";

export function PatientBooking() {
  const [timeSlots] = useState<TimeSlot[]>(mockTimeSlots);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const availableSlots = timeSlots.filter((slot) => slot.available);

  const slotsByDate = availableSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  const uniqueDates = Object.keys(slotsByDate).sort();

  const handleBooking = () => {
    setShowConfirmation(true);
    setTimeout(() => {
      setShowConfirmation(false);
      setSelectedSlot(null);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <CalendarIcon className="text-brand-600" size={36} />
          Réserver un Rendez-vous
        </h1>
        <p className="text-gray-600 text-lg">
          Choisissez une date et un créneau horaire disponible
        </p>
      </div>

      {showConfirmation && (
        <div className="bg-brand-100 border-l-4 border-brand-600 p-6 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-brand-600" size={32} />
            <div>
              <p className="text-brand-700 font-bold text-lg">
                Réservation Confirmée !
              </p>
              <p className="text-brand-600">
                Vous recevrez une confirmation par email.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar - Date Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarIcon className="text-brand-600" size={24} />
            Sélectionner une Date
          </h3>

          <div className="space-y-2">
            {uniqueDates.map((date) => {
              const slotsCount = slotsByDate[date].length;
              return (
                <button
                  key={date}
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                  className={`w-full text-left p-4 rounded-lg transition-all border-2 ${
                    selectedDate === date
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white border-gray-200 hover:border-brand-300 text-gray-700"
                  }`}
                >
                  <p className="font-bold">
                    {new Date(date).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                  <p
                    className={`text-sm ${
                      selectedDate === date ? "text-brand-100" : "text-gray-500"
                    }`}
                  >
                    {slotsCount} créneau{slotsCount > 1 ? "x" : ""} disponible
                    {slotsCount > 1 ? "s" : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slots */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
          {selectedDate ? (
            <>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="text-brand-600" size={24} />
                Créneaux Disponibles pour le{" "}
                {new Date(selectedDate).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {slotsByDate[selectedDate]
                  ?.sort((a, b) => a.time.localeCompare(b.time))
                  .map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot.id)}
                      className={`p-6 rounded-lg border-2 transition-all ${
                        selectedSlot === slot.id
                          ? "bg-brand-600 text-white border-brand-600 scale-105"
                          : "bg-white border-gray-200 hover:border-brand-300 text-gray-700"
                      }`}
                    >
                      <Clock
                        size={24}
                        className={`mx-auto mb-2 ${
                          selectedSlot === slot.id
                            ? "text-white"
                            : "text-brand-600"
                        }`}
                      />
                      <p className="text-2xl font-bold">{slot.time}</p>
                    </button>
                  ))}
              </div>

              {selectedSlot && (
                <div className="bg-brand-50 border-2 border-brand-300 rounded-lg p-6">
                  <h4 className="font-bold text-gray-900 text-lg mb-4">
                    Récapitulatif de votre réservation
                  </h4>
                  <div className="space-y-2 mb-6">
                    <p className="text-gray-700">
                      <span className="font-semibold">Date :</span>{" "}
                      {new Date(selectedDate).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Heure :</span>{" "}
                      {timeSlots.find((s) => s.id === selectedSlot)?.time}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Praticien :</span> Dr.
                      Pierre Laurent
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Durée :</span> 45 minutes
                    </p>
                  </div>
                  <button
                    onClick={handleBooking}
                    className="w-full bg-brand-600 text-white px-6 py-4 rounded-lg hover:bg-brand-700 transition-all text-lg font-bold"
                  >
                    Confirmer la Réservation
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <CalendarIcon className="text-gray-300 mb-4" size={80} />
              <p className="text-gray-500 text-xl text-center">
                Sélectionnez une date pour voir les créneaux disponibles
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Information Section */}
      <div className="bg-brand-50 border-2 border-brand-300 rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Informations Importantes
        </h3>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2">
            <CheckCircle className="text-brand-600 flex-shrink-0 mt-1" size={20} />
            <span>
              Vous recevrez une confirmation par email et SMS
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-brand-600 flex-shrink-0 mt-1" size={20} />
            <span>
              Veuillez arriver 5 minutes avant l'heure de votre rendez-vous
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-brand-600 flex-shrink-0 mt-1" size={20} />
            <span>
              Pour annuler ou modifier, contactez-nous au moins 24h à l'avance
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-brand-600 flex-shrink-0 mt-1" size={20} />
            <span>
              N'oubliez pas d'apporter votre carte vitale et votre ordonnance
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
