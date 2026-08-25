"use client";

import { ShieldCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BrandViolation {
  term: string;
  position: number;
  severity: "critical" | "warning";
}

export interface BrandSafety {
  safe: boolean;
  criticalViolations: BrandViolation[];
  warnings: BrandViolation[];
}

/**
 * Badge brand-safety partagé — mêmes 4 modes de l'Atelier Social passent tous
 * par ce composant (aucun mode ne contourne checkBrandSafety, cf. lib/brand-rules.ts).
 */
export function BrandSafetyBadge({ brandSafety }: { brandSafety: BrandSafety | null }) {
  if (!brandSafety) return null;

  return (
    <div
      className={cn(
        "rounded-xl p-3 flex items-start gap-2 text-xs",
        brandSafety.safe
          ? "bg-green-50 text-green-800 border border-green-200"
          : "bg-red-50 text-red-800 border border-red-200"
      )}
    >
      {brandSafety.safe ? (
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      )}
      <div className="flex-1">
        <p className="font-medium">
          {brandSafety.safe ? "Brand-safe ✓" : `${brandSafety.criticalViolations.length} violation(s)`}
        </p>
        {brandSafety.warnings.length > 0 && (
          <p className="text-[11px] text-amber-700">
            {brandSafety.warnings.length} avertissement(s) — à vérifier.
          </p>
        )}
      </div>
    </div>
  );
}
