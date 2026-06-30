/**
 * HubShell — assembleur de chrome.
 *
 * Topbar fixe en haut (56px), Sidebar verticale gauche (64px),
 * zone de contenu qui prend le reste avec padding 32px.
 * Background uniforme cream (var(--hub-bg)), aucune couleur d'app
 * dans la chrome (cf. _passations/DESIGN_SYSTEM_hub.md).
 */
"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { HubTopbar } from "./HubTopbar";
import { HubSidebar } from "./HubSidebar";
import { HubAssistant } from "./HubAssistant";
import { AuthProvider } from "./auth/AuthProvider";

interface HubShellProps {
  children: ReactNode;
}

export function HubShell({ children }: HubShellProps) {
  const pathname = usePathname() || "";

  // La page de login s'affiche sans la chrome du Hub.
  if (pathname.startsWith("/login")) {
    return <>{children}</>;
  }

  return (
    <AuthProvider>
      <div
      style={{
        height: "100vh",
        overflow: "hidden",
        background: "var(--hub-bg)",
        color: "var(--hub-foreground)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <HubTopbar />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <HubSidebar />
        <main
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            padding: "var(--content-padding)",
            background: "var(--hub-bg)",
          }}
        >
          {children}
        </main>
      </div>
      {/* Assistant conversationnel flottant — présent sur toutes les pages. */}
      <HubAssistant />
      </div>
    </AuthProvider>
  );
}
