import { useState } from "react";
import { Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react";
import { mockTimeSlots, TimeSlot } from "../../data/mockData";

export function AdminCalendar() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(mockTimeSlots);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [newSlotTime, setNewSlotTime] = useState("");

  const slotsByDate = timeSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  const uniqueDates = Object.keys(slotsByDate).sort();

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotTime) return;

    const newSlot: TimeSlot = {
      id: (timeSlots.length + 1).toString(),
      date: selectedDate,
      time: newSlotTime,
      available: true,
    };

    setTimeSlots([...timeSlots, newSlot]);
    setNewSlotTime("");
  };

  const handleToggleAvailability = (id: string) => {
    setTimeSlots(
      timeSlots.map((slot) =>
        slot.id === id ? { ...slot, available: !slot.available } : slot
      )
    );
  };

  const handleDeleteSlot = (id: string) => {
    setTimeSlots(timeSlots.filter((slot) => slot.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestion du Calendrier
        </h1>
        <p className="text-gray-600">
          Définissez vos disponibilités pour les réservations en ligne
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Date Selector */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarIcon className="text-green-600" size={24} />
            Sélectionner une Date
          </h3>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none mb-6"
          />

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-700 mb-2">Dates avec créneaux</h4>
            {uniqueDates.map((date) => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-all ${
                  selectedDate === date
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                {new Date(date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                <span className="block text-sm opacity-80">
                  {slotsByDate[date].length} créneaux
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Time Slots for Selected Date */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Créneaux pour le{" "}
            {new Date(selectedDate).toLocaleDateString("fr-FR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h3>

          {/* Add New Slot Form */}
          <form onSubmit={handleAddSlot} className="mb-6">
            <div className="flex gap-2">
              <input
                type="time"
                value={newSlotTime}
                onChange={(e) => setNewSlotTime(e.target.value)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none"
                placeholder="09:00"
              />
              <button
                type="submit"
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-all"
              >
                <Plus size={20} />
                Ajouter
              </button>
            </div>
          </form>

          {/* Time Slots List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {slotsByDate[selectedDate]?.sort((a, b) => a.time.localeCompare(b.time)).map((slot) => (
              <div
                key={slot.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  slot.available
                    ? "border-green-300 bg-green-50"
                    : "border-red-300 bg-red-50"
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-2xl font-bold text-gray-900">
                    {slot.time}
                  </span>
                  <button
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                <button
                  onClick={() => handleToggleAvailability(slot.id)}
                  className={`w-full px-4 py-2 rounded-lg font-semibold transition-all ${
                    slot.available
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {slot.available ? "Disponible" : "Non Disponible"}
                </button>
              </div>
            )) || (
              <div className="col-span-2 text-center py-12 text-gray-500">
                Aucun créneau pour cette date. Ajoutez-en un ci-dessus.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-600">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {timeSlots.filter((s) => s.available).length}
          </div>
          <div className="text-gray-600">Créneaux Disponibles</div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-600">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {timeSlots.filter((s) => !s.available).length}
          </div>
          <div className="text-gray-600">Créneaux Réservés</div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-600">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {timeSlots.length}
          </div>
          <div className="text-gray-600">Total Créneaux</div>
        </div>
      </div>
    </div>
  );
}
