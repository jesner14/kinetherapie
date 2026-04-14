import { useEffect, useState } from "react";
import { Star, Plus, Pencil, Trash2, Eye, EyeOff, X, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase, type Review } from "../../../lib/supabase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

// ─── Modal Ajout / Édition ──────────────────────────────────────────────────

interface ReviewModalProps {
  open: boolean;
  review: Review | null;
  onClose: () => void;
  onSaved: () => void;
}

function ReviewModal({ open, review, onClose, onSaved }: ReviewModalProps) {
  const [patientName, setPatientName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewDate, setReviewDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isVisible, setIsVisible] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (review) {
      setPatientName(review.patient_name);
      setRating(review.rating);
      setComment(review.comment);
      setReviewDate(review.review_date);
      setIsVisible(review.is_visible);
    } else {
      setPatientName("");
      setRating(5);
      setComment("");
      setReviewDate(new Date().toISOString().split("T")[0]);
      setIsVisible(true);
    }
  }, [review, open]);

  if (!open) return null;

  const handleSave = async () => {
    if (!patientName.trim()) {
      toast.error("Le nom du patient est obligatoire.");
      return;
    }
    setSaving(true);
    const payload = {
      patient_name: patientName.trim(),
      rating,
      comment: comment.trim(),
      review_date: reviewDate,
      is_visible: isVisible,
    };

    let error;
    if (review) {
      ({ error } = await supabase
        .from("reviews")
        .update(payload)
        .eq("id", review.id));
    } else {
      ({ error } = await supabase.from("reviews").insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error("Erreur lors de l'enregistrement.");
      return;
    }
    toast.success(review ? "Avis modifié." : "Avis ajouté.");
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {review ? "Modifier l'avis" : "Ajouter un avis"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du patient <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Ex : Marie Dupont"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className="focus:outline-none"
                >
                  <Star
                    size={28}
                    className={
                      s <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Commentaire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Commentaire
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Commentaire du patient..."
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de l'avis
            </label>
            <input
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Visibilité */}
          <div className="flex items-center gap-3">
            <input
              id="modal-visible"
              type="checkbox"
              checked={isVisible}
              onChange={(e) => setIsVisible(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="modal-visible" className="text-sm text-gray-700">
              Afficher cet avis sur le site
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-all disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ────────────────────────────────────────────────────

export function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("review_date", { ascending: false });
    if (error) {
      toast.error("Impossible de charger les avis.");
    } else {
      setReviews(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleToggleVisibility = async (review: Review) => {
    const { error } = await supabase
      .from("reviews")
      .update({ is_visible: !review.is_visible })
      .eq("id", review.id);
    if (error) {
      toast.error("Erreur lors de la mise à jour.");
    } else {
      toast.success(
        !review.is_visible ? "Avis affiché." : "Avis masqué."
      );
      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id ? { ...r, is_visible: !r.is_visible } : r
        )
      );
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", deletingId);
    if (error) {
      toast.error("Erreur lors de la suppression.");
    } else {
      toast.success("Avis supprimé.");
      setReviews((prev) => prev.filter((r) => r.id !== deletingId));
    }
    setDeletingId(null);
  };

  const visibleCount = reviews.filter((r) => r.is_visible).length;
  const hiddenCount = reviews.filter((r) => !r.is_visible).length;
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestion des Avis
          </h1>
          <p className="text-gray-600">
            Consultez, modifiez et modérez les avis laissés par vos patients
          </p>
        </div>
        <button
          onClick={() => {
            setEditingReview(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-all"
        >
          <Plus size={18} />
          Ajouter un avis
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {avgRating.toFixed(1)}
          </div>
          <div className="text-gray-600">Note Moyenne</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-brand-600">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {reviews.length}
          </div>
          <div className="text-gray-600">Total Avis</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {visibleCount}
          </div>
          <div className="text-gray-600">Avis affichés</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-gray-400">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {hiddenCount}
          </div>
          <div className="text-gray-600">Avis masqués</div>
        </div>
      </div>

      {/* Liste des avis */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Tous les Avis</h3>

        {loading ? (
          <p className="text-gray-500 text-center py-8">Chargement…</p>
        ) : reviews.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucun avis pour l'instant.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className={`border-2 rounded-lg p-6 transition-all ${
                  review.is_visible
                    ? "border-gray-200 hover:border-brand-300"
                    : "border-gray-100 bg-gray-50 opacity-60"
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-gray-900 text-lg">
                        {review.patient_name}
                      </h4>
                      {!review.is_visible && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          Masqué
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={18}
                          className={
                            i < review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                      {new Date(review.review_date).toLocaleDateString(
                        "fr-FR",
                        { year: "numeric", month: "long", day: "numeric" }
                      )}
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      {review.comment}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleVisibility(review)}
                      title={review.is_visible ? "Masquer" : "Afficher"}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                        review.is_visible
                          ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {review.is_visible ? (
                        <>
                          <EyeOff size={16} />
                          Masquer
                        </>
                      ) : (
                        <>
                          <Eye size={16} />
                          Afficher
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingReview(review);
                        setModalOpen(true);
                      }}
                      className="flex items-center gap-2 bg-brand-100 text-brand-700 px-3 py-2 rounded-lg text-sm hover:bg-brand-200 transition-all"
                    >
                      <Pencil size={16} />
                      Modifier
                    </button>
                    <button
                      onClick={() => setDeletingId(review.id)}
                      className="flex items-center gap-2 bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm hover:bg-red-200 transition-all"
                    >
                      <Trash2 size={16} />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Distribution des notes */}
      {reviews.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Distribution des Notes
          </h3>
          <div className="space-y-4">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = reviews.filter((r) => r.rating === rating).length;
              const percentage =
                reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-4">
                  <div className="flex items-center gap-1 w-24">
                    <span className="font-semibold text-gray-900">{rating}</span>
                    <Star
                      size={16}
                      className="fill-yellow-400 text-yellow-400"
                    />
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-brand-600 h-full rounded-full transition-all"
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
      )}

      {/* Modal Ajout / Édition */}
      <ReviewModal
        open={modalOpen}
        review={editingReview}
        onClose={() => setModalOpen(false)}
        onSaved={fetchReviews}
      />

      {/* Dialog Suppression */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet avis ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'avis sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
