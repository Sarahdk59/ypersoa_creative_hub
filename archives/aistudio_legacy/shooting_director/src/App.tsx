import { useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Settings, Download, Loader2, Image as ImageIcon, Users, Palette, Calendar, LayoutGrid, ChevronRight, Plus, X, Tag } from 'lucide-react';
import { generateShootingPlan, generateImage } from './services/gemini';
import { ShootingParams, ShootingPlan } from './types';

function BadgeInput({ items, onChange, placeholder }: { items: string[], onChange: (items: string[]) => void, placeholder: string }) {
  const [val, setVal] = useState('');
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
            {item}
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="hover:text-red-500"><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input 
          type="text" 
          value={val} 
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && val.trim()) {
              e.preventDefault();
              onChange([...items, val.trim()]);
              setVal('');
            }
          }}
          placeholder={placeholder}
          className="flex-1 text-sm px-3 py-1.5 rounded-md border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500"
        />
        <button 
          onClick={() => { if (val.trim()) { onChange([...items, val.trim()]); setVal(''); } }}
          className="p-1.5 bg-zinc-800 text-white rounded-md hover:bg-zinc-700"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<ShootingPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({});
  const [motifImages, setMotifImages] = useState<string[]>([]);
  const [motifSize, setMotifSize] = useState<string>("moyen (8 à 12cm)");

  const motifSizes = [
    "très petit (2 à 4cm)",
    "petit (4 à 6 cm)",
    "moyen (8 à 12cm)",
    "grand (plus de 20 cm)"
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setMotifImages(prev => [...prev, event.target!.result as string]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset
  };

  const handleGenerateImage = async (sceneId: string, prompt: string) => {
    setGeneratingImages(prev => ({ ...prev, [sceneId]: true }));
    setImageErrors(prev => ({ ...prev, [sceneId]: '' }));
    try {
      const motifContext = motifImages.length > 0 
        ? ` The clothing MUST feature the exact motif/design shown in the attached reference image(s). The motif should be applied at a size of: ${motifSize}. Apply it naturally as an embroidery or print.` 
        : ` The motif size on the clothing should be: ${motifSize}.`;
      const fullPrompt = `${prompt}${motifContext}, photorealistic, 8k, highly detailed, professional fashion photography, editorial style, shot on 35mm lens`;
      const imageUrl = await generateImage(fullPrompt, motifImages);
      setGeneratedImages(prev => ({ ...prev, [sceneId]: imageUrl }));
    } catch (err: any) {
      console.error("Erreur lors de la génération de l'image:", err);
      setImageErrors(prev => ({ ...prev, [sceneId]: err.message || "Erreur de génération" }));
    } finally {
      setGeneratingImages(prev => ({ ...prev, [sceneId]: false }));
    }
  };

  const [adultProducts, setAdultProducts] = useState<string[]>(['hoodie', 'sweat', 'zoodie', 't-shirt']);
  const [kidProducts, setKidProducts] = useState<string[]>(['hoodie', 'sweat', 'zoodie', 't-shirt']);
  const [colors, setColors] = useState<string[]>(['beige', 'cream', 'sage', 'forest', 'navy', 'black', 'sand', 'brown', 'terracotta', 'off white', 'grey', 'khaki']);
  const [motifsCount, setMotifsCount] = useState<number>(50);
  const [models, setModels] = useState<{role: string, profile: string}[]>([
    { role: 'femme adulte', profile: 'caucasienne, brune' },
    { role: 'femme adulte', profile: 'metisse, cheveux boucles' },
    { role: 'homme adulte', profile: 'noir, cheveux courts' },
    { role: 'homme adulte', profile: 'caucasien, barbe' },
    { role: 'fille', profile: 'caucasienne, blonde' },
    { role: 'garcon', profile: 'metis' }
  ]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateShootingPlan({
        adultProducts,
        kidProducts,
        colors,
        motifsCount,
        models
      });
      setPlan(result);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!plan) return;
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shooting-plan-${plan.collection_name.replace(/\\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-zinc-50 font-sans text-zinc-900 overflow-hidden">
      {/* Sidebar */}
      <div className="w-96 bg-white border-r border-zinc-200 flex flex-col h-full overflow-y-auto shrink-0">
        <div className="p-6 border-b border-zinc-200">
          <div className="flex items-center gap-2 mb-1">
            <Camera className="text-zinc-800" />
            <h1 className="text-xl font-semibold tracking-tight">Shooting Director</h1>
          </div>
          <p className="text-sm text-zinc-500">Générateur de plan de production</p>
        </div>

        <div className="p-6 space-y-8 flex-1">
          <section>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 uppercase tracking-wider text-zinc-500"><Tag size={16} /> Produits Adulte</h2>
            <BadgeInput items={adultProducts} onChange={setAdultProducts} placeholder="Ajouter produit..." />
          </section>

          <section>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 uppercase tracking-wider text-zinc-500"><Tag size={16} /> Produits Enfant</h2>
            <BadgeInput items={kidProducts} onChange={setKidProducts} placeholder="Ajouter produit..." />
          </section>

          <section>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 uppercase tracking-wider text-zinc-500"><Palette size={16} /> Couleurs (Max 12)</h2>
            <BadgeInput items={colors} onChange={setColors} placeholder="Ajouter couleur..." />
          </section>

          <section>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 uppercase tracking-wider text-zinc-500"><ImageIcon size={16} /> Motifs</h2>
            <div className="flex items-center gap-3 mb-4">
              <input 
                type="number" 
                value={motifsCount} 
                onChange={e => setMotifsCount(parseInt(e.target.value) || 0)}
                className="w-24 text-sm px-3 py-1.5 rounded-md border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
              <span className="text-sm text-zinc-500">motifs à shooter</span>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-2">Images de référence du motif (optionnel)</label>
              <div className="flex flex-wrap gap-2">
                {motifImages.map((img, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-zinc-200">
                    <img src={img} alt="Motif" className="w-full h-full object-cover" />
                    <button onClick={() => setMotifImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {motifImages.length < 2 && (
                  <label className="w-16 h-16 flex items-center justify-center rounded-md border border-dashed border-zinc-300 text-zinc-400 hover:text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 cursor-pointer transition-colors">
                    <Plus size={20} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                )}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 mb-4">Ces images seront utilisées par l'IA lors du shooting.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-2">Taille du motif sur le vêtement</label>
              <select 
                value={motifSize}
                onChange={e => setMotifSize(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-md border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500 bg-white"
              >
                {motifSizes.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 uppercase tracking-wider text-zinc-500"><Users size={16} /> Casting</h2>
            <div className="space-y-2">
              {models.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-zinc-50 p-2 rounded-md border border-zinc-100">
                  <span className="font-medium min-w-[100px]">{m.role}</span>
                  <span className="text-zinc-500 flex-1 truncate">{m.profile}</span>
                  <button onClick={() => setModels(models.filter((_, idx) => idx !== i))} className="text-zinc-400 hover:text-red-500"><X size={14} /></button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-zinc-200 bg-zinc-50">
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white py-2.5 rounded-lg font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Settings size={18} />}
            {loading ? 'Génération en cours...' : 'Générer le plan'}
          </button>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-zinc-100 p-8">
        {!plan && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400">
            <LayoutGrid size={48} className="mb-4 opacity-20" />
            <p>Configurez les paramètres et générez votre plan de shooting.</p>
          </div>
        )}

        {loading && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500">
            <Loader2 size={48} className="animate-spin mb-4 opacity-50" />
            <p>L'IA analyse vos contraintes et construit le plan...</p>
          </div>
        )}

        {plan && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto space-y-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{plan.collection_name}</h2>
                <p className="text-zinc-500 mt-1">Plan de production optimisé</p>
              </div>
              <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">
                <Download size={16} /> Exporter JSON
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Art Direction */}
              <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <h3 className="font-semibold flex items-center gap-2 mb-4"><Palette size={18} /> Direction Artistique</h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-zinc-500 text-xs uppercase tracking-wider">Mood</dt>
                    <dd className="font-medium mt-0.5">{plan.art_direction?.mood || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 text-xs uppercase tracking-wider">Décor</dt>
                    <dd className="font-medium mt-0.5">{plan.art_direction?.decor || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 text-xs uppercase tracking-wider">Lumière</dt>
                    <dd className="font-medium mt-0.5">{plan.art_direction?.light || 'N/A'}</dd>
                  </div>
                </dl>
              </div>

              {/* Strategy */}
              <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <h3 className="font-semibold flex items-center gap-2 mb-4"><LayoutGrid size={18} /> Stratégie Motifs & Couleurs</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5">Hero Colors ({plan.color_strategy?.hero_colors?.length || 0})</div>
                    <div className="flex flex-wrap gap-1">
                      {(plan.color_strategy?.hero_colors || []).map(c => <span key={c} className="px-2 py-0.5 bg-zinc-100 rounded text-xs">{c}</span>)}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5">Hero Motifs ({plan.motif_strategy?.hero_motifs?.length || 0})</div>
                    <div className="flex flex-wrap gap-1">
                      {(plan.motif_strategy?.hero_motifs || []).map(m => <span key={m} className="px-2 py-0.5 bg-zinc-100 rounded text-xs">{m}</span>)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Planning */}
              <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <h3 className="font-semibold flex items-center gap-2 mb-4"><Calendar size={18} /> Planning</h3>
                <div className="space-y-3">
                  {(plan.planning || []).map(day => (
                    <div key={day.day} className="flex gap-3 text-sm">
                      <div className="font-bold text-zinc-400">J{day.day}</div>
                      <div>
                        <div className="font-medium">{day.title}</div>
                        <div className="text-zinc-500 text-xs">{day.shots_count} shots</div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 mt-3 border-t border-zinc-100 font-medium text-sm">
                    Total: {plan.shotlist?.length || 0} shots
                  </div>
                </div>
              </div>
            </div>

            {/* Scenes Matrix */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-200">
                <h3 className="font-semibold flex items-center gap-2"><Camera size={18} /> Matrice des Scènes ({plan.scenes?.length || 0})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 font-medium">ID</th>
                      <th className="px-6 py-3 font-medium">Type</th>
                      <th className="px-6 py-3 font-medium">Interaction</th>
                      <th className="px-6 py-3 font-medium">Cadrage</th>
                      <th className="px-6 py-3 font-medium">Motifs Visibles</th>
                      <th className="px-6 py-3 font-medium">Livrables</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {(plan.scenes || []).map(scene => (
                      <tr key={scene.scene_id} className="hover:bg-zinc-50">
                        <td className="px-6 py-4 font-mono text-xs text-zinc-500">{scene.scene_id}</td>
                        <td className="px-6 py-4 font-medium capitalize">{scene.type?.replace('_', ' ')}</td>
                        <td className="px-6 py-4 text-zinc-600">{scene.required_interaction}</td>
                        <td className="px-6 py-4 text-zinc-600">{scene.framing}</td>
                        <td className="px-6 py-4 text-zinc-600">{scene.motifs_visible}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {(scene.deliverables || []).map(d => <span key={d} className="px-2 py-0.5 bg-zinc-100 rounded text-xs">{d}</span>)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed Shotlist */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-200">
                <h3 className="font-semibold flex items-center gap-2"><LayoutGrid size={18} /> Shotlist Détaillée ({plan.shotlist?.length || 0} shots)</h3>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="px-6 py-3 font-medium">Shot ID</th>
                      <th className="px-6 py-3 font-medium">Scene</th>
                      <th className="px-6 py-3 font-medium">Modèles</th>
                      <th className="px-6 py-3 font-medium">Produit</th>
                      <th className="px-6 py-3 font-medium">Couleur</th>
                      <th className="px-6 py-3 font-medium">Motif</th>
                      <th className="px-6 py-3 font-medium">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {(plan.shotlist || []).map(shot => (
                      <tr key={shot.shot_id} className="hover:bg-zinc-50">
                        <td className="px-6 py-3 font-mono text-xs text-zinc-500">{shot.shot_id}</td>
                        <td className="px-6 py-3 font-mono text-xs text-zinc-500">{shot.scene_id}</td>
                        <td className="px-6 py-3 text-zinc-600">{(shot.models || []).join(', ')}</td>
                        <td className="px-6 py-3 text-zinc-600">{shot.product}</td>
                        <td className="px-6 py-3 text-zinc-600">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full border border-zinc-300" style={{ backgroundColor: shot.color }}></span>
                            {shot.color}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-zinc-600">{shot.motif}</td>
                        <td className="px-6 py-3 text-zinc-600">{shot.shot_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Studio Photo (Génération d'Images) */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2"><ImageIcon size={18} /> Studio Photo (Génération d'Images)</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(plan.scenes || []).map(scene => (
                  <div key={scene.scene_id} className="bg-zinc-50 p-4 rounded-lg border border-zinc-100 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-500">{scene.scene_id}</span>
                        <span className="font-medium text-sm capitalize">{scene.type?.replace('_', ' ')}</span>
                      </div>
                      <button 
                        onClick={() => handleGenerateImage(scene.scene_id, scene.image_prompt)}
                        disabled={generatingImages[scene.scene_id]}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-md hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                      >
                        {generatingImages[scene.scene_id] ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                        {generatingImages[scene.scene_id] ? 'Shooting...' : 'Shooter'}
                      </button>
                    </div>
                    <p className="font-mono text-xs text-zinc-600 leading-relaxed mb-4 flex-1">{scene.image_prompt}</p>
                    
                    <div className="mt-auto pt-4 border-t border-zinc-200">
                      {imageErrors[scene.scene_id] && (
                        <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                          {imageErrors[scene.scene_id]}
                        </div>
                      )}
                      {generatedImages[scene.scene_id] ? (
                        <div className="relative aspect-[3/4] w-full rounded-md overflow-hidden bg-zinc-200 shadow-inner">
                          <img 
                            src={generatedImages[scene.scene_id]} 
                            alt={`Scene ${scene.scene_id}`} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[3/4] w-full rounded-md bg-zinc-100 border border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400">
                          <ImageIcon size={32} className="mb-2 opacity-20" />
                          <span className="text-xs font-medium">En attente du shooting</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </motion.div>
        )}
      </div>
    </div>
  );
}
