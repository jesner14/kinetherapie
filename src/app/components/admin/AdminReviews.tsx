import { Star, CheckCircle, XCircle } from "lucide-react";
import { mockReviews } from "../../data/mockData";

export function AdminReviews() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestion des Avis
        </h1>
        <p className="text-gray-600">
          Consultez et modérez les avis laissés par vos patients
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {(
              mockReviews.reduce((acc, r) => acc + r.rating, 0) /
              mockReviews.length
            ).toFixed(1)}
          </div>
          <div className="text-gray-600">Note Moyenne</div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-600">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {mockReviews.length}
          </div>
          <div className="text-gray-600">Total Avis</div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-600">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {mockReviews.filter((r) => r.rating === 5).length}
          </div>
          <div className="text-gray-600">5 Étoiles</div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-600">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {mockReviews.filter((r) => r.rating >= 4).length}
          </div>
          <div className="text-gray-600">4+ Étoiles</div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Tous les Avis
        </h3>

        <div className="space-y-4">
          {mockReviews.map((review) => (
            <div
              key={review.id}
              className="border-2 border-gray-200 rounded-lg p-6 hover:border-green-300 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-gray-900 text-lg mb-2">
                    {review.patientName}
                  </h4>
                  <div className="flex gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={20}
                        className={
                          i < review.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(review.date).toLocaleDateString("fr-FR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-all">
                    <CheckCircle size={18} />
                    Approuver
                  </button>
                  <button className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-all">
                    <XCircle size={18} />
                    Masquer
                  </button>
                </div>
              </div>

              <p className="text-gray-700 leading-relaxed">
                {review.comment}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Distribution des Notes
        </h3>

        <div className="space-y-4">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = mockReviews.filter((r) => r.rating === rating).length;
            const percentage = (count / mockReviews.length) * 100;

            return (
              <div key={rating} className="flex items-center gap-4">
                <div className="flex items-center gap-1 w-24">
                  <span className="font-semibold text-gray-900">{rating}</span>
                  <Star size={16} className="fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-green-600 h-full rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-gray-600 w-16 text-right">
                  {count} avis
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
