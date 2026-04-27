"use client";

import { useState, useMemo } from "react";
import { Star, Users, ChevronDown, X, Search, Filter } from "lucide-react";
import {
  CANONIQUES,
  applyFilters,
  DEFAULT_FILTERS,
  type Canonique,
  type CanoniqueFilters,
  type Genre,
  type AgeRange,
} from "@/lib/canoniques";
import { cn } from "@/lib/utils";

interface CanoniqueSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxSelection?: number;
}

const GENRE_OPTIONS: Array<{ value: Genre | "all"; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "femme", label: "Femmes" },
  { value: "homme", label: "Hommes" },
  { value: "enfant", label: "Enfants" },
];

const AGE_OPTIONS: Array<{ value: AgeRange; label: string }> = [
  { value: "all", label: "Tous âges" },
  { value: "enfant", label: "<18" },
  { value: "jeune", label: "18-40" },
  { value: "adulte", label: "40-60" },
  { value: "senior", label: "60+" },
];

const TYPE_OPTIONS: Array<{ value: "all" | "principal" | "secondaire"; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "principal", label: "Principaux" },
  { value: "secondaire", label: "Secondaires" },
];

export function CanoniqueSelector({
  selectedIds,
  onChange,
  maxSelection = 3,
}: CanoniqueSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<CanoniqueFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.genre !== "all" ||
    filters.ageRange !== "all" ||
    filters.type !== "all";

  const filteredCanoniques = useMemo(() => {
    return applyFilters(CANONIQUES, filters);
  }, [filters]);

  // Quand pas de filtres actifs : on garde la séparation favoris / autres
  // Quand filtres actifs : on affiche juste la liste filtrée à plat
  const favorites = filteredCanoniques.filter((c) => c.favorite);
  const others = filteredCanoniques.filter((c) => !c.favorite);

  const selectedCanoniques = selectedIds
    .map((id) => CANONIQUES.find((c) => c.id === id))
    .filter((c): c is Canonique => Boolean(c));

  const toggleCanonique = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else if (selectedIds.length < maxSelection) {
      onChange([...selectedIds, id]);
    }
  };

  const removeCanonique = (id: string) => {
    onChange(selectedIds.filter((s) => s !== id));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="space-y-3">
      {/* Selected pills */}
      {selectedCanoniques.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCanoniques.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 bg-brand-rose/10 text-brand-rose px-3 py-2 rounded-full text-sm font-medium"
            >
              <Users className="w-3.5 h-3.5" />
              <span>
                {c.prenom} <span className="text-brand-rose/60">({c.id})</span>
              </span>
              <button
                type="button"
                onClick={() => removeCanonique(c.id)}
                className="hover:bg-brand-rose/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-4 rounded-2xl border bg-white text-left transition-all",
          isOpen
            ? "border-brand-rose ring-1 ring-brand-rose"
            : "border-brand-muted/20 hover:border-brand-rose/40"
        )}
      >
        <span className="text-sm">
          {selectedIds.length === 0
            ? `Choisis 1 à ${maxSelection} mannequin(s)`
            : `${selectedIds.length}/${maxSelection} mannequin(s) sélectionné(s)`}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="rounded-2xl border border-brand-muted/20 bg-white p-4 max-h-[600px] overflow-y-auto space-y-4">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Rechercher par prénom, ID, description..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-brand-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-brand-rose/50"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilters({ ...filters, search: "" })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Toggle filtres avancés */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-muted hover:text-brand-text transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              {showFilters ? "Masquer les filtres" : "Filtres rapides"}
              {hasActiveFilters && (
                <span className="ml-1 bg-brand-rose text-white text-[10px] rounded-full px-1.5 py-0.5">
                  {[
                    filters.genre !== "all",
                    filters.ageRange !== "all",
                    filters.type !== "all",
                  ].filter(Boolean).length}
                </span>
              )}
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-brand-rose hover:underline"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {/* Filtres rapides */}
          {showFilters && (
            <div className="space-y-3 pb-3 border-b border-brand-muted/10">
              {/* Genre */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-brand-muted mb-1.5 font-semibold">
                  Genre
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {GENRE_OPTIONS.map((opt) => (
                    <FilterChip
                      key={opt.value}
                      label={opt.label}
                      active={filters.genre === opt.value}
                      onClick={() => setFilters({ ...filters, genre: opt.value })}
                    />
                  ))}
                </div>
              </div>

              {/* Âge */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-brand-muted mb-1.5 font-semibold">
                  Tranche d&apos;âge
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {AGE_OPTIONS.map((opt) => (
                    <FilterChip
                      key={opt.value}
                      label={opt.label}
                      active={filters.ageRange === opt.value}
                      onClick={() => setFilters({ ...filters, ageRange: opt.value })}
                    />
                  ))}
                </div>
              </div>

              {/* Type */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-brand-muted mb-1.5 font-semibold">
                  Catégorie
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TYPE_OPTIONS.map((opt) => (
                    <FilterChip
                      key={opt.value}
                      label={opt.label}
                      active={filters.type === opt.value}
                      onClick={() => setFilters({ ...filters, type: opt.value })}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Compteur résultats */}
          <p className="text-xs text-brand-muted">
            {filteredCanoniques.length} mannequin{filteredCanoniques.length > 1 ? "s" : ""}{" "}
            {hasActiveFilters && `(filtré${filteredCanoniques.length > 1 ? "s" : ""})`}
          </p>

          {/* Pas de résultats */}
          {filteredCanoniques.length === 0 && (
            <div className="text-center py-6 text-brand-muted text-sm">
              Aucun mannequin ne correspond à ces filtres.
              <button
                type="button"
                onClick={resetFilters}
                className="block mx-auto mt-2 text-brand-rose hover:underline"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}

          {/* Quand pas de filtres actifs : sections favoris / autres */}
          {!hasActiveFilters && filteredCanoniques.length > 0 && (
            <>
              {favorites.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-muted mb-2 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    Favoris
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {favorites.map((c) => (
                      <CanoniqueItem
                        key={c.id}
                        canonique={c}
                        selected={selectedIds.includes(c.id)}
                        disabled={!selectedIds.includes(c.id) && selectedIds.length >= maxSelection}
                        onClick={() => toggleCanonique(c.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {others.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-muted mb-2">
                    Tous les autres
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {others.map((c) => (
                      <CanoniqueItem
                        key={c.id}
                        canonique={c}
                        selected={selectedIds.includes(c.id)}
                        disabled={!selectedIds.includes(c.id) && selectedIds.length >= maxSelection}
                        onClick={() => toggleCanonique(c.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Quand filtres actifs : liste à plat */}
          {hasActiveFilters && filteredCanoniques.length > 0 && (
            <div className="grid grid-cols-1 gap-2">
              {filteredCanoniques.map((c) => (
                <CanoniqueItem
                  key={c.id}
                  canonique={c}
                  selected={selectedIds.includes(c.id)}
                  disabled={!selectedIds.includes(c.id) && selectedIds.length >= maxSelection}
                  onClick={() => toggleCanonique(c.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {selectedIds.length === 0 && (
        <p className="text-xs text-brand-muted italic">
          ⚠️ Si aucun mannequin sélectionné, Gemini générera un visage aléatoire.
        </p>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-xs font-medium transition-all",
        active
          ? "bg-brand-rose text-white"
          : "bg-brand-bg text-brand-muted hover:bg-brand-rose/10 hover:text-brand-rose"
      )}
    >
      {label}
    </button>
  );
}

function CanoniqueItem({
  canonique,
  selected,
  disabled,
  onClick,
}: {
  canonique: Canonique;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl text-left transition-all",
        selected
          ? "bg-brand-rose/10 border border-brand-rose"
          : "bg-brand-bg hover:bg-brand-rose/5 border border-transparent",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-muted/10 shrink-0 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/canonique-image?id=${canonique.id}`}
          alt={canonique.prenom}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = "none";
          }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{canonique.prenom}</span>
          <span className="text-xs text-brand-muted">{canonique.id}</span>
          {canonique.favorite && (
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          )}
        </div>
        <p className="text-xs text-brand-muted line-clamp-1">
          {canonique.age} ans — {canonique.description}
        </p>
      </div>

      {/* Checkbox */}
      <div
        className={cn(
          "w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center",
          selected
            ? "border-brand-rose bg-brand-rose"
            : "border-brand-muted/30"
        )}
      >
        {selected && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6L5 9L10 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </button>
  );
}
