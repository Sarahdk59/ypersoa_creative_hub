/**
 * Middleware Hub — deux responsabilités :
 *
 *  1. CORS public sur /api/da et /motifs (l'iframe atelier-shooting, autre
 *     origine, en a besoin sans session) — comportement historique préservé.
 *  2. Authentification : toute PAGE exige une session Supabase, sinon → /login.
 *     Puis gating par rôle (app_role) selon la section demandée.
 *
 * Les routes /api/* (hors /api/da) ne sont pas gardées en V1 (appelées en
 * same-origin par les pages déjà authentifiées).
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { canAccess, type AppRole } from "@/lib/access";

const CORS_PREFIXES = ["/api/da", "/motifs"];

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. CORS public (iframe shooting) — pas d'auth
  if (CORS_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: corsHeaders() });
    }
    const res = NextResponse.next();
    for (const [k, v] of Object.entries(corsHeaders())) res.headers.set(k, v);
    return res;
  }

  // 2. Routes publiques (login, callback auth, autres API same-origin)
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // 3. Session Supabase (rafraîchie via cookies)
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 4. Pas connecté → /login (avec retour)
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 5. Rôle (depuis profiles) + gating par section
  let role: AppRole = "viewer";
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role) role = profile.role as AppRole;

  if (!canAccess(role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/social"; // section dashboard, accessible à tous les rôles
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Tout sauf les assets internes Next. On garde /motifs/*.png et /api/da
  // dans le scope pour leur appliquer le CORS (iframe shooting).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
