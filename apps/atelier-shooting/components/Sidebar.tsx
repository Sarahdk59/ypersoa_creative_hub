
import React, { useRef } from 'react';
import { GenerationSettings, ProductType, EmbroiderySize } from '../types';
import { PRODUCTS, SIZES, ASPECT_RATIOS, ETHNICITIES, AGES, BODY_TYPES, DISABILITIES, THREAD_COLORS, GARMENT_COLORS } from '../constants';

interface SidebarProps {
  settings: GenerationSettings;
  setSettings: React.Dispatch<React.SetStateAction<GenerationSettings>>;
  onGenerate: () => void;
  isLoading: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ settings, setSettings, onGenerate, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <aside className="w-full lg:w-96 bg-white border-r border-yp-sable h-full p-8 flex flex-col overflow-y-auto">
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-yp-olive mb-2">Configuration</h2>
        <p className="text-sm text-slate-500">Créez votre shooting Ypersoa sur-mesure.</p>
      </div>

      <div className="space-y-8 flex-grow">
        {/* Step 1: Upload */}
        <section>
          <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
            1. Broderie (PNG)
          </label>
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
                <p className="text-sm text-slate-500">Cliquez pour importer votre fichier PNG</p>
              </div>
            )}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/png" 
              onChange={handleFileChange} 
              className="hidden" 
            />
          </div>
        </section>

        {/* Step 2: Product */}
        <section>
          <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
            2. Produit
          </label>
          <div className="grid grid-cols-1 gap-2">
            {PRODUCTS.map(p => (
              <button
                key={p}
                onClick={() => setSettings(prev => ({ ...prev, product: p }))}
                className={`text-left px-4 py-3 rounded-lg text-sm transition-all border ${
                  settings.product === p 
                    ? 'bg-yp-olive text-white border-yp-olive shadow-md' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-yp-sable'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </section>

        {/* Step 3: Size */}
        <section>
          <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
            3. Taille de la broderie
          </label>
          <div className="flex flex-wrap gap-2">
            {SIZES.map(s => (
              <button
                key={s}
                onClick={() => setSettings(prev => ({ ...prev, size: s }))}
                className={`w-12 h-12 flex items-center justify-center rounded-full text-xs font-bold transition-all border ${
                  settings.size === s 
                    ? 'bg-yp-sable text-yp-olive border-yp-sable shadow-inner' 
                    : 'bg-white text-slate-400 border-slate-200 hover:border-yp-sable'
                }`}
              >
                {s}<span className="text-[8px] ml-0.5">cm</span>
              </button>
            ))}
          </div>
        </section>

        {/* Step 4: Colors */}
        <section>
          <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
            4. Couleurs
          </label>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-yp-olive uppercase mb-3">Couleur du fil</label>
              <div className="flex flex-wrap gap-3">
                {THREAD_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setSettings(prev => ({ ...prev, threadColor: color.value }))}
                    title={color.label}
                    className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                      settings.threadColor === color.value 
                        ? 'border-yp-olive scale-110 shadow-md' 
                        : 'border-transparent hover:scale-105 shadow-sm'
                    } ${color.value === '' ? 'bg-slate-100' : ''}`}
                    style={color.value !== '' ? { backgroundColor: color.hex } : {
                      background: 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)',
                      backgroundSize: '8px 8px',
                      backgroundPosition: '0 0, 4px 4px',
                      backgroundColor: '#fff'
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 text-xs text-slate-500 italic">
                {THREAD_COLORS.find(c => c.value === settings.threadColor)?.label || settings.threadColor}
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-yp-olive uppercase mb-3">Couleur du vêtement</label>
              <div className="flex flex-wrap gap-3">
                {GARMENT_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setSettings(prev => ({ ...prev, garmentColor: color.value }))}
                    title={color.label}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      settings.garmentColor === color.value 
                        ? 'border-yp-olive scale-110 shadow-md' 
                        : 'border-transparent hover:scale-105 shadow-sm'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  />
                ))}
              </div>
              <div className="mt-2 text-xs text-slate-500 italic">
                {GARMENT_COLORS.find(c => c.value === settings.garmentColor)?.label || settings.garmentColor}
              </div>
            </div>
          </div>
        </section>

        {/* Step 5: Format */}
        <section>
          <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
            5. Format d'image
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ASPECT_RATIOS.map(ar => (
              <button
                key={ar.value}
                onClick={() => setSettings(prev => ({ ...prev, aspectRatio: ar.value }))}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all ${
                  settings.aspectRatio === ar.value 
                    ? 'bg-yp-olive text-white border-yp-olive shadow-md' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-yp-sable'
                }`}
              >
                <i className={`fa-solid ${ar.icon} w-4`}></i>
                <span className="truncate">{ar.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Step 6: Mode */}
        <section>
          <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
            6. Type de prise de vue
          </label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setSettings(prev => ({ ...prev, mode: 'mannequin' }))}
              className={`py-3 rounded-lg text-[10px] flex flex-col items-center justify-center gap-1 border transition-all ${
                settings.mode === 'mannequin'
                  ? 'bg-yp-linen border-yp-sable text-yp-olive font-semibold' 
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <i className="fa-solid fa-user text-base"></i> Mannequin
            </button>
            <button
              onClick={() => setSettings(prev => ({ ...prev, mode: 'family' }))}
              className={`py-3 rounded-lg text-[10px] flex flex-col items-center justify-center gap-1 border transition-all ${
                settings.mode === 'family'
                  ? 'bg-yp-linen border-yp-sable text-yp-olive font-semibold' 
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <i className="fa-solid fa-people-group text-base"></i> Famille
            </button>
            <button
              onClick={() => setSettings(prev => ({ ...prev, mode: 'packshot' }))}
              className={`py-3 rounded-lg text-[10px] flex flex-col items-center justify-center gap-1 border transition-all ${
                settings.mode === 'packshot'
                  ? 'bg-yp-linen border-yp-sable text-yp-olive font-semibold' 
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <i className="fa-solid fa-shirt text-base"></i> Packshot
            </button>
            <button
              onClick={() => setSettings(prev => ({ ...prev, mode: 'full' }))}
              className={`py-3 rounded-lg text-[10px] flex flex-col items-center justify-center gap-1 border transition-all ${
                settings.mode === 'full'
                  ? 'bg-yp-linen border-yp-sable text-yp-olive font-semibold' 
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <i className="fa-solid fa-layer-group text-base"></i> Pack Complet (6)
            </button>
          </div>

          {/* Mannequin Diversity Options */}
          {settings.mode === 'mannequin' && (
            <div className="space-y-4 p-4 bg-yp-linen/50 rounded-xl border border-yp-sable/30 animate-in fade-in slide-in-from-top-2">
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
            </div>
          )}

          {/* Family Options */}
          {settings.mode === 'family' && (
            <div className="space-y-4 p-4 bg-yp-linen/50 rounded-xl border border-yp-sable/30 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-[10px] font-bold text-yp-olive uppercase mb-2">Composition du couple</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'random', label: 'Aléatoire' },
                    { id: 'maman-papa', label: 'Maman / Papa' },
                    { id: 'papa-papa', label: 'Papa / Papa' },
                    { id: 'maman-maman', label: 'Maman / Maman' },
                    { id: 'maman-mamie', label: 'Maman / Mamie' },
                    { id: 'papi-papa', label: 'Papi / Papa' },
                    { id: 'papa-mamie', label: 'Papa / Mamie' }
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSettings(prev => ({ 
                        ...prev, 
                        familyConfig: { ...prev.familyConfig, coupleType: c.id as any } 
                      }))}
                      className={`py-1.5 rounded-md text-[10px] border transition-all ${
                        settings.familyConfig.coupleType === c.id 
                          ? 'bg-yp-olive text-white border-yp-olive' 
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-yp-olive uppercase mb-2">Nombre d'enfants</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(n => (
                    <button
                      key={n}
                      onClick={() => setSettings(prev => ({ 
                        ...prev, 
                        familyConfig: { ...prev.familyConfig, childrenCount: n } 
                      }))}
                      className={`flex-1 py-1.5 rounded-md text-[10px] border transition-all ${
                        settings.familyConfig.childrenCount === n 
                          ? 'bg-yp-olive text-white border-yp-olive' 
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* Full Pack Options */}
          {settings.mode === 'full' && (
            <div className="space-y-4 p-4 bg-yp-linen/50 rounded-xl border border-yp-sable/30 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-[10px] font-bold text-yp-olive uppercase mb-2">Style du Pack</label>
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'minimalist', label: 'Minimaliste (Studio A.P.C.)' },
                    { id: 'parisien', label: 'Premium Parisien (Sézane x Labiche)' },
                    { id: 'loft', label: 'Loft Brut & Serre Botanique' }
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSettings(prev => ({ ...prev, fullPackStyle: s.id as any }))}
                      className={`py-2 px-3 rounded-md text-xs border transition-all text-left ${
                        settings.fullPackStyle === s.id
                          ? 'bg-yp-olive text-white border-yp-olive'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-yp-sable'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
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
              : 'bg-yp-olive hover:bg-[#4a503d] active:scale-95'
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
