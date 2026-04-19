
import React, { useState, useEffect, useRef } from 'react';
import { generateYpersoaVideo, generateVoiceOver, generateMusic, fileToBase64 } from '../services/geminiService';
import { VideoGenerationStatus, AspectRatio } from '../types';

const BASE_STUDIO_PROMPT = "Hyper-realistic edge-to-edge full screen video, NO black borders. Dynamic moving camera, POV perspective. Extreme macro zoom on high-quality personalized embroidery threads. A professional fashion photo studio setup inside a Victorian greenhouse. Natural soft daylight filtering through large industrial steel-framed glass roof panels. Lush tropical green foliage — monstera, ferns, orchids — filling the background. One concrete or raw plaster wall on the side as a neutral anchor. Warm golden ambient light, no harsh shadows, slight bokeh on background plants. Clean cement floor. Editorial, timeless, organic mood. Shot on medium format camera.";

const AMBIANCES = [
  { id: 'default', label: 'Studio Serre (Défaut)', addition: '' },
  { id: 'atelier', label: 'Atelier Botanique', addition: 'wooden workbench with terracotta pots, dried botanical prints on floor, warm window backlight.' },
  { id: 'beton', label: 'Mur Béton Éditorial', addition: 'textured raw concrete wall, muted tones, no plants in foreground, clean minimalist.' },
  { id: 'floral', label: 'Floral Serré', addition: 'close crop, blurred peonies and delphiniums in background, pink and blue tones, dreamy.' }
];

const PRESET_VOICE = "L'émotion dans chaque détail. Une broderie unique, d'une qualité exceptionnelle, pensée juste pour vous.";
const PRESET_MUSIC = "Dynamic and upbeat modern indie pop, premium lifestyle aesthetic, driving acoustic guitar with an energetic but elegant rhythm, inspiring, emotional, trendy Instagram reel vibe, chic and engaging.";

const VideoGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState(BASE_STUDIO_PROMPT);
  const [activeAmbiance, setActiveAmbiance] = useState('default');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.PORTRAIT);
  const [status, setStatus] = useState<VideoGenerationStatus>({ isGenerating: false, progressMessage: '' });
  const [voiceOverUrl, setVoiceOverUrl] = useState<string | null>(null);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const voiceRef = useRef<HTMLAudioElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);

  const handleAmbianceChange = (ambianceId: string) => {
    setActiveAmbiance(ambianceId);
    const selected = AMBIANCES.find(a => a.id === ambianceId);
    if (selected) {
      setPrompt(`${BASE_STUDIO_PROMPT} ${selected.addition}`.trim());
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newFiles = [...imageFiles, ...files].slice(0, 3);
      setImageFiles(newFiles);

      const newPreviews = [...imagePreviews];
      files.forEach(file => {
        if (newPreviews.length < 3) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setImagePreviews(prev => {
              const updated = [...prev, reader.result as string];
              return updated.slice(0, 3);
            });
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    setStatus({ isGenerating: true, progressMessage: 'Préparation du tournage...' });
    setVoiceOverUrl(null);
    setMusicUrl(null);

    try {
      const imagesPayload = await Promise.all(imageFiles.map(async (file) => ({
        data: await fileToBase64(file),
        mimeType: file.type
      })));

      // 1. Generate Voice Over in parallel
      const voicePromise = generateVoiceOver(PRESET_VOICE).catch(e => {
        console.error("Voice over failed", e);
        return null;
      });

      // 2. Generate Music in parallel
      const musicPromise = generateMusic(PRESET_MUSIC).catch(e => {
        console.error("Music generation failed", e);
        return null;
      });

      // 3. Generate Video with dynamic MIME type
      const videoUrl = await generateYpersoaVideo(
        prompt,
        imagesPayload.length > 0 ? imagesPayload : undefined,
        aspectRatio,
        (msg) => setStatus(prev => ({ ...prev, progressMessage: msg }))
      );

      const [generatedVoiceUrl, generatedMusicUrl] = await Promise.all([voicePromise, musicPromise]);
      
      if (generatedVoiceUrl) setVoiceOverUrl(generatedVoiceUrl);
      if (generatedMusicUrl) setMusicUrl(generatedMusicUrl);

      setStatus({ isGenerating: false, progressMessage: '', videoUrl });
    } catch (error: any) {
      console.error(error);
      setStatus({ 
        isGenerating: false, 
        progressMessage: '', 
        error: error.message || "Une erreur est survenue lors de la création." 
      });
    }
  };

  const handleNewTake = async () => {
    if (!prompt) return;
    setStatus({ isGenerating: true, progressMessage: 'Création d\'une nouvelle prise vidéo...' });

    try {
      const imagesPayload = await Promise.all(imageFiles.map(async (file) => ({
        data: await fileToBase64(file),
        mimeType: file.type
      })));

      const videoUrl = await generateYpersoaVideo(
        prompt,
        imagesPayload.length > 0 ? imagesPayload : undefined,
        aspectRatio,
        (msg) => setStatus(prev => ({ ...prev, progressMessage: msg }))
      );

      setStatus({ isGenerating: false, progressMessage: '', videoUrl });
    } catch (error: any) {
      console.error(error);
      setStatus({ 
        isGenerating: false, 
        progressMessage: '', 
        error: error.message || "Une erreur est survenue lors de la création de la nouvelle prise." 
      });
    }
  };

  const reset = () => {
    setStatus({ isGenerating: false, progressMessage: '' });
    setImageFiles([]);
    setImagePreviews([]);
    setVoiceOverUrl(null);
    setMusicUrl(null);
  };

  const syncAudio = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    if (voiceRef.current && Math.abs(voiceRef.current.currentTime - time) > 0.5) {
      voiceRef.current.currentTime = time;
    }
    if (musicRef.current && Math.abs(musicRef.current.currentTime - time) > 0.5) {
      musicRef.current.currentTime = time;
    }
  };

  const handlePlay = () => {
    syncAudio();
    voiceRef.current?.play().catch(() => console.log("Audio autoplay prevented"));
    musicRef.current?.play().catch(() => console.log("Audio autoplay prevented"));
  };

  const handlePause = () => {
    voiceRef.current?.pause();
    musicRef.current?.pause();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-[#4a4a4a] uppercase tracking-wider block">Ambiance</label>
        <div className="flex flex-wrap gap-2">
          {AMBIANCES.map((ambiance) => (
            <button
              key={ambiance.id}
              onClick={() => handleAmbianceChange(ambiance.id)}
              disabled={status.isGenerating}
              className={`py-1.5 px-3 rounded-full text-xs font-medium transition-all ${
                activeAmbiance === ambiance.id
                  ? 'bg-[#A3AD85] text-white shadow-md'
                  : 'bg-white text-[#6b6b6b] border border-[#A3AD85]/30 hover:border-[#A3AD85]'
              }`}
            >
              {ambiance.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-[#4a4a4a] uppercase tracking-wider block">Description de la scène</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={status.isGenerating}
          rows={4}
          className="w-full p-4 bg-[#fcfbf9] border border-[#A3AD85]/20 rounded-xl focus:ring-2 focus:ring-[#A3AD85]/50 outline-none resize-none text-[#6b6b6b] leading-relaxed transition-all"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[#4a4a4a] uppercase tracking-wider block">
            Motifs / Packshots (Max 3)
          </label>
          <div className="text-[10px] text-red-500/80 font-medium leading-tight mb-2">
            ⚠️ <strong>Important :</strong> Les filtres de Google bloquent strictement toute image contenant des visages ou silhouettes d'enfants (même générées par IA). Privilégiez les adultes ou les objets.
          </div>
          <div className="grid grid-cols-3 gap-2 h-32">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="h-full relative overflow-hidden rounded-xl border border-[#A3AD85]">
                <img src={preview} className="h-full w-full object-cover" alt={`Preview ${index + 1}`} />
                <button 
                  onClick={() => removeImage(index)}
                  disabled={status.isGenerating}
                  className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-black transition-colors"
                  title="Supprimer l'image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            
            {imagePreviews.length < 3 && (
              <div className="relative group h-full col-span-1">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  disabled={status.isGenerating}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="h-full border-2 border-dashed border-[#A3AD85]/30 rounded-xl flex flex-col items-center justify-center transition-all group-hover:border-[#A3AD85] group-hover:bg-[#A3AD85]/5">
                  <span className="text-xl mb-1">📸</span>
                  <span className="text-[9px] text-[#A3AD85] font-bold uppercase tracking-widest text-center px-1">Ajouter</span>
                </div>
              </div>
            )}
            
            {/* Fill empty spaces if needed to keep layout consistent */}
            {Array.from({ length: Math.max(0, 2 - imagePreviews.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="h-full border-2 border-dashed border-transparent rounded-xl"></div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-[#4a4a4a] uppercase tracking-wider block">Format</label>
          <div className="flex gap-2 h-32 flex-col">
            <button
              onClick={() => setAspectRatio(AspectRatio.LANDSCAPE)}
              disabled={status.isGenerating}
              className={`flex-1 py-2 px-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${aspectRatio === AspectRatio.LANDSCAPE ? 'bg-[#4a4a4a] text-white border-[#4a4a4a]' : 'bg-white text-[#6b6b6b] border-[#A3AD85]/20 hover:border-[#A3AD85]'}`}
            >
              Banner Hero (16:9)
            </button>
            <button
              onClick={() => setAspectRatio(AspectRatio.PORTRAIT)}
              disabled={status.isGenerating}
              className={`flex-1 py-2 px-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${aspectRatio === AspectRatio.PORTRAIT ? 'bg-[#4a4a4a] text-white border-[#4a4a4a]' : 'bg-white text-[#6b6b6b] border-[#A3AD85]/20 hover:border-[#A3AD85]'}`}
            >
              Mobile (9:16)
            </button>
          </div>
        </div>
      </div>

      {!status.videoUrl && (
        <button
          onClick={handleGenerate}
          disabled={status.isGenerating}
          className={`w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-sm shadow-xl transition-all relative overflow-hidden ${status.isGenerating ? 'bg-[#E2D1B3] text-[#4a4a4a] cursor-not-allowed' : 'bg-[#A3AD85] text-white hover:bg-[#8f9a72]'}`}
        >
          {status.isGenerating ? (
            <div className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5 text-[#4a4a4a]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{status.progressMessage}</span>
            </div>
          ) : (
            "Générer la vidéo Ypersoa"
          )}
        </button>
      )}

      {status.error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 animate-shake text-center">
          {status.error}
        </div>
      )}

      {status.videoUrl && (
        <div className="space-y-6 animate-in zoom-in duration-500">
          <div className="text-sm text-[#A3AD85] text-center font-medium bg-[#A3AD85]/10 py-2 rounded-xl">
            ✨ Les pistes audio sont synchronisées. Lancez la vidéo pour écouter l'ensemble.
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-black aspect-video relative">
            <video
              ref={videoRef}
              src={status.videoUrl}
              controls
              autoPlay
              onPlay={handlePlay}
              onPause={handlePause}
              onSeeked={syncAudio}
              onWaiting={handlePause}
              onPlaying={handlePlay}
              className="w-full h-full object-contain"
            />
          </div>
          
          {voiceOverUrl && (
            <div className="p-4 bg-[#f7f3f0] rounded-xl flex items-center justify-between border border-[#A3AD85]/30">
              <div className="flex items-center gap-3">
                <span className="text-xl">🎙️</span>
                <span className="text-sm font-medium text-[#4a4a4a]">Voix off : "{PRESET_VOICE}"</span>
              </div>
              <div className="flex items-center gap-2">
                <audio ref={voiceRef} src={voiceOverUrl} controls className="h-8 w-48" />
                <a
                  href={voiceOverUrl}
                  download="ypersoa-voix-off.wav"
                  className="p-1.5 bg-[#A3AD85]/10 text-[#A3AD85] hover:bg-[#A3AD85] hover:text-white rounded-lg transition-colors flex-shrink-0"
                  title="Télécharger la voix off"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              </div>
            </div>
          )}

          {musicUrl && (
            <div className="p-4 bg-[#f7f3f0] rounded-xl flex items-center justify-between border border-[#A3AD85]/30">
              <div className="flex items-center gap-3">
                <span className="text-xl">🎵</span>
                <span className="text-sm font-medium text-[#4a4a4a]">Musique d'ambiance</span>
              </div>
              <div className="flex items-center gap-2">
                <audio ref={musicRef} src={musicUrl} controls loop className="h-8 w-48" />
                <a
                  href={musicUrl}
                  download="ypersoa-musique-ambiance.wav"
                  className="p-1.5 bg-[#A3AD85]/10 text-[#A3AD85] hover:bg-[#A3AD85] hover:text-white rounded-lg transition-colors flex-shrink-0"
                  title="Télécharger la musique"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <a
              href={status.videoUrl}
              download="ypersoa_cinematic.mp4"
              className="flex-1 py-4 bg-[#4a4a4a] text-white rounded-xl font-bold uppercase tracking-widest text-xs text-center hover:bg-black transition-colors shadow-lg"
            >
              Télécharger
            </a>
            <button
              onClick={handleNewTake}
              disabled={status.isGenerating}
              className="flex-1 py-4 bg-[#A3AD85] text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#8f9a72] transition-colors shadow-lg disabled:opacity-50"
            >
              🎬 Nouvelle Prise
            </button>
            <button
              onClick={reset}
              className="flex-1 py-4 border border-[#A3AD85]/50 text-[#A3AD85] rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#A3AD85]/5 transition-colors"
            >
              Nouveau Projet
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGenerator;
