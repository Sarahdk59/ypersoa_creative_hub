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
import { HubTopbar } from "./HubTopbar";
import { HubSidebar } from "./HubSidebar";

interface HubShellProps {
  children: ReactNode;
}

export function HubShell({ children }: HubShellProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
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
            padding: "var(--content-padding)",
            background: "var(--hub-bg)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
