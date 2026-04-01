import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, Loader2, AlertCircle, Upload } from "lucide-react";
import { supabase, type GalleryPhoto } from "../../../lib/supabase";
import { toast } from "sonner";

export function AdminGallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [missingTable, setMissingTable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    image_base64: "",
    isPublished: true,
  });

  const fetchPhotos = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("gallery_photos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setLoading(false);
      setError(error.message);
      setMissingTable(
        error.message.toLowerCase().includes("gallery_photos") &&
          error.message.toLowerCase().includes("does not exist")
      );
      return;
    }

    setMissingTable(false);
    setPhotos((data as GalleryPhoto[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.warning("Image trop lourde (max 2 Mo recommandé). Elle sera tout de même chargée.");
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, image_base64: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.image_base64) return;

    setSubmitting(true);
    setError(null);

    const { error } = await supabase.from("gallery_photos").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      image_base64: form.image_base64,
      is_published: form.isPublished,
    });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    toast.success("Photo ajoutée !");
    setForm({ title: "", description: "", image_base64: "", isPublished: true });
    fetchPhotos();
  };

  const handleDeletePhoto = async (id: string) => {
    if (!confirm("Supprimer cette photo ?")) return;
    const { error } = await supabase.from("gallery_photos").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    toast.success("Photo supprimée.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion de la Galerie</h1>
        <p className="text-gray-600">Ajoutez des photos de réalisations visibles sur l'onglet Galerie du site.</p>
      </div>

      {missingTable && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
          <p className="font-semibold mb-1">Table manquante — exécutez le script <code>schema.sql</code> dans Supabase SQL Editor.</p>
        </div>
      )}

      {error && !missingTable && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ImagePlus size={18} className="text-green-600" /> Ajouter une photo
        </h2>

        <form onSubmit={handleAddPhoto} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
              placeholder="Avant / après lombalgie"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image * (JPG, PNG, WebP)</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-green-400 text-gray-600 hover:text-green-700 px-3 py-2 rounded-lg text-sm transition-colors"
            >
              <Upload size={15} />
              {form.image_base64 ? "Image sélectionnée ✓" : "Choisir un fichier"}
            </button>
          </div>

          {form.image_base64 && (
            <div className="md:col-span-2">
              <img src={form.image_base64} alt="preview" className="h-40 rounded-lg object-cover border border-gray-200" />
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none resize-none"
              placeholder="Description courte de la réalisation"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                className="rounded border-gray-300 accent-green-600"
              />
              Publiée sur le site
            </label>

            <button
              type="submit"
              disabled={submitting || !form.image_base64}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />} Ajouter
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Photos existantes</h2>

        {loading ? (
          <div className="py-16 flex items-center justify-center text-gray-500">Chargement...</div>
        ) : photos.length === 0 ? (
          <p className="text-gray-500">Aucune photo ajoutée.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <article key={photo.id} className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                <img
                  src={photo.image_base64 ?? ""}
                  alt={photo.title}
                  className="w-full h-44 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/400x176?text=Image"; }}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm">{photo.title}</h3>
                    <span className={`text-[10px] px-2 py-1 rounded-full ${photo.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {photo.is_published ? "Publiée" : "Brouillon"}
                    </span>
                  </div>
                  {photo.description && <p className="text-xs text-gray-600 mb-3">{photo.description}</p>}
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 text-xs font-medium"
                  >
                    <Trash2 size={14} /> Supprimer
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
