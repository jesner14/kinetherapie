import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { Lock, Mail, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../../../lib/AuthContext";
import { useLogo } from "../../../lib/hooks/useLogo";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, profile, loading: authLoading } = useAuth();
  const role = searchParams.get("role") || "patient";
  const logoUrl = useLogo();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      const friendlyError =
        signInError.toLowerCase().includes("email not confirmed")
          ? "Ce compte n'a pas encore été confirmé. Demandez à votre médecin de confirmer votre compte."
          : signInError.toLowerCase().includes("invalid login credentials")
          ? "Email ou mot de passe incorrect."
          : signInError;
      setError(friendlyError);
      setSubmitting(false);
      return;
    }

    // Let the profile load then redirect via useEffect
    setSubmitting(false);
  };

  // Redirect after successful login based on profile role
  useEffect(() => {
    if (!authLoading && profile) {
      if (profile.role === "doctor") {
        navigate("/admin");
      } else {
        navigate("/patient");
      }
    }
  }, [authLoading, profile, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-brand-50 to-brand-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl p-7">
        <div className="text-center mb-7">
          <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-3 shadow-lg shadow-brand-200 bg-white">
            <img src={logoUrl} alt="Kiné Excellence" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Kine Excellence</h1>
          <p className="text-xs text-brand-700 mt-1 font-semibold uppercase tracking-[0.18em]">
            {role === "admin" ? "Espace Docteur" : "Espace Patient"}
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2.5">
            <AlertCircle size={15} className="shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4.5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                placeholder={
                  role === "admin"
                    ? "doctor@kine-excellence.fr"
                    : "patient@email.com"
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm pt-1">
            <label className="flex items-center gap-1.5 text-gray-600 text-xs">
              <input
                type="checkbox"
                className="w-3.5 h-3.5 text-brand-600 border-gray-300 rounded"
              />
              Se souvenir de moi
            </label>
            <button
              type="button"
              className="text-brand-700 hover:text-brand-800 font-semibold text-xs"
            >
              Mot de passe oublié ?
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-brand-600 text-white py-3 rounded-xl hover:from-teal-600 hover:to-brand-700 transition-all font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-brand-200"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Connexion...
              </>
            ) : (
              "Se Connecter"
            )}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-xs text-brand-700 hover:text-brand-800 font-semibold"
          >
            ← Retour au site
          </button>
        </div>

        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            Pas encore de compte ?{" "}
            <Link to="/register" className="text-brand-700 hover:underline font-semibold">
              Créer un compte patient
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
