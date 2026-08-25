"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AtelierShell } from "@/components/social/AtelierShell";
import { VisuelWorkspace } from "@/components/social/workspaces/VisuelWorkspace";
import { AvisWorkspace } from "@/components/social/workspaces/AvisWorkspace";
import { HistoireWorkspace } from "@/components/social/workspaces/HistoireWorkspace";
import { ReelWorkspace } from "@/components/social/workspaces/ReelWorkspace";
import { MODES, type ModeKey } from "@/app/social/modes.config";

function isModeKey(v: string | null): v is ModeKey {
  return !!v && v in MODES;
}

function AtelierSocial() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode: ModeKey = isModeKey(searchParams.get("mode")) ? (searchParams.get("mode") as ModeKey) : "visuel";

  const onModeChange = useCallback(
    (m: ModeKey) => {
      router.push(`/social?mode=${m}`);
    },
    [router]
  );

  return (
    <AtelierShell mode={mode} onModeChange={onModeChange}>
      {mode === "visuel" && <VisuelWorkspace />}
      {mode === "avis" && <AvisWorkspace />}
      {mode === "histoire" && <HistoireWorkspace />}
      {mode === "reel" && <ReelWorkspace />}
    </AtelierShell>
  );
}

export default function SocialPage() {
  return (
    <Suspense fallback={null}>
      <AtelierSocial />
    </Suspense>
  );
}
