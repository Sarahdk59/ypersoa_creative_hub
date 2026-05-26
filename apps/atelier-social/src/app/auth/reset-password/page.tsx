"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Phase = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Le client navigateur détecte automatiquement le code de récupération dans
  // l'URL (detectSessionInUrl) et émet l'évènement PASSWORD_RECOVERY. On attend
  // qu'une session valide soit établie avant d'afficher le formulaire.
  useEffect(() => {
    const supabase = createClient();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setPhase("ready");
      }
    });

    // Cas où la session est déjà résolue avant l'abonnement.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPhase("ready");
      else
        // Laisse une fenêtre à detectSessionInUrl pour traiter le lien, sinon
        // on considère le lien invalide ou expiré.
        setTimeout(() => {
          setPhase((p) => (p === "checking" ? "invalid" : p));
        }, 2500);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError("Impossible de mettre à jour le mot de passe. Réessaie.");
      setLoading(false);
      return;
    }
    setPhase("done");
    setLoading(false);
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1800);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--hub-bg, #faf7f2)",
        padding: 24,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "#fff",
          border: "1px solid #ece3d5",
          borderRadius: 16,
          padding: 36,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#1a1614",
              color: "#faf7f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-serif, Georgia, serif)",
              fontSize: 20,
              margin: "0 auto 16px",
            }}
          >
            Y
          </div>
          <h1
            style={{
              fontFamily: "var(--font-serif, Georgia, serif)",
              fontSize: 22,
              color: "#1a1614",
            }}
          >
            Nouveau mot de passe
          </h1>
          <p style={{ fontSize: 13, color: "#6b5f57", marginTop: 6 }}>
            Choisis un nouveau mot de passe pour ton compte
          </p>
        </div>

        {phase === "checking" && (
          <p style={{ fontSize: 13, color: "#6b5f57", margin: 0, textAlign: "center" }}>
            Vérification du lien…
          </p>
        )}

        {phase === "invalid" && (
          <>
            <p style={{ fontSize: 13, color: "#b4665f", margin: 0, lineHeight: 1.5 }}>
              Ce lien de réinitialisation est invalide ou a expiré. Demande un
              nouveau lien pour continuer.
            </p>
            <Link
              href="/login/forgot-password"
              style={{
                marginTop: 6,
                padding: "11px 16px",
                borderRadius: 10,
                background: "#b4665f",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              Demander un nouveau lien
            </Link>
          </>
        )}

        {phase === "done" && (
          <p style={{ fontSize: 13, color: "#1a1614", margin: 0, lineHeight: 1.5 }}>
            Mot de passe mis à jour. Redirection vers la connexion…
          </p>
        )}

        {phase === "ready" && (
          <>
            <label
              style={{
                fontSize: 12,
                color: "#6b5f57",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              Nouveau mot de passe
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                style={inputStyle}
              />
            </label>

            <label
              style={{
                fontSize: 12,
                color: "#6b5f57",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              Confirme le mot de passe
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                style={inputStyle}
              />
            </label>

            {error && (
              <p style={{ fontSize: 13, color: "#b4665f", margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6,
                padding: "11px 16px",
                borderRadius: 10,
                border: "none",
                background: "#b4665f",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Enregistrement…" : "Réinitialiser le mot de passe"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ece3d5",
  fontSize: 14,
  color: "#1a1614",
  outline: "none",
  background: "#fff",
};
