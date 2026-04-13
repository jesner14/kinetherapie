import { useState, useRef } from "react";
import {
  Pencil, X, Check, Loader2, Plus, Trash2, Image as ImageIcon,
  Home, Info, Phone, Users, ChevronDown, ChevronUp, Upload, PanelBottom, Eye, EyeOff,
} from "lucide-react";
import { useAllSiteContent } from "../../../lib/hooks/useSiteContent";
import { useTeamMembers } from "../../../lib/hooks/useTeamMembers";
import { uploadLogo, useLogo } from "../../../lib/hooks/useLogo";
import { TeamMemberDB } from "../../../lib/supabase";
import { toast } from "sonner";
import { PageLoader } from "../common/PageLoader";

// ─── Inline editable field ─────────────────────────────────────────────────

interface EditFieldProps {
  id: string;
  value: string;
  type: "text" | "textarea" | "image";
  label: string;
  onSave: (id: string, value: string) => Promise<{ error: string | null }>;
}

function EditField({ id, value, type, label, onSave }: EditFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await onSave(id, draft);
    setSaving(false);
    if (error) {
      toast.error(`Erreur: ${error}`);
    } else {
      toast.success("Sauvegardé !");
      setEditing(false);
    }
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.warning("Image trop lourde (max 2 Mo). Utilisez une image plus petite.");
    }
    const reader = new FileReader();
    reader.onload = () => setDraft(reader.result as string);
    reader.readAsDataURL(file);
  };

  if (type === "image") {
    return (
      <div className="group relative">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <div className="relative rounded-xl overflow-hidden border border-gray-200">
          <img
            src={draft || value}
            alt={label}
            className="w-full h-40 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/600x200?text=Image"; }}
          />
          {editing ? (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 p-4">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100"
              >
                <Upload size={15} /> Choisir un fichier
              </button>
              {draft !== value && (
                <p className="text-white text-xs text-center truncate max-w-full">Image sélectionnée</p>
              )}
              <div className="flex gap-2 mt-1">
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 bg-brand-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-brand-600 disabled:opacity-60">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Sauvegarder
                </button>
                <button onClick={() => { setDraft(value); setEditing(false); }} className="flex items-center gap-1 bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-white/30">
                  <X size={13} /> Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="absolute top-2 right-2 p-1.5 bg-white rounded-lg shadow text-gray-700 hover:text-brand-700 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        {editing ? (
          <div className="space-y-2">
            {type === "textarea" ? (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                autoFocus
                className="w-full px-3 py-2 border border-brand-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 resize-none"
              />
            ) : (
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 border border-brand-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            )}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 bg-brand-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-brand-700 disabled:opacity-60">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Sauvegarder
              </button>
              <button onClick={() => { setDraft(value); setEditing(false); }} className="flex items-center gap-1 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50">
                <X size={12} /> Annuler
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-800 leading-relaxed">{value || <span className="italic text-gray-400">Vide</span>}</p>
        )}
      </div>
      {!editing && (
        <button
          onClick={() => { setDraft(value); setEditing(true); }}
          className="mt-5 p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
          title="Modifier"
        >
          <Pencil size={15} />
        </button>
      )}
    </div>
  );
}

// ─── Logo upload card ──────────────────────────────────────────────────────

function LogoUploadCard() {
  const logoUrl = useLogo();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées.");
      return;
    }
    setUploading(true);
    const { error } = await uploadLogo(file);
    setUploading(false);
    if (error) toast.error(`Erreur upload logo : ${error}`);
    else toast.success("Logo mis à jour sur tout le site !");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-6">
      <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
        {logoUrl && logoUrl !== "/logo.png" ? (
          <img src={logoUrl} alt="Logo actuel" className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ImageIcon size={32} />
          </div>
        )}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-900 mb-0.5">Logo du cabinet</p>
        <p className="text-xs text-gray-500 mb-3">Affiché dans la navbar, le footer, les pages de connexion et l'espace patient. Format recommandé : carré PNG/WebP fond transparent.</p>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Upload en cours…" : "Changer le logo"}
        </button>
      </div>
    </div>
  );
}

// ─── Section collapsible ───────────────────────────────────────────────────

