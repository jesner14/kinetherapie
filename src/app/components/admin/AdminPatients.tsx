import { useState, useEffect, useRef } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Plus, Search, Calendar as CalendarIcon, Loader2, UserX, CheckCircle, Copy, Eye, EyeOff, X } from "lucide-react";
import { supabase, type Profile } from "../../../lib/supabase";

type ModalState = "form" | "success";

interface CreatedPatient {
  fullName: string;
  email: string;
  password: string;
}

export function AdminPatients() {
  // Isolated client — doesn't touch the doctor's session, created once per mount
  const tempClientRef = useRef<SupabaseClient | null>(null);
  if (!tempClientRef.current) {
    tempClientRef.current = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      { auth: { autoRefreshToken: false, persistSession: false, storageKey: "temp-patient-creation" } }
    );
  }
  const tempClient = tempClientRef.current;

  const [patients, setPatients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalState, setModalState] = useState<ModalState>("form");
  const [createdPatient, setCreatedPatient] = useState<CreatedPatient | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchPatients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "patient")
      .order("created_at", { ascending: false });
    if (!error && data) setPatients(data);
    setLoading(false);
  };

  useEffect(() => { fetchPatients(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (form.password.length < 6) {
      setFormError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setSubmitting(true);
    const { error } = await tempClient.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName, role: "patient" } },
    });
    setSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setCreatedPatient({ fullName: form.fullName, email: form.email, password: form.password });
    setModalState("success");
    fetchPatients();
  };

  const closeModal = () => {
    setShowModal(false);
    setModalState("form");
    setForm({ fullName: "", email: "", password: "" });
    setFormError(null);
    setCopied(false);
    setShowPassword(false);
  };

  const copyCredentials = () => {
    if (!createdPatient) return;
    navigator.clipboard.writeText(
      `Vos accès Kiné Excellence :\nEmail : ${createdPatient.email}\nMot de passe : ${createdPatient.password}\nConnexion : ${window.location.origin}/login`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredPatients = patients.filter((p) =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Patients</h1>
          <p className="text-gray-600">Patients inscrits sur la plateforme</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all"
        >
          <Plus size={20} />
          Créer un Patient
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un patient..."
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
            <Loader2 size={22} className="animate-spin" />
            <span>Chargement des patients...</span>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <UserX size={40} />
            <p className="text-lg font-medium">Aucun patient trouvé</p>
            <p className="text-sm">Créez le premier patient avec le bouton ci-dessus.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-green-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left">Nom</th>
                  <th className="px-6 py-4 text-left">Membre depuis</th>
                  <th className="px-6 py-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center shrink-0">
                          {patient.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900">{patient.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <CalendarIcon size={16} />
                        {new Date(patient.created_at).toLocaleDateString("fr-FR")}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3">
                        <button className="text-blue-600 hover:text-blue-700 font-semibold text-sm">Modifier</button>
                        <button className="text-green-600 hover:text-green-700 font-semibold text-sm">Message</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {modalState === "form" ? "Créer un compte patient" : "Compte créé avec succès"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            {modalState === "form" && (
              <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Marie Dupont"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="marie.dupont@email.com"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe temporaire
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pr-10 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Le patient pourra le modifier après connexion.</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    {submitting ? "Création..." : "Créer le compte"}
                  </button>
                </div>
              </form>
            )}

            {/* Success */}
            {modalState === "success" && createdPatient && (
              <div className="px-6 py-5">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle size={22} className="text-green-600 shrink-0" />
                  <p className="text-sm text-gray-700">
                    Le compte de <strong>{createdPatient.fullName}</strong> a été créé. Transmettez ces accès au patient.
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="font-medium text-gray-900">{createdPatient.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mot de passe</span>
                    <span className="font-mono font-medium text-gray-900">{createdPatient.password}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lien</span>
                    <span className="text-gray-900">/login</span>
                  </div>
                </div>

                <button
                  onClick={copyCredentials}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {copied ? <CheckCircle size={15} className="text-green-600" /> : <Copy size={15} />}
                  {copied ? "Copié !" : "Copier les accès"}
                </button>

                <button
                  onClick={closeModal}
                  className="mt-2 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                >
                  Terminer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
