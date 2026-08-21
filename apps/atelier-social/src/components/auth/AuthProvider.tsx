"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppRole } from "@/lib/access";

interface AuthState {
  email: string | null;
  displayName: string | null;
  role: AppRole | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  email: null,
  displayName: null,
  role: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

/** Prénom déduit de l'email si `full_name` n'est pas renseigné en base. */
function fallbackDisplayName(email: string | null): string | null {
  if (!email) return null;
  const local = email.split("@")[0]?.split(".")[0] ?? "";
  if (!local) return null;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    email: null,
    displayName: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (active) setState({ email: null, displayName: null, role: null, loading: false });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();
      if (active) {
        setState({
          email: user.email ?? null,
          displayName: profile?.full_name ?? fallbackDisplayName(user.email ?? null),
          role: (profile?.role as AppRole) ?? "viewer",
          loading: false,
        });
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
