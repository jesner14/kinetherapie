import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, Loader2, AlertCircle, Upload, Film } from "lucide-react";
import { supabase, type GalleryPhoto } from "../../../lib/supabase";
import { toast } from "sonner";
import { PageLoader } from "../common/PageLoader";

const BUCKET = "gallery1";

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
    isPublished: true,
    file: null as File | null,
    preview: "",
    mediaType: "image" as "image" | "video",
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      toast.error("Format non supporté. Choisissez une image ou une vidéo.");
      return;
    }

    if (isVideo && file.size > 100 * 1024 * 1024) {
      toast.error("Vidéo trop lourde (max 100 Mo).");
      return;
    }
    if (isImage && file.size > 10 * 1024 * 1024) {
      toast.warning("Image lourde (max recommandé : 10 Mo).");
    }

    const preview = isImage ? URL.createObjectURL(file) : "";
    setForm((f) => ({ ...f, file, preview, mediaType: isVideo ? "video" : "image" }));
  };

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.file) return;

    setSubmitting(true);
    setError(null);

    // Upload vers Storage
    const ext = form.file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, form.file, { contentType: form.file.type, upsert: false });

    if (uploadErr) {
      setError(`Erreur upload : ${uploadErr.message}`);
      setSubmitting(false);
      return;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    const { error: dbErr } = await supabase.from("gallery_photos").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      image_url: publicUrl,
      image_base64: null,
      media_type: form.mediaType,
      is_published: form.isPublished,
    });

    setSubmitting(false);

    if (dbErr) {
      // Nettoyage du fichier uploadé si l'insert échoue
      await supabase.storage.from(BUCKET).remove([fileName]);
      setError(dbErr.message);
      return;
    }

    toast.success(form.mediaType === "video" ? "Vidéo ajoutée !" : "Photo ajoutée !");
    setForm({ title: "", description: "", isPublished: true, file: null, preview: "", mediaType: "image" });
    if (fileRef.current) fileRef.current.value = "";
    fetchPhotos();
  };

  const handleDeletePhoto = async (photo: GalleryPhoto) => {
    if (!confirm(`Supprimer "${photo.title}" ?`)) return;

    // Supprimer le fichier du bucket si image_url présente
    if (photo.image_url) {
      const fileName = photo.image_url.split("/").pop();
      if (fileName) await supabase.storage.from(BUCKET).remove([fileName]);
    }

    const { error } = await supabase.from("gallery_photos").delete().eq("id", photo.id);
    if (error) {
      setError(error.message);
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    toast.success("Supprimé.");
  };

  // Résout l'URL à afficher (nouveau Storage ou ancien base64)
  const resolveUrl = (photo: GalleryPhoto) => photo.image_url ?? photo.image_base64 ?? "";

  if (loading) return <PageLoader text="Chargement de la galerie..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion de la Galerie</h1>
        <p className="text-gray-600">Ajoutez des photos et vidéos visibles sur l'onglet Galerie du site.</p>
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

      {/* ── Formulaire ajout ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ImagePlus size={18} className="text-brand-600" /> Ajouter une photo ou vidéo
        </h2>

        <form onSubmit={handleAddPhoto} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
              placeholder="Avant / après lombalgie"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fichier * <span className="text-gray-400 font-normal">(image JPG/PNG/WebP ou vidéo MP4/MOV)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*,.mp4,.webm,.mov,.avi,.mkv,.ogv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-brand-400 text-gray-600 hover:text-brand-700 px-3 py-2 rounded-lg text-sm transition-colors"
            >
              {form.mediaType === "video" ? <Film size={15} /> : <Upload size={15} />}
              {form.file
                ? `${form.mediaType === "video" ? "🎥" : "🖼️"} ${form.file.name}`
                : "Choisir un fichier"}
            </button>
          </div>

          {/* Prévisualisation image */}
          {form.preview && form.mediaType === "image" && (
            <div className="md:col-span-2">
              <img src={form.preview} alt="preview" className="h-40 rounded-lg object-cover border border-gray-200" />
            </div>
          )}

          {/* Prévisualisation vidéo */}
          {form.file && form.mediaType === "video" && (
            <div className="md:col-span-2">
              <video
                src={URL.createObjectURL(form.file)}
                controls
                className="h-40 rounded-lg border border-gray-200 bg-black"
              />
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none resize-none"
              placeholder="Description courte de la réalisation"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                className="rounded border-gray-300 accent-brand-600"
              />
              Publié sur le site
            </label>

            <button
              type="submit"
              disabled={submitting || !form.file}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? "Upload en cours…" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Liste des médias ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Médias existants</h2>

        {photos.length === 0 ? (
          <p className="text-gray-500">Aucun média ajouté.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <article key={photo.id} className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                <div className="w-full h-44 bg-gray-100 relative">
                  {photo.media_type === "video" ? (
                    <video
                      src={resolveUrl(photo)}
                      className="w-full h-full object-cover"
                      muted
                      autoPlay
                      playsInline
                      loop
                      preload="auto"
                    />
                  ) : (
                    <img
                      src={resolveUrl(photo)}
                      alt={photo.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/400x176?text=Image"; }}
                    />
                  )}
                  {photo.media_type === "video" && (
                    <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Film size={11} /> Vidéo
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm">{photo.title}</h3>
                    <span className={`text-[10px] px-2 py-1 rounded-full ${photo.is_published ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-600"}`}>
                      {photo.is_published ? "Publié" : "Brouillon"}
                    </span>
                  </div>
                  {photo.description && <p className="text-xs text-gray-600 mb-3">{photo.description}</p>}
                  <button
                    onClick={() => handleDeletePhoto(photo)}
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