function ContentSection({
  title,
  items,
  onSave,
}: {
  title: string;
  items: { id: string; value: string; type: "text" | "textarea" | "image"; label: string }[];
  onSave: (id: string, value: string) => Promise<{ error: string | null }>;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="font-semibold text-gray-800">{title}</span>
        {open ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
      </button>
      {open && (
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 bg-white">
          {items.map((item) => (
            <div key={item.id} className={item.type === "image" || item.type === "textarea" ? "md:col-span-2" : ""}>
              <EditField {...item} onSave={onSave} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Team member modal ─────────────────────────────────────────────────────

interface MemberFormData {
  name: string;
  title: string;
  specialty: string;
  bio: string;
  photo_base64: string;
  order_index: number;
  is_active: boolean;
}

const EMPTY_MEMBER: MemberFormData = {
  name: "", title: "", specialty: "", bio: "", photo_base64: "", order_index: 0, is_active: true,
};

function TeamMemberModal({
  member,
  onClose,
  onSave,
}: {
  member: TeamMemberDB | null;
  onClose: () => void;
  onSave: (data: MemberFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<MemberFormData>(
    member ? {
      name: member.name, title: member.title, specialty: member.specialty,
      bio: member.bio, photo_base64: member.photo_base64 ?? "", order_index: member.order_index, is_active: member.is_active,
    } : EMPTY_MEMBER
  );
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) toast.warning("Image trop lourde (max 2 Mo).");
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, photo_base64: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{member ? "Modifier le membre" : "Ajouter un membre"}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nom complet *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Titre *</label>
              <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Kinésithérapeute D.E." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Spécialité *</label>
            <input required value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Biographie</label>
            <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Photo</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
            <div className="flex gap-3 items-center">
              {form.photo_base64 && (
                <img src={form.photo_base64} alt="preview" className="w-16 h-16 rounded-xl object-cover border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
                <Upload size={14} /> Uploader une photo
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Ordre d'affichage</label>
              <input type="number" min={0} value={form.order_index} onChange={(e) => setForm((f) => ({ ...f, order_index: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-brand-600" />
                <span className="text-sm text-gray-700">Profil actif</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-brand-600 text-white py-2.5 rounded-xl font-semibold hover:bg-brand-700 disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {member ? "Mettre à jour" : "Ajouter"}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Social media ────────────────────────────────────────────────────────────

const SOCIAL_PLATFORMS = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    color: "#25D366",
    placeholder: "https://wa.me/33612345678",
    svgPath:
      "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z",
  },
  {
    key: "facebook",
    label: "Facebook",
    color: "#1877F2",
    placeholder: "https://facebook.com/votrepage",
    svgPath:
      "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  {
    key: "instagram",
    label: "Instagram",
    color: "#E4405F",
    placeholder: "https://instagram.com/votrecompte",
    svgPath:
      "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  },
  {
    key: "tiktok",
    label: "TikTok",
    color: "#010101",
    placeholder: "https://tiktok.com/@votrecompte",
    svgPath:
      "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.68a4.85 4.85 0 01-1.01.01z",
  },
  {
    key: "twitter",
    label: "Twitter / X",
    color: "#000000",
    placeholder: "https://x.com/votrecompte",
    svgPath:
      "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
] as const;

function SocialPlatformRow({
  platform,
  urlValue,
  visibleValue,
  onSave,
}: {
  platform: { key: string; label: string; color: string; placeholder: string; svgPath: string };
  urlValue: string;
  visibleValue: string;
  onSave: (id: string, value: string) => Promise<{ error: string | null }>;
}) {
  const [editingUrl, setEditingUrl] = useState(false);
  const [draftUrl, setDraftUrl] = useState(urlValue);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const isVisible = visibleValue === "true";

  const handleToggle = async () => {
    setToggling(true);
    const { error } = await onSave(`footer.social.${platform.key}.visible`, isVisible ? "false" : "true");
    setToggling(false);
    if (error) toast.error(`Erreur: ${error}`);
  };

  const handleSaveUrl = async () => {
    setSaving(true);
    const { error } = await onSave(`footer.social.${platform.key}.url`, draftUrl);
    setSaving(false);
    if (error) {
      toast.error(`Erreur: ${error}`);
    } else {
      toast.success("Sauvegardé !");
      setEditingUrl(false);
    }
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
        isVisible ? "border-brand-200 bg-brand-50/30" : "border-gray-100 bg-gray-50/50"
      }`}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: platform.color }}
      >
        <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
          <path d={platform.svgPath} />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-800 text-sm">{platform.label}</span>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-60 ${
              isVisible
                ? "bg-brand-100 text-brand-700 hover:bg-brand-200"
                : "bg-gray-200 text-gray-500 hover:bg-gray-300"
            }`}
          >
            {toggling ? (
              <Loader2 size={12} className="animate-spin" />
            ) : isVisible ? (
              <Eye size={12} />
            ) : (
              <EyeOff size={12} />
            )}
            {isVisible ? "Visible" : "Masqué"}
          </button>
        </div>
        {editingUrl ? (
          <div className="space-y-1.5">
            <input
              type="text"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder={platform.placeholder}
              autoFocus
              className="w-full px-3 py-1.5 border border-brand-400 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveUrl}
                disabled={saving}
                className="flex items-center gap-1 bg-brand-600 text-white px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Sauvegarder
              </button>
              <button
                onClick={() => { setDraftUrl(urlValue); setEditingUrl(false); }}
                className="flex items-center gap-1 border border-gray-300 text-gray-600 px-2.5 py-1 rounded-lg text-xs hover:bg-gray-50"
              >
                <X size={11} /> Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="group flex items-center gap-2">
            {urlValue ? (
              <p className="text-xs text-gray-500 truncate flex-1">{urlValue}</p>
            ) : (
              <p className="text-xs text-gray-400 italic flex-1">Aucun lien configuré</p>
            )}
            <button
              onClick={() => { setDraftUrl(urlValue); setEditingUrl(true); }}
              className="p-1 rounded text-gray-400 hover:text-brand-600 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
              title="Modifier le lien"
            >
              <Pencil size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SocialMediaSection({
  items,
  onSave,
}: {
  items: ReturnType<typeof useAllSiteContent>["items"];
  onSave: (id: string, value: string) => Promise<{ error: string | null }>;
}) {
  const [open, setOpen] = useState(true);
  const getValue = (id: string) => items.find((i) => i.id === id)?.value ?? "";

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="font-semibold text-gray-800">🌐 Réseaux Sociaux</span>
        {open ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
      </button>
      {open && (
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3 bg-white">
          {SOCIAL_PLATFORMS.map((platform) => (
            <SocialPlatformRow
              key={platform.key}
              platform={platform}
              urlValue={getValue(`footer.social.${platform.key}.url`)}
              visibleValue={getValue(`footer.social.${platform.key}.visible`)}
              onSave={onSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab content renderers ─────────────────────────────────────────────────

function by(
  items: ReturnType<typeof useAllSiteContent>["items"],
  page: string,
  section: string
) {
  return items
    .filter((i) => i.page === page && i.section === section)
    .map((i) => ({ id: i.id, value: i.value, type: i.type as "text" | "textarea" | "image", label: i.label }));
}

// ─── Main component ────────────────────────────────────────────────────────

const TABS = [
  { id: "home",    label: "Accueil",    icon: Home },
  { id: "about",   label: "À Propos",   icon: Info },
  { id: "contact", label: "Contact",    icon: Phone },
  { id: "team",    label: "Équipe",     icon: Users },
  { id: "footer",  label: "Footer",     icon: PanelBottom },
] as const;

type TabId = typeof TABS[number]["id"];

export function AdminContent() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const { items, loading, updateContent } = useAllSiteContent();
  const { members, addMember, updateMember, deleteMember } = useTeamMembers();
  const [memberModal, setMemberModal] = useState<{ open: boolean; member: TeamMemberDB | null }>({
    open: false, member: null,
  });

  const handleSaveMember = async (data: MemberFormData) => {
    if (memberModal.member) {
      const { error } = await updateMember(memberModal.member.id, data);
      if (error) toast.error(`Erreur: ${error}`);
      else toast.success("Membre mis à jour !");
    } else {
      const { error } = await addMember(data);
      if (error) toast.error(`Erreur: ${error}`);
      else toast.success("Membre ajouté !");
    }
    setMemberModal({ open: false, member: null });
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Supprimer ${name} de l'équipe ?`)) return;
    const { error } = await deleteMember(id);
    if (error) toast.error(`Erreur: ${error}`);
    else toast.success("Membre supprimé.");
  };

  if (loading) {
    return <PageLoader text="Chargement du contenu..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Contenu du Site</h1>
        <p className="text-gray-500 text-sm">Cliquez sur le crayon ✏️ à côté de n'importe quel élément pour le modifier. Les changements sont sauvegardés en temps réel.</p>
      </div>

      {/* ── Logo ── */}
      <LogoUploadCard />
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── HOME ── */}
      {activeTab === "home" && (
        <div className="space-y-4">
          <ContentSection title="🎠 Hero — Slide 1" items={by(items, "home", "hero").filter(i => i.id.includes("slide1"))} onSave={updateContent} />
          <ContentSection title="🎠 Hero — Slide 2" items={by(items, "home", "hero").filter(i => i.id.includes("slide2"))} onSave={updateContent} />
          <ContentSection title="🎠 Hero — Slide 3" items={by(items, "home", "hero").filter(i => i.id.includes("slide3"))} onSave={updateContent} />
          <ContentSection title="📊 Statistiques" items={by(items, "home", "stats")} onSave={updateContent} />
          <ContentSection title="🏥 Services" items={by(items, "home", "services")} onSave={updateContent} />
          <ContentSection title="📣 Section CTA" items={by(items, "home", "cta")} onSave={updateContent} />
        </div>
      )}

      {/* ── ABOUT ── */}
      {activeTab === "about" && (
        <div className="space-y-4">
          <ContentSection title="🖼️ Hero" items={by(items, "about", "hero")} onSave={updateContent} />
          <ContentSection title="📖 Notre Histoire" items={by(items, "about", "history")} onSave={updateContent} />
          <ContentSection title="📊 Statistiques" items={by(items, "about", "stats")} onSave={updateContent} />
          <ContentSection title="💎 Nos Valeurs" items={by(items, "about", "values")} onSave={updateContent} />
          <ContentSection title="🎯 Notre Mission" items={by(items, "about", "mission")} onSave={updateContent} />
        </div>
      )}

      {/* ── CONTACT ── */}
      {activeTab === "contact" && (
        <div className="space-y-4">
          <ContentSection title="🖼️ Hero" items={by(items, "contact", "hero")} onSave={updateContent} />
          <ContentSection title="📍 Informations de Contact" items={by(items, "contact", "info")} onSave={updateContent} />
        </div>
      )}

      {/* ── TEAM ── */}
      {activeTab === "team" && (
        <div className="space-y-4">
          <ContentSection title="🖼️ Hero" items={by(items, "team", "hero")} onSave={updateContent} />
          <ContentSection title="🎓 Qualifications" items={by(items, "team", "qualifications")} onSave={updateContent} />

          {/* Team members list */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-gray-50">
              <span className="font-semibold text-gray-800">👥 Membres de l'Équipe</span>
              <button
                onClick={() => setMemberModal({ open: true, member: null })}
                className="flex items-center gap-1.5 bg-brand-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-brand-700"
              >
                <Plus size={14} /> Ajouter
              </button>
            </div>
            <div className="p-5 space-y-3 bg-white">
              {members.length === 0 && (
                <p className="text-sm text-gray-500 italic text-center py-4">Aucun membre — ajoutez-en un.</p>
              )}
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-brand-100 hover:bg-brand-50/30 transition-all">
                  <img
                    src={member.photo_base64 ?? "https://placehold.co/80x80?text=?"}
                    alt={member.name}
                    className="w-12 h-12 rounded-full object-cover border border-gray-200 flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/80x80?text=?"; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.specialty}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setMemberModal({ open: true, member })}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-brand-700 hover:bg-brand-50"
                      title="Modifier"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member.id, member.name)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50"
                      title="Supprimer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      {activeTab === "footer" && (
        <div className="space-y-4">
          <ContentSection title="🏷️ Nom & Description" items={by(items, "footer", "brand")} onSave={updateContent} />
          <ContentSection title="📍 Contact" items={by(items, "footer", "contact")} onSave={updateContent} />
          <ContentSection title="🕐 Horaires" items={by(items, "footer", "hours")} onSave={updateContent} />
          <ContentSection title="⚖️ Mentions légales" items={by(items, "footer", "legal")} onSave={updateContent} />
          <SocialMediaSection items={items} onSave={updateContent} />
        </div>
      )}

      {/* Member modal */}
      {memberModal.open && (
        <TeamMemberModal
          member={memberModal.member}
          onClose={() => setMemberModal({ open: false, member: null })}
          onSave={handleSaveMember}
        />
      )}
    </div>
  );
}
