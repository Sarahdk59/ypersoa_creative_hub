"use client";

import { useAuth } from "./auth/AuthProvider";

/** Petit îlot client dans l'accueil (Server Component) — le nom vient du contexte auth. */
export function GreetingName() {
  const { displayName } = useAuth();
  return <>{displayName ? `${displayName}, ` : ""}</>;
}
