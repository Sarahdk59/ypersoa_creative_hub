
import React, { useState, useEffect } from 'react';
import { GenerationSettings, GeneratedImagePack } from './types';
import Sidebar from './components/Sidebar';
import { generateYpersoaPack } from './services/geminiService';
import { SHOTS_CONFIG } from './constants';

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<GenerationSettings>({
    product: 'JH001 Hoodie cordons ronds sans embout',
    size: 4,
    embroideryImage: null,
    mode: 'mannequin',
    familyConfig: {
      coupleType: 'random',
      childrenCount: 1
    },
    aspectRatio: '4:5',
    diversity: {
      ethnicity: 'diverse',
      age: 'diverse',
      bodyType: 'diverse',
      disability: 'none'
    },
    threadColor: '',
    garmentColor: 'blanc',
    fullPackStyle: 'parisien'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<GeneratedImagePack[]>([]);
  const [currentPack, setCurrentPack] = useState<string[] | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Standalone check : la clé est lue depuis VITE_GEMINI_API_KEY (apps/atelier-shooting/.env.local)
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    setHasApiKey(Boolean(apiKey));
  }, []);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setSelectedImageIndex(0);
    try {
      const result = await generateYpersoaPack(settings);
      setCurrentPack(result.urls);
      
      const newPack: GeneratedImagePack = {
        id: Math.random().toString(36).substr(2, 9),
        urls: result.urls,
        labels: result.labels,
        timestamp: Date.now(),
        settings: { ...settings }
      };
      setHistory(prev => [newPack, ...prev]);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setError("La clé API sélectionnée n'est pas valide ou n'a pas accès au modèle. Veuillez sélectionner une clé valide.");
      } else {
        setError(err.message || "Une erreur est survenue lors de la génération de la collection.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (dataUrl: string, filename: string) => {
    if (dataUrl.startsWith('data:image/png')) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.click();
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = filename;
        link.click();
      }
    };
    img.src = dataUrl;
  };

  // Find the current pack in history to get its labels, or fallback to default
  const currentHistoryPack = history.find(p => p.urls === currentPack);
  const shotLabels = currentHistoryPack?.labels || Object.values(SHOTS_CONFIG).map(s => s.label);

  if (hasApiKey === false) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-yp-linen p-8">
        <div className="bg-white p-12 rounded-3xl shadow-2xl max-w-lg text-center border border-yp-sable/20">
          <div className="w-16 h-16 bg-yp-olive rounded-full flex items-center justify-center text-white font-bold italic shadow-lg mx-auto mb-6 text-2xl">Y</div>
          <h1 className="text-3xl font-bold tracking-tight text-yp-olive mb-4">Clé API Gemini requise</h1>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Pour générer les shootings, configure ta clé Gemini dans le fichier <code className="bg-yp-linen px-2 py-1 rounded text-yp-olive font-mono text-sm">apps/atelier-shooting/.env.local</code> :
          </p>
          <pre className="bg-yp-linen text-yp-olive font-mono text-xs text-left p-4 rounded-xl mb-6 overflow-x-auto">
{`VITE_GEMINI_API_KEY=ta-clé-gemini-ici`}
          </pre>
          <p className="text-gray-500 text-sm leading-relaxed">
            Tu peux récupérer une clé sur <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-yp-olive underline">Google AI Studio</a>.<br/>
            Après création du fichier, redémarre le serveur de dev.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
      <Sidebar 
        settings={settings} 
        setSettings={setSettings} 
        onGenerate={handleGenerate} 
        isLoading={isLoading} 
      />

      <main className="flex-1 h-full overflow-y-auto bg-yp-linen flex flex-col">
        <header className="px-8 py-6 flex justify-between items-center border-b border-yp-sable bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-yp-olive rounded-full flex items-center justify-center text-white font-bold italic shadow-lg">Y</div>
            <h1 className="text-3xl font-bold tracking-tight text-yp-olive">YPERSOA <span className="text-sm font-light uppercase tracking-[0.3em] ml-2">Studio</span></h1>
          </div>
          <div className="flex gap-3">
             <div className="bg-yp-sable/30 px-4 py-2 rounded-full text-xs font-semibold text-yp-olive border border-yp-sable/50">
                Ultra-Réalisme HD (x4)
             </div>
          </div>
        </header>

        <div className="p-8 lg:p-12 flex-grow flex flex-col items-center">
          {error && (
            <div className="w-full max-w-5xl mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <p>{error}</p>
            </div>
          )}

          <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8">
            {/* Main Preview */}
            <div className="flex-1 aspect-[3/4] bg-white rounded-3xl shadow-2xl overflow-hidden relative group border border-yp-sable/20">
              {currentPack ? (
                <>
                  <img 
                    src={currentPack[selectedImageIndex]} 
                    alt="Ypersoa Preview" 
                    className="w-full h-full object-cover transition-all duration-700" 
                  />
                  <div className="absolute top-6 left-6 bg-white/90 backdrop-blur px-4 py-2 rounded-full text-xs font-bold text-yp-olive shadow-sm border border-yp-sable">
                    {shotLabels[selectedImageIndex]}
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button 
                      onClick={() => handleDownload(currentPack[selectedImageIndex], `ypersoa-${shotLabels[selectedImageIndex].toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`)}
                      className="bg-white text-yp-olive px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2 hover:scale-105 transition-transform"
                    >
                      <i className="fa-solid fa-download"></i> Télécharger cette vue
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-12 text-center">
                  {isLoading ? (
                    <div className="flex flex-col items-center">
                      <div className="relative w-28 h-28 mb-8">
                        <div className="absolute inset-0 border-4 border-yp-sable rounded-full opacity-20 animate-pulse"></div>
                        <div className="absolute inset-0 border-4 border-t-yp-olive rounded-full animate-spin"></div>
                        <i className={`fa-solid ${settings.mode === 'family' ? 'fa-people-roof' : 'fa-camera-retro'} absolute inset-0 flex items-center justify-center text-3xl text-yp-olive`}></i>
                      </div>
                      <h3 className="text-2xl font-bold text-yp-olive mb-3 italic">
                        {settings.mode === 'family' ? 'Mise en scène de la famille...' : 'Développement du pack réaliste...'}
                      </h3>
                      <p className="max-w-sm text-sm leading-relaxed text-slate-500">
                        {settings.mode === 'family' 
                          ? 'Capture des émotions et de la complicité familiale dans un décor botanique authentique.'
                          : 'Traitement des textures de peau, des grains de rousseurs et de la lumière naturelle pour un rendu 100% humain.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="w-24 h-24 bg-yp-linen rounded-full flex items-center justify-center mb-8 shadow-inner">
                        <i className="fa-solid fa-images text-4xl text-yp-sable"></i>
                      </div>
                      <h3 className="text-3xl font-bold text-yp-olive mb-4">Shooting Ultra-Réaliste</h3>
                      <p className="max-w-md text-slate-500 mb-8 leading-relaxed">
                        Générez 4 visuels premium sans compromis : textures de peau authentiques, grain textile précis et lumière dorée.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Thumbnail Strip / Selection */}
            <div className={`w-full lg:w-48 flex flex-row lg:flex-col gap-4 ${currentPack && currentPack.length > 4 ? 'overflow-x-auto lg:overflow-y-auto' : ''}`}>
              {currentPack ? (
                currentPack.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`flex-1 min-w-[100px] lg:min-h-[120px] aspect-[3/4] lg:flex-none rounded-2xl overflow-hidden border-4 transition-all relative ${
                      selectedImageIndex === idx ? 'border-yp-olive shadow-lg scale-105' : 'border-white/50 hover:border-yp-sable shadow-sm'
                    }`}
                  >
                    <img src={url} alt={`View ${idx}`} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/40 py-1 px-2">
                       <p className="text-[8px] text-white font-bold uppercase tracking-tighter text-center truncate">
                         {shotLabels[idx]}
                       </p>
                    </div>
                  </button>
                ))
              ) : (
                Array.from({ length: settings.mode === 'full' ? 6 : 4 }).map((_, i) => (
                  <div key={i} className="flex-1 min-w-[100px] lg:min-h-[120px] aspect-[3/4] lg:flex-none bg-white/50 rounded-2xl border-2 border-dashed border-yp-sable/30 animate-pulse" />
                ))
              )}
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="w-full max-w-5xl mt-20 pb-16">
              <div className="flex justify-between items-end mb-10 border-b border-yp-sable pb-6">
                <div>
                   <h3 className="text-3xl font-bold text-yp-olive">Précédentes Collections</h3>
                   <p className="text-sm text-slate-400 mt-1">Vos dernières séries de shooting Ypersoa</p>
                </div>
              </div>
              <div className="space-y-12">
                {history.map((pack) => (
                  <div key={pack.id} className="group">
                    <div className="flex justify-between items-center mb-4">
                       <span className="text-xs font-bold text-yp-olive/60 uppercase tracking-widest">
                         {pack.settings.product} — {new Date(pack.timestamp).toLocaleTimeString()}
                       </span>
                       <button 
                         onClick={() => { setCurrentPack(pack.urls); setSelectedImageIndex(0); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                         className="text-xs font-bold text-yp-olive hover:underline"
                       >
                         Restaurer cette collection
                       </button>
                    </div>
                    <div className={`grid gap-4 ${pack.urls.length > 4 ? 'grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 lg:grid-cols-4'}`}>
                      {pack.urls.map((url, idx) => (
                        <div key={idx} className="aspect-[3/4] rounded-xl overflow-hidden shadow-md group-hover:shadow-xl transition-all">
                          <img src={url} alt="History item" className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
