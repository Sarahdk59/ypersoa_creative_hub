
import React, { useRef, useEffect, useState } from 'react';
import { GenerationSettings, ProductType, ActiveLookbookAmbiance } from '../types';
import { PRODUCTS_HUB, SIZES, ASPECT_RATIOS, ETHNICITIES, AGES, BODY_TYPES, DISABILITIES, THREAD_COLORS, DECOR_STYLES } from '../constants';
import { getCanoniquesSorted } from '../lib/canoniques';
import { getColorsForProduct, isFilGarmentIncompatible, HUB_FILS, HUB_PALETTES } from '../lib/hub-data';
import { listActiveLookbookAmbiances } from '../lib/active-ambiances';
import MotifPickerPanel from './MotifPickerPanel';

interface SidebarProps {
  settings: GenerationSettings;
  setSettings: React.Dispatch<React.SetStateAction<GenerationSettings>>;
  onGenerate: () => void;
  isLoading: boolean;
}

type ThreadColorMode = 'canoniques' | 'palette' | 'all' | 'image';

const Sidebar: React.FC<SidebarProps> = ({ settings, setSettings, onGenerate, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Couleurs vêtement réellement disponibles pour le produit sélectionné (filtrage Hub)
  const availableGarmentColors = getColorsForProduct(settings.product);

  // Mode du sélecteur "Couleur du fil" — défaut Sarah 19/05 : canoniques prod
  const [threadColorMode, setThreadColorMode] = useState<ThreadColorMode>('canoniques');
  const [threadPaletteFilter, setThreadPaletteFilter] = useState<string>('');
  // Si l'utilisateur a un threadColor = '' au boot, on respecte → mode "image"
  useEffect(() => {
    if (settings.threadColor === '' && threadColorMode !== 'image') {
      // si l'user clique sur "Comme sur l'image" explicitement on switche
    }
  }, [settings.threadColor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lookbooks ❤️ actifs comme ambiances de référence (cf. atelier-lookbook).
  // Refetch à chaque ouverture de l'app — pas besoin de live update.
  const [activeAmbiances, setActiveAmbiances] = useState<ActiveLookbookAmbiance[]>([]);
  useEffect(() => {
    listActiveLookbookAmbiances().then(setActiveAmbiances).catch(() => undefined);
  }, []);

  // Si le produit change et la couleur sélectionnée n'est plus dispo, reset silencieux à la 1ère couleur dispo
  useEffect(() => {
    const isCurrentColorAvailable = availableGarmentColors.some(c => c.id === settings.garmentColor);
    if (!isCurrentColorAvailable && availableGarmentColors.length > 0) {
      setSettings(prev => ({ ...prev, garmentColor: availableGarmentColors[0].id }));
    }
  }, [settings.product, settings.garmentColor, availableGarmentColors, setSettings]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, embroideryImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const wristFileInputRef = useRef<HTMLInputElement>(null);
  const handleWristFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, wristEmbroideryImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductChange = (productId: ProductType) => {
    setSettings(prev => ({ ...prev, product: productId }));
    // useEffect ci-dessus s'occupe du reset automatique de la couleur si elle devient indispo
  };

  return (
    <aside className="w-full lg:w-[380px] bg-[#faf8f3] border-r border-[#dfd5c3] h-full p-6 flex flex-col overflow-y-auto">
      <div className="mb-7 pb-5 border-b border-[#dfd5c3]">
        <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#c9473d] mb-2">Studio · Configuration</p>
        <h2 className="font-serif text-[30px] font-medium text-yp-olive mb-1">Créer un visuel</h2>
        <p className="text-[13px] leading-relaxed text-slate-500">Choisis le produit, l&apos;ambiance et le casting. Le reste reste à portée de main.</p>
      </div>

      <div className="space-y-8 flex-grow">
        {/* Step 1: Upload */}
        <section>
          <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
            1. Broderie (PNG ou JPG)
          </label>
          <div className="space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-yp-sable rounded-xl p-6 text-center cursor-pointer hover:bg-yp-linen transition-colors group relative overflow-hidden"
            >
              {settings.embroideryImage ? (
                <div className="flex flex-col items-center">
                  <img src={settings.embroideryImage} alt="Embroidery preview" className="h-24 w-auto object-contain mb-2" />
                  <span className="text-xs text-yp-olive font-medium">Modifier l'image</span>
                </div>
              ) : (
                <div className="py-4">
                  <i className="fa-solid fa-cloud-arrow-up text-3xl text-yp-sable mb-3 group-hover:scale-110 transition-transform"></i>
                  <p className="text-sm text-slate-500">Cliquez pour importer votre fichier PNG ou JPG</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <MotifPickerPanel
              onPick={(dataUrl) => setSettings(prev => ({ ...prev, embroideryImage: dataUrl }))}
            />
          </div>
        </section>

        {/* Step 1bis: Broderie poignet (optionnelle) */}
        <section>
          <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
            1bis. Broderie poignet <span className="text-[10px] font-normal text-slate-400 normal-case">— optionnelle, max 5 cm</span>
          </label>
          <div className="space-y-3">
            <div
              onClick={() => wristFileInputRef.current?.click()}
              className="border-2 border-dashed border-yp-sable rounded-xl p-4 text-center cursor-pointer hover:bg-yp-linen transition-colors group relative overflow-hidden"
            >
              {settings.wristEmbroideryImage ? (
                <div className="flex items-center justify-center gap-3">
                  <img src={settings.wristEmbroideryImage} alt="Wrist embroidery preview" className="h-14 w-auto object-contain" />
                  <div className="flex flex-col">
                    <span className="text-xs text-yp-olive font-medium">Modifier</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSettings(prev => ({ ...prev, wristEmbroideryImage: null })); }}
                      className="text-[10px] text-red-500 hover:underline mt-1"
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  <i className="fa-solid fa-plus text-xl text-yp-sable mb-1 group-hover:scale-110 transition-transform"></i>
                  <p className="text-[11px] text-slate-500">Ajouter une 2ᵉ broderie (poignet droit)</p>
                </div>
              )}
              <input
                ref={wristFileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleWristFileChange}
                className="hidden"
              />
            </div>

            <MotifPickerPanel
              onPick={(dataUrl) => setSettings(prev => ({ ...prev, wristEmbroideryImage: dataUrl }))}
              filter="poignet"
              triggerLabel="🎨 Choisir une variante poignet"
            />

            {settings.wristEmbroideryImage && (
              <div className="flex items-center gap-2 px-1">
                <label className="text-[10px] font-bold text-yp-olive uppercase">Taille poignet</label>
                {[2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    onClick={() => setSettings(prev => ({ ...prev, wristSize: s }))}
                    className={`w-9 h-9 flex items-center justify-center rounded-full text-[10px] font-bold transition-all border ${
                      (settings.wristSize ?? 4) === s
                        ? 'bg-yp-sable text-yp-olive border-yp-sable'
                        : 'bg-white text-slate-400 border-slate-200 hover:border-yp-sable'
                    }`}
                  >
                    {s}<span className="text-[7px] ml-0.5">cm</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Step 2: Product */}
        <section>
          <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
            2. Produit
          </label>
          <select
            value={settings.product}
            onChange={(e) => handleProductChange(e.target.value as ProductType)}
            className="w-full rounded-xl border border-[#d8cdb9] bg-white px-3 py-3 text-sm text-yp-olive shadow-sm outline-none transition focus:border-[#c9473d] focus:bg-[#fff7f5] focus:ring-2 focus:ring-[#c9473d]/15"
          >
            {PRODUCTS_HUB.map((p) => (
              <option key={p.id} value={p.id}>{p.id} · {p.nom_commercial} — {p.nb_couleurs_disponibles} couleurs</option>
            ))}
          </select>
        </section>

        {/* Step 3: Size */}
        <section>
          <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
            3. Taille de la broderie
          </label>
          <select
            value={settings.size}
            onChange={(e) => setSettings(prev => ({ ...prev, size: Number(e.target.value) as GenerationSettings['size'] }))}
            className="w-full rounded-xl border border-[#d8cdb9] bg-white px-3 py-3 text-sm text-yp-olive shadow-sm outline-none transition focus:border-[#c9473d] focus:bg-[#fff7f5] focus:ring-2 focus:ring-[#c9473d]/15"
          >
            {SIZES.map((size) => <option key={size} value={size}>{size} cm</option>)}
          </select>
        </section>

        {/* Step 4: Colors */}
        <section>
          <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
            4. Couleurs
          </label>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-yp-olive uppercase mb-3">
                Couleur du fil
              </label>

              {/* 4 modes : ★ Canoniques (10 fils TMEZ) / Palette (filtre) / Tous / Comme sur l'image */}
              <div className="grid grid-cols-4 gap-1 mb-3 p-1 bg-slate-100 rounded-lg text-[10px] font-semibold">
                {([
                  { id: 'canoniques', label: '★ Canon.' },
                  { id: 'palette',    label: 'Palette' },
                  { id: 'all',        label: 'Tous' },
                  { id: 'image',      label: 'PNG' },
                ] as const).map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setThreadColorMode(t.id);
                      if (t.id === 'image') {
                        setSettings(prev => ({ ...prev, threadColor: '' }));
                      }
                    }}
                    className={`py-1.5 rounded transition-all ${
                      threadColorMode === t.id
                        ? 'bg-white text-yp-olive shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Mode 1 : Canoniques TMEZ (10 fils max) */}
              {threadColorMode === 'canoniques' && (() => {
                const canoniques = HUB_FILS.filter(f => f.canonique && !f.archive);
                return (
                  <>
                    <div className="text-[10px] text-slate-500 italic mb-2">
                      {canoniques.length} fils chargés en permanence sur la TMEZ
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canoniques.map(fil => {
                        const isIncompatible = isFilGarmentIncompatible(fil.id, settings.garmentColor);
                        return (
                          <button
                            key={fil.id}
                            onClick={() => setSettings(prev => ({ ...prev, threadColor: fil.id }))}
                            title={`★ ${fil.nom}${isIncompatible ? ' — peu lisible sur ce vêtement' : ''}`}
                            className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center relative ${
                              settings.threadColor === fil.id
                                ? 'border-yp-olive scale-110 shadow-md'
                                : 'border-transparent hover:scale-105 shadow-sm'
                            } ${isIncompatible ? 'opacity-40' : ''}`}
                            style={{ backgroundColor: fil.hex }}
                          >
                            <span className="absolute -top-1 -right-1 bg-[#1E2D4A] text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">★</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}

              {/* Mode 2 : Palette — filtre par palette d'association */}
              {threadColorMode === 'palette' && (() => {
                const paletteCourante = HUB_PALETTES.find(p => p.id === threadPaletteFilter);
                const filsDePalette = paletteCourante
                  ? paletteCourante.fils.map(fid => HUB_FILS.find(f => f.id === fid)).filter((f): f is NonNullable<typeof f> => Boolean(f))
                  : [];
                return (
                  <>
                    <select
                      value={threadPaletteFilter}
                      onChange={(e) => setThreadPaletteFilter(e.target.value)}
                      className="w-full px-2 py-1.5 mb-3 text-xs rounded border border-slate-200 bg-white"
                    >
                      <option value="">— Choisir une palette —</option>
                      {HUB_PALETTES.map(p => (
                        <option key={p.id} value={p.id}>{p.nom} ({p.fils.length} fils · {p.type})</option>
                      ))}
                    </select>
                    {paletteCourante && (() => {
                      const paletteIds = filsDePalette.map(f => f.id);
                      const isMulti = (settings.threadPaletteIds?.length ?? 0) > 1
                        && settings.threadPaletteIds!.every(id => paletteIds.includes(id));
                      return (
                        <>
                          <button
                            onClick={() => {
                              if (isMulti) {
                                setSettings(prev => ({ ...prev, threadPaletteIds: undefined }));
                              } else {
                                setSettings(prev => ({ ...prev, threadColor: '', threadPaletteIds: paletteIds }));
                              }
                            }}
                            className={`w-full mb-3 px-3 py-2 text-[11px] font-semibold rounded border transition-all ${
                              isMulti
                                ? 'bg-yp-olive text-white border-yp-olive'
                                : 'bg-white text-yp-olive border-yp-olive/40 hover:border-yp-olive'
                            }`}
                            title="La broderie utilisera tous les fils de la palette (chaque lettre/forme dans une couleur)"
                          >
                            {isMulti ? `✓ Multicolore activé — ${paletteIds.length} fils` : `🌈 Utiliser toute la palette en multicolore (${paletteIds.length} fils)`}
                          </button>
                          <div className="flex flex-wrap gap-2">
                            {filsDePalette.map(fil => {
                              const isIncompatible = isFilGarmentIncompatible(fil.id, settings.garmentColor);
                              const isSelectedMono = !isMulti && settings.threadColor === fil.id;
                              return (
                                <button
                                  key={fil.id}
                                  onClick={() => setSettings(prev => ({ ...prev, threadColor: fil.id, threadPaletteIds: undefined }))}
                                  title={`${fil.nom}${fil.canonique ? ' ★ canonique TMEZ' : ''}${isMulti ? ' — désactive le multicolore pour passer en mono' : ''}`}
                                  className={`w-9 h-9 rounded-full border-2 transition-all relative ${
                                    isSelectedMono
                                      ? 'border-yp-olive scale-110 shadow-md'
                                      : isMulti
                                      ? 'border-yp-olive/60 shadow-sm'
                                      : 'border-transparent hover:scale-105 shadow-sm'
                                  } ${isIncompatible && !isMulti ? 'opacity-40' : ''}`}
                                  style={{ backgroundColor: fil.hex }}
                                >
                                  {fil.canonique && <span className="absolute -top-1 -right-1 bg-[#1E2D4A] text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">★</span>}
                                </button>
                              );
                            })}
                          </div>
                          {paletteCourante.description && (
                            <p className="mt-2 text-[10px] text-slate-500 italic">{paletteCourante.description}</p>
                          )}
                        </>
                      );
                    })()}
                  </>
                );
              })()}

              {/* Mode 3 : Tous les fils Hub (avec ★ sur les canoniques) */}
              {threadColorMode === 'all' && (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-auto pr-1">
                  {HUB_FILS.filter(f => !f.archive).map(fil => {
                    const isIncompatible = isFilGarmentIncompatible(fil.id, settings.garmentColor);
                    return (
                      <button
                        key={fil.id}
                        onClick={() => setSettings(prev => ({ ...prev, threadColor: fil.id }))}
                        title={`${fil.nom}${fil.canonique ? ' ★ canonique TMEZ' : ''}${isIncompatible ? ' — peu lisible' : ''}`}
                        className={`w-9 h-9 rounded-full border-2 transition-all relative ${
                          settings.threadColor === fil.id
                            ? 'border-yp-olive scale-110 shadow-md'
                            : 'border-transparent hover:scale-105 shadow-sm'
                        } ${isIncompatible ? 'opacity-40' : ''}`}
                        style={{ backgroundColor: fil.hex }}
                      >
                        {fil.canonique && <span className="absolute -top-1 -right-1 bg-[#1E2D4A] text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">★</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Mode 4 : Comme sur l'image — preserve PNG */}
              {threadColorMode === 'image' && (
                <div className="px-3 py-3 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-xs text-slate-600">
                  <strong>Comme sur l'image</strong><br />
                  Gemini préserve la couleur de la broderie du PNG source. Aucun re-tinting.
                </div>
              )}

              <div className="mt-2 text-xs text-slate-500 italic">
                {(settings.threadPaletteIds?.length ?? 0) > 1
                  ? `🌈 Multicolore — ${settings.threadPaletteIds!.length} fils`
                  : threadColorMode === 'image' || settings.threadColor === ''
                  ? "Comme sur l'image"
                  : (() => {
                      const fil = HUB_FILS.find(f => f.id === settings.threadColor);
                      return fil ? `${fil.canonique ? '★ ' : ''}${fil.nom}` : settings.threadColor;
                    })()}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-yp-olive uppercase mb-3">
                Couleur du vêtement <span className="text-slate-400 font-normal normal-case">— {availableGarmentColors.length} dispos pour {settings.product}</span>
              </label>
              <select
                value={settings.garmentColor}
                onChange={(e) => setSettings(prev => ({ ...prev, garmentColor: e.target.value }))}
                className="w-full rounded-xl border border-[#d8cdb9] bg-white px-3 py-2.5 text-xs text-yp-olive shadow-sm outline-none transition focus:border-[#c9473d] focus:bg-[#fff7f5]"
              >
                {availableGarmentColors.map((color) => <option key={color.id} value={color.id}>{color.nom}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Step 5: Format */}
        <section>
          <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
            5. Format d'image
          </label>
          <select
            value={settings.aspectRatio}
            onChange={(e) => setSettings(prev => ({ ...prev, aspectRatio: e.target.value as GenerationSettings['aspectRatio'] }))}
            className="w-full rounded-xl border border-[#d8cdb9] bg-white px-3 py-3 text-sm text-yp-olive shadow-sm outline-none transition focus:border-[#c9473d] focus:bg-[#fff7f5]"
          >
            {ASPECT_RATIOS.map((format) => <option key={format.value} value={format.value}>{format.value} · {format.label}</option>)}
          </select>
        </section>

        {/* Step 6: Mode */}
        <section>
          <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
            6. Type de prise de vue
          </label>
          <select
            value={settings.mode}
            onChange={(e) => setSettings(prev => ({ ...prev, mode: e.target.value as GenerationSettings['mode'] }))}
            className="w-full rounded-xl border border-[#d8cdb9] bg-white px-3 py-3 text-sm text-yp-olive shadow-sm outline-none transition focus:border-[#a75f59]"
          >
            <option value="mannequin">Mannequin · un visuel porté</option>
            <option value="family">Famille · scène collective</option>
            <option value="packshot">Packshot · produit seul</option>
            <option value="full">Pack complet · 6 visuels</option>
            <option value="flatlay">Flatlay · 4 visuels Pinterest</option>
          </select>
          {settings.mode === 'flatlay' && (
            <p className="text-[10px] text-slate-400 leading-snug mb-2">
              Mise à plat sans personne, composée autour de l'ambiance choisie (props + palette assortis). Le casting est ignoré.
            </p>
          )}

          {/* Casting (Diversity ↔ Canonique Hub) — visible dans TOUS les modes (29/05).
              Les sous-champs Diversity (ethnie/âge/morpho) restent gated à mannequin/full
              car la Famille a son propre bloc diversité et le Packshot n'a pas de personne.
              Le sélecteur Canonique reste visible partout : appliqué en mannequin/full/family
              (ancrage d'un adulte sur le canonique), persisté en packshot (pas appliqué). */}
          <div className="space-y-4 p-4 bg-yp-linen/50 rounded-xl border border-yp-sable/30 animate-in fade-in slide-in-from-top-2">
              {/* Toggle casting mode */}
              <div>
                <label className="block text-[10px] font-bold text-yp-olive uppercase mb-2">Casting</label>
                <select
                  value={settings.castingMode}
                  onChange={(e) => setSettings(prev => ({ ...prev, castingMode: e.target.value as GenerationSettings['castingMode'] }))}
                  className="w-full rounded-lg border border-[#d8cdb9] bg-white px-2.5 py-2 text-xs text-yp-olive outline-none"
                >
                  <option value="canonique">Canonique Hub · visage cohérent</option>
                  <option value="diversity">Diversity · casting libre</option>
                </select>
              </div>

              {/* Mode Diversity (random visages) — uniquement quand le mode utilise ce bloc */}
              {settings.castingMode === 'diversity' && (settings.mode === 'mannequin' || settings.mode === 'full') && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-yp-olive uppercase mb-2">Ethnie</label>
                    <select
                      value={settings.diversity.ethnicity}
                      onChange={(e) => setSettings(prev => ({ ...prev, diversity: { ...prev.diversity, ethnicity: e.target.value as any } }))}
                      className="w-full px-2 py-1.5 rounded-md text-[10px] border border-slate-200 bg-white outline-none"
                    >
                      {ETHNICITIES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-yp-olive uppercase mb-2">Âge</label>
                      <select
                        value={settings.diversity.age}
                        onChange={(e) => setSettings(prev => ({ ...prev, diversity: { ...prev.diversity, age: e.target.value as any } }))}
                        className="w-full px-2 py-1.5 rounded-md text-[10px] border border-slate-200 bg-white outline-none"
                      >
                        {AGES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-yp-olive uppercase mb-2">Morphologie</label>
                      <select
                        value={settings.diversity.bodyType}
                        onChange={(e) => setSettings(prev => ({ ...prev, diversity: { ...prev.diversity, bodyType: e.target.value as any } }))}
                        className="w-full px-2 py-1.5 rounded-md text-[10px] border border-slate-200 bg-white outline-none"
                      >
                        {BODY_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-yp-olive uppercase mb-2">Inclusion / Handicap</label>
                    <select
                      value={settings.diversity.disability}
                      onChange={(e) => setSettings(prev => ({ ...prev, diversity: { ...prev.diversity, disability: e.target.value as any } }))}
                      className="w-full px-2 py-1.5 rounded-md text-[10px] border border-slate-200 bg-white outline-none"
                    >
                      {DISABILITIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* Casting canonique : une surface repliée, choisie seulement par miniatures.
                  On conserve la sélection multiple pour les scènes famille/pack. */}
              {settings.castingMode === 'canonique' && (
                <details className="group rounded-lg border border-[#d8cdb9] bg-white">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-2 text-xs text-yp-olive [&::-webkit-details-marker]:hidden">
                    <span className="flex -space-x-1.5">
                      {settings.canoniqueIds.slice(0, 3).map((id) => {
                        const canonique = getCanoniquesSorted().find((item) => item.id === id);
                        return canonique ? <img key={id} src={`/canoniques/${canonique.filename}`} alt="" className="h-7 w-6 rounded object-cover ring-1 ring-white" /> : null;
                      })}
                    </span>
                    <span className="flex-1">{settings.canoniqueIds.length > 0 ? `${settings.canoniqueIds.length} mannequin${settings.canoniqueIds.length > 1 ? 's' : ''} sélectionné${settings.canoniqueIds.length > 1 ? 's' : ''}` : 'Choisir un mannequin'}</span>
                    <i className="fa-solid fa-chevron-down text-[9px] text-slate-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="grid grid-cols-5 gap-1.5 border-t border-[#eee7da] p-2">
                    {getCanoniquesSorted().map((canonique) => {
                      const selected = settings.canoniqueIds.includes(canonique.id);
                      return (
                        <button
                          key={canonique.id}
                          type="button"
                          title={`${canonique.prenom}, ${canonique.age} ans`}
                          aria-label={`Sélectionner ${canonique.prenom}`}
                          onClick={() => setSettings(prev => ({ ...prev, canoniqueIds: selected ? prev.canoniqueIds.filter((id) => id !== canonique.id) : [...prev.canoniqueIds, canonique.id] }))}
                          className={`relative aspect-[3/4] overflow-hidden rounded-md border-2 transition ${selected ? 'border-[#c9473d] ring-2 ring-[#c9473d]/15' : 'border-transparent hover:border-[#d8cdb9]'}`}
                        >
                          <img src={`/canoniques/${canonique.filename}`} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                          {selected && <i className="fa-solid fa-circle-check absolute right-0.5 top-0.5 text-[10px] text-[#c9473d] drop-shadow-[0_1px_1px_white]" />}
                        </button>
                      );
                    })}
                  </div>
                </details>
              )}
            </div>

          {/* Family Options */}
          {settings.mode === 'family' && (
            <div className="space-y-4 p-4 bg-yp-linen/50 rounded-xl border border-yp-sable/30 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-[10px] font-bold text-yp-olive uppercase mb-2">Composition</label>
                <select
                  value={settings.familyConfig.coupleType}
                  onChange={(e) => setSettings(prev => ({ ...prev, familyConfig: { ...prev.familyConfig, coupleType: e.target.value as GenerationSettings['familyConfig']['coupleType'] } }))}
                  className="w-full rounded-lg border border-[#d8cdb9] bg-white px-2.5 py-2 text-xs text-yp-olive outline-none"
                >
                  <option value="random">Aléatoire</option>
                  <option value="maman-papa">Maman / Papa</option>
                  <option value="papa-papa">Papa / Papa</option>
                  <option value="maman-maman">Maman / Maman</option>
                  <option value="maman-mamie">Maman / Mamie</option>
                  <option value="papi-papa">Papi / Papa</option>
                  <option value="papa-mamie">Papa / Mamie</option>
                  <option value="enfant-maman">Enfant / Maman</option>
                  <option value="enfant-papa">Enfant / Papa</option>
                  <option value="enfant-mamie">Enfant / Mamie</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-yp-olive uppercase mb-2">Nombre d'enfants</label>
                <select
                  value={settings.familyConfig.childrenCount}
                  onChange={(e) => setSettings(prev => ({ ...prev, familyConfig: { ...prev.familyConfig, childrenCount: Number(e.target.value) } }))}
                  className="w-full rounded-lg border border-[#d8cdb9] bg-white px-2.5 py-2 text-xs text-yp-olive outline-none"
                >
                  <option value="1">1 enfant</option>
                  <option value="2">2 enfants</option>
                  <option value="3">3 enfants</option>
                </select>
              </div>
            </div>
          )}
        </section>

        {/* Step 7: Décor — visible dans TOUS les modes (29/05).
            Mannequin/Full : décor de la scène. Family : décor de la scène familiale.
            Packshot : arrière-plan du packshot (Studio Brut Minimaliste = fond blanc classique). */}
        <section>
            <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
              7. Décor / Ambiance
            </label>
            {settings.mode === 'packshot' && (
              <p className="text-[10px] text-slate-400 italic mb-2 leading-snug">
                Packshot mannequin invisible : « Studio Brut Minimaliste » garde le fond blanc e-commerce classique. Tout autre décor place le vêtement dans l'ambiance choisie.
              </p>
            )}
            <select
              value={settings.decorStyle === 'lookbook' ? `lookbook:${settings.customLookbookAmbiance?.id ?? ''}` : settings.decorStyle}
              onChange={(e) => {
                const value = e.target.value;
                const lookbookId = value.startsWith('lookbook:') ? value.slice('lookbook:'.length) : null;
                const lookbook = activeAmbiances.find((item) => item.id === lookbookId);
                setSettings(prev => lookbook
                  ? { ...prev, decorStyle: 'lookbook', customLookbookAmbiance: lookbook }
                  : { ...prev, decorStyle: value as GenerationSettings['decorStyle'], customLookbookAmbiance: undefined });
              }}
              className="w-full rounded-xl border border-[#d8cdb9] bg-white px-3 py-3 text-sm text-yp-olive shadow-sm outline-none transition focus:border-[#c9473d] focus:bg-[#fff7f5]"
            >
              <optgroup label="Ambiances Studio">
                {DECOR_STYLES.map((decor) => <option key={decor.value} value={decor.value}>{decor.label} · {decor.sublabel}</option>)}
              </optgroup>
              {activeAmbiances.length > 0 && (
                <optgroup label="Mes ambiances de référence">
                  {activeAmbiances.map((lookbook) => <option key={lookbook.id} value={`lookbook:${lookbook.id}`}>♥ {lookbook.titre}</option>)}
                </optgroup>
              )}
            </select>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-yp-sable">
        {!settings.embroideryImage && (
          <p className="text-xs text-red-500 text-center mb-3 font-medium">
            <i className="fa-solid fa-circle-exclamation mr-1"></i>
            Veuillez importer une image de broderie (étape 1) pour générer le shooting.
          </p>
        )}
        <button
          disabled={!settings.embroideryImage || isLoading}
          onClick={onGenerate}
          className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-3 ${
            !settings.embroideryImage || isLoading
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-[#c9473d] hover:bg-[#ad382f] active:scale-95'
          }`}
        >
          {isLoading ? (
            <>
              <i className="fa-solid fa-circle-notch fa-spin"></i>
              Génération en cours...
            </>
          ) : (
            <>
              <i className="fa-solid fa-wand-magic-sparkles"></i>
              Générer le shooting
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
