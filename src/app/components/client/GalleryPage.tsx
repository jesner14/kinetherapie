import { useEffect, useState } from "react";
import { X, Image as ImageIcon, Sparkles } from "lucide-react";
import { supabase, type GalleryPhoto } from "../../../lib/supabase";
import { PageLoader } from "../common/PageLoader";

export function GalleryPage() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const safeData = (data as GalleryPhoto[]) ?? [];
      setPhotos(safeData.filter((p) => p.is_published !== false));
      setLoading(false);
    };

    fetchPhotos();
  }, []);

  if (loading) return <PageLoader text="Chargement de la galerie..." />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <section className="py-20 bg-gradient-to-r from-teal-600 via-teal-500 to-brand-500 text-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-100 bg-white/15 border border-white/25 rounded-full px-3 py-1 mb-4">
            <Sparkles size={14} /> Avant / Apres
          </span>
          <h1 className="text-4xl md:text-6xl font-black mb-5">Galerie</h1>
          <p className="text-slate-100 text-base md:text-xl max-w-3xl mx-auto">
            Decouvrez des realisations, les espaces du cabinet et les progres de nos prises en charge.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
              Impossible de charger la galerie: {error}
            </div>
          ) : photos.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
              <ImageIcon size={32} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">Aucune photo pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setSelected(photo)}
                  className="text-left rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                    <img src={photo.image_base64 ?? ""} alt={photo.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                  </div>
                  <div className="p-2">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{photo.title}</h3>
                    {photo.description && <p className="text-xs text-gray-500 truncate">{photo.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 bg-black/70 z-50 p-4 flex items-center justify-center" onClick={() => setSelected(null)}>
          <div className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900">{selected.title}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <img src={selected.image_base64 ?? ""} alt={selected.title} className="w-full max-h-[75vh] object-contain bg-gray-100" />
            {selected.description && <p className="p-4 text-sm text-gray-600">{selected.description}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
