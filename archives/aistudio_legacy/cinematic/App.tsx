
import React, { useState } from 'react';
import Header from './components/Header';
import ApiKeyGuard from './components/ApiKeyGuard';
import VideoGenerator from './components/VideoGenerator';

const App: React.FC = () => {
  const [isKeyReady, setIsKeyReady] = useState(false);

  return (
    <div className="min-h-screen flex flex-col selection:bg-[#A3AD85]/30">
      {!isKeyReady && <ApiKeyGuard onKeyReady={() => setIsKeyReady(true)} />}
      
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-8 animate-in fade-in slide-in-from-left duration-1000">
            <div>
              <h2 className="text-5xl md:text-6xl text-[#4a4a4a] serif mb-6 leading-tight">
                Immergez votre audience dans <span className="italic text-[#A3AD85]">l'univers de votre marque.</span>
              </h2>
              <p className="text-lg text-[#6b6b6b] max-w-lg leading-relaxed font-light">
                Créez des vidéos émotionnelles au rendu premium (façon Maison Labiche, Sézane, A.P.C.). Broderies Tajima, scènes lifestyle, cadeaux et packshots.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="aspect-square rounded-2xl bg-[#E2D1B3]/30 overflow-hidden">
                <img src="https://picsum.photos/400/400?random=1" className="w-full h-full object-cover mix-blend-multiply opacity-80" alt="Inspiration 1" />
              </div>
              <div className="aspect-square rounded-2xl bg-[#A3AD85]/30 overflow-hidden">
                <img src="https://picsum.photos/400/400?random=2" className="w-full h-full object-cover mix-blend-multiply opacity-80" alt="Inspiration 2" />
              </div>
              <div className="aspect-square rounded-2xl bg-[#D2B48C]/30 overflow-hidden">
                <img src="https://picsum.photos/400/400?random=3" className="w-full h-full object-cover mix-blend-multiply opacity-80" alt="Inspiration 3" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-8 shadow-2xl border border-[#A3AD85]/10 sticky top-8">
            <VideoGenerator />
          </div>
        </div>
      </main>

      <footer className="py-12 border-t border-[#A3AD85]/20 text-center text-sm text-[#9b9b9b] font-light">
        <p>&copy; 2024 YPERSOA - Tous droits réservés. Studio Cinématique Expérimental.</p>
      </footer>
    </div>
  );
};

export default App;
