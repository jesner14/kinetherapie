import { useState, useRef } from "react";
import {
  Pencil, X, Check, Loader2, Plus, Trash2, Image as ImageIcon,
  Home, Info, Phone, Users, ChevronDown, ChevronUp, Upload,
} from "lucide-react";
import { useAllSiteContent } from "../../../lib/hooks/useSiteContent";
import { useTeamMembers } from "../../../lib/hooks/useTeamMembers";
import { TeamMemberDB } from "../../../lib/supabase";
import { toast } from "sonner";

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
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-100 rounded-xl animate-pulse w-64" />
        <div className="h-64 bg-gray-50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Contenu du Site</h1>
        <p className="text-gray-500 text-sm">Cliquez sur le crayon ✏️ à côté de n'importe quel élément pour le modifier. Les changements sont sauvegardés en temps réel.</p>
      </div>

      {/* ── Tabs ── */}
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
