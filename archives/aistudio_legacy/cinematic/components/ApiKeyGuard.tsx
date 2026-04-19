
import React, { useState, useEffect } from 'react';

interface ApiKeyGuardProps {
  onKeyReady: () => void;
}

const ApiKeyGuard: React.FC<ApiKeyGuardProps> = ({ onKeyReady }) => {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio?.hasSelectedApiKey) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (hasKey) {
          onKeyReady();
        }
      }
      setChecking(false);
    };
    checkKey();
  }, [onKeyReady]);

  const handleSelectKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      // Assume success as per instructions to avoid race conditions
      onKeyReady();
    }
  };

  if (checking) return null;

  return (
    <div className="fixed inset-0 bg-[#f7f3f0] flex items-center justify-center p-6 z-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-[#A3AD85]/20 text-center">
        <h2 className="text-3xl font-bold text-[#4a4a4a] mb-4 serif">Ypersoa Cinematic</h2>
        <p className="text-[#6b6b6b] mb-8 leading-relaxed">
          Pour utiliser la technologie de génération vidéo Veo, vous devez sélectionner une clé API valide issue d'un projet GCP avec facturation activée.
        </p>
        <button
          onClick={handleSelectKey}
          className="w-full py-4 px-6 bg-[#A3AD85] text-white rounded-xl font-medium hover:bg-[#8f9a72] transition-colors shadow-lg mb-4"
        >
          Sélectionner ma clé API
        </button>
        <p className="text-xs text-gray-400">
          En savoir plus sur la <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline hover:text-[#A3AD85]">facturation de l'API Gemini</a>.
        </p>
      </div>
    </div>
  );
};

export default ApiKeyGuard;
