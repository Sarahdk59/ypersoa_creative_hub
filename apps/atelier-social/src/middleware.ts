/**
 * CORS minimal pour permettre à atelier-shooting (port 3001) d'utiliser :
 *  - /api/da/referentiels    → liste des motifs Hub
 *  - /api/da/motifs/[id]/*   → preview / prod-file / promote
 *  - /motifs/<file>          → PNG des motifs (symlink vers assets/motifs)
 *
 * Dev local seulement — Access-Control-Allow-Origin: * acceptable ici.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }
  const response = NextResponse.next();
  const headers = corsHeaders();
  for (const [k, v] of Object.entries(headers)) {
    response.headers.set(k, v);
  }
  return response;
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export const config = {
  matcher: ["/api/da/:path*", "/motifs/:path*"],
};
