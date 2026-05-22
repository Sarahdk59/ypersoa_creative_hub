"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppRole } from "@/lib/access";

interface AuthState {
  email: string | null;
  role: AppRole | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ email: null, role: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ email: null, role: null, loading: true });

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (active) setState({ email: null, role: null, loading: false });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (active) {
        setState({
          email: user.email ?? null,
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
