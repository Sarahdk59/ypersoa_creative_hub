"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) {
      setError("Impossible d'envoyer l'email. Réessaie dans un instant.");
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
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
            Mot de passe oublié
          </h1>
          <p style={{ fontSize: 13, color: "#6b5f57", marginTop: 6 }}>
            On t'envoie un lien pour réinitialiser ton mot de passe
          </p>
        </div>

        {sent ? (
          <>
            <p style={{ fontSize: 13, color: "#1a1614", margin: 0, lineHeight: 1.5 }}>
              Si un compte existe pour <strong>{email}</strong>, tu vas recevoir un
              email avec un lien de réinitialisation. Pense à vérifier tes spams.
            </p>
            <Link
              href="/login"
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
              Retour à la connexion
            </Link>
          </>
        ) : (
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
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
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
              {loading ? "Envoi…" : "Envoyer le lien"}
            </button>

            <Link
              href="/login"
              style={{
                fontSize: 13,
                color: "#6b5f57",
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              Retour à la connexion
            </Link>
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
