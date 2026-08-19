"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Upload, X, Image as ImageIcon, Type, Sparkles } from "lucide-react";
import {
  FORMATS,
  BG_PRESETS,
  COLLAGE_FONDS,
  LABEL_SHAPES,
  LABEL_COLORS,
  PROPS,
  QuatrefoilSVG,
  drawCollage,
  buildFondSvg,
  loadImageFromSvg,
  recolorLogoSvg,
  type CollageFormat,
} from "@/lib/studio-mood/collage-render";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const TEAL = "#1E6E77";
const MARINE = "#16324C";
const CREAM = "#F4EEE2";

// ── Preview Canvas component ──────────────────────────────────────────────────
function PreviewCanvas({ renderFn, format }: { renderFn: (c: HTMLCanvasElement) => void; format: CollageFormat }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { w, h } = FORMATS[format];

  useEffect(() => {
    if (canvasRef.current) renderFn(canvasRef.current);
  });

  const maxH = 560;
  const scale = maxH / h;
  const displayW = Math.round(w * scale);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        style={{ width: displayW, height: maxH, borderRadius: 12, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
      />
      <p className="text-xs text-brand-muted">{FORMATS[format].label} — {w}×{h}px</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CollagePage() {
  const [format, setFormat] = useState<CollageFormat>("3:4");
  const [bgColor, setBgColor] = useState("#8B9E6E");
  const [customBg, setCustomBg] = useState(false);
  const [fondId, setFondId] = useState("aucun");
  const [fondMotifColor, setFondMotifColor] = useState("#FFFFFF");
  const [customFondMotifColor, setCustomFondMotifColor] = useState(false);
  const [assetLibrary, setAssetLibrary] = useState<Record<string, string>>({});
  const [bgPatternImg, setBgPatternImg] = useState<HTMLImageElement | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoScale, setPhotoScale] = useState(1.0);
  const [photoX, setPhotoX] = useState(0);
  const [photoY, setPhotoY] = useState(0);
  const [labelText, setLabelText] = useState("");
  const [labelShape, setLabelShape] = useState("pill");
  const [labelColorId, setLabelColorId] = useState("yellow");
  const [labelSize, setLabelSize] = useState(72);
  const [labelX, setLabelX] = useState(80);
  const [labelY, setLabelY] = useState(900);
  const [selectedProps, setSelectedProps] = useState<string[]>([]);
  const [showLogo, setShowLogo] = useState(true);
  const [logoColor, setLogoColor] = useState("#FFFFFF");
  const fileRef = useRef<HTMLInputElement>(null);

  const lc = LABEL_COLORS.find((c) => c.id === labelColorId) ?? LABEL_COLORS[0];
  const fondDef = COLLAGE_FONDS.find((f) => f.id === fondId) ?? COLLAGE_FONDS[0];

  // Bibliothèque de fonds réels (assets/motifs-fonds-svg/), pour recoloration
  // fond/motif — mêmes fichiers que l'outil /social/fonds.
  useEffect(() => {
    fetch("/api/social/motifs-fonds")
      .then((r) => r.json())
      .then((json) => {
        if (!json.ok) return;
        const map: Record<string, string> = {};
        (json.data as { filename: string; content: string }[]).forEach((f) => { map[f.filename] = f.content; });
        setAssetLibrary(map);
      })
      .catch(() => {});
  }, []);

  // Logo Ypersoa réel, recoloré selon logoColor.
  useEffect(() => {
    const raw = assetLibrary["logo.svg"];
    if (!raw) return;
    let cancelled = false;
    loadImageFromSvg(recolorLogoSvg(raw, logoColor)).then((img) => { if (!cancelled) setLogoImg(img); }).catch(() => {});
    return () => { cancelled = true; };
  }, [assetLibrary, logoColor]);

  // Fond décoratif rasterisé (générateur procédural ou asset recoloré fond/motif).
  useEffect(() => {
    if (fondDef.id === "aucun") { setBgPatternImg(null); return; }
    let cancelled = false;
    const svg = buildFondSvg(fondDef, bgColor, fondMotifColor, format, 42, assetLibrary);
    loadImageFromSvg(svg).then((img) => { if (!cancelled) setBgPatternImg(img); }).catch(() => {});
    return () => { cancelled = true; };
  }, [fondDef, bgColor, fondMotifColor, format, assetLibrary]);

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoName(file.name);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Auto-scale pour que la hauteur remplisse ~90% du canvas
      const { h } = FORMATS[format];
      const scale = (h * 0.9) / img.naturalHeight;
      setPhotoScale(scale);
      setPhotoX(Math.round((FORMATS[format].w - img.naturalWidth * scale) / 2));
      setPhotoY(0);
      setPhoto(img);
    };
    img.src = url;
  }, [format]);

  const toggleProp = (id: string) => {
    setSelectedProps((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const renderFn = useCallback((canvas: HTMLCanvasElement) => {
    drawCollage(canvas, {
      format,
      bgColor,
      bgPatternImage: bgPatternImg,
      photo,
      photoBlendMode: "multiply",
      photoScale,
      photoX,
      photoY,
      labelText,
      labelShape,
      labelBg: lc.bg,
      labelFg: lc.text,
      labelSize,
      labelX,
      labelY,
      selectedProps,
      showLogo,
      logoImage: logoImg,
    });
  }, [format, bgColor, bgPatternImg, photo, photoScale, photoX, photoY, labelText, labelShape, lc, labelSize, labelX, labelY, selectedProps, showLogo, logoImg]);

  const handleDownload = () => {
    const canvas = document.createElement("canvas");
    drawCollage(canvas, {
      format,
      bgColor,
      bgPatternImage: bgPatternImg,
      photo,
      photoBlendMode: "multiply",
      photoScale,
      photoX,
      photoY,
      labelText,
      labelShape,
      labelBg: lc.bg,
      labelFg: lc.text,
      labelSize,
      labelX,
      labelY,
      selectedProps,
      showLogo,
      logoImage: logoImg,
    });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `collage-mood-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <header className="bg-white border-b border-[#E8E0D5] px-6 py-4 flex items-center gap-4">
        <Link href="/atelier-da/studio-mood" className="text-brand-muted hover:text-brand-text transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <QuatrefoilSVG size={22} color={TEAL} />
          <h1 style={{ fontFamily: "var(--font-editorial)", fontWeight: 500, fontSize: 20, color: MARINE }}>
            Collage Mood Brodé
          </h1>
        </div>
        <div className="flex-1" />
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 bg-[#1E6E77] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#165960] transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Télécharger PNG
        </button>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Left panel — controls */}
        <div className="w-80 shrink-0 bg-white border-r border-[#E8E0D5] overflow-y-auto flex flex-col gap-0">

          {/* Format */}
          <Section title="Format">
            <div className="flex flex-col gap-1.5">
              {(Object.keys(FORMATS) as Array<CollageFormat>).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    format === f ? "bg-[#1E6E77] text-white" : "bg-[#FAF7F2] text-brand-text hover:bg-[#EFE9DB]"
                  }`}
                >
                  {FORMATS[f].label}
                </button>
              ))}
            </div>
          </Section>

          {/* Background */}
          <Section title="Fond">
            <div className="flex flex-wrap gap-2 mb-3">
              {BG_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setBgColor(p.color); setCustomBg(false); }}
                  title={p.label}
                  className={`w-8 h-8 rounded-full transition-all ${
                    bgColor === p.color && !customBg ? "ring-2 ring-offset-1 ring-[#1E6E77] scale-110" : ""
                  }`}
                  style={{ background: p.color, border: p.color === "#FFFFFF" ? "1px solid #ddd" : "none" }}
                />
              ))}
              <div className="relative">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => { setBgColor(e.target.value); setCustomBg(true); }}
                  className="opacity-0 absolute inset-0 w-8 h-8 cursor-pointer"
                />
                <div
                  className={`w-8 h-8 rounded-full border border-dashed border-brand-muted flex items-center justify-center text-brand-muted text-lg cursor-pointer ${customBg ? "ring-2 ring-offset-1 ring-[#1E6E77]" : ""}`}
                  style={customBg ? { background: bgColor } : {}}
                >
                  {!customBg && "+"}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-brand-muted font-semibold uppercase mb-1.5">Motif de fond</p>
            <div className="flex flex-col gap-1.5 mb-3">
              {COLLAGE_FONDS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFondId(f.id)}
                  className={`text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    fondId === f.id ? "bg-[#1E6E77] text-white" : "bg-[#FAF7F2] text-brand-text hover:bg-[#EFE9DB]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {fondId !== "aucun" && (
              <>
                <label className="text-[10px] text-brand-muted font-semibold uppercase block mb-1.5">Couleur motif</label>
                <div className="flex gap-2 flex-wrap">
                  {["#FFFFFF", "#1E6E77", "#16324C", "#F4EEE2", "#D63A3A", "#1A1614"].map((c) => (
                    <button
                      key={c}
                      onClick={() => { setFondMotifColor(c); setCustomFondMotifColor(false); }}
                      className={`w-7 h-7 rounded-full transition-all ${
                        fondMotifColor === c && !customFondMotifColor ? "ring-2 ring-offset-1 ring-[#1E6E77] scale-110" : ""
                      }`}
                      style={{ background: c, border: c === "#FFFFFF" ? "1px solid #ddd" : "none" }}
                    />
                  ))}
                  <div className="relative">
                    <input
                      type="color"
                      value={fondMotifColor}
                      onChange={(e) => { setFondMotifColor(e.target.value); setCustomFondMotifColor(true); }}
                      className="opacity-0 absolute inset-0 w-7 h-7 cursor-pointer"
                    />
                    <div
                      className={`w-7 h-7 rounded-full border border-dashed border-brand-muted flex items-center justify-center text-brand-muted text-base cursor-pointer ${customFondMotifColor ? "ring-2 ring-offset-1 ring-[#1E6E77]" : ""}`}
                      style={customFondMotifColor ? { background: fondMotifColor } : {}}
                    >
                      {!customFondMotifColor && "+"}
                    </div>
                  </div>
                </div>
              </>
            )}
          </Section>

          {/* Photo */}
          <Section title="Photo">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center gap-2 justify-center border border-dashed border-[#1E6E77] text-[#1E6E77] px-3 py-3 rounded-xl text-sm font-medium hover:bg-[#1E6E77]/5 transition-all"
            >
              <Upload className="w-4 h-4" />
              {photoName ? photoName : "Importer une photo (fond blanc)"}
            </button>
            {photo && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-brand-muted font-semibold uppercase">Taille</label>
                  <span className="text-xs text-brand-muted">{Math.round(photoScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.05"
                  value={photoScale}
                  onChange={(e) => setPhotoScale(parseFloat(e.target.value))}
                  className="w-full accent-[#1E6E77]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-brand-muted font-semibold uppercase block mb-1">X</label>
                    <input
                      type="range"
                      min={-FORMATS[format].w * 0.5}
                      max={FORMATS[format].w * 0.5}
                      value={photoX}
                      onChange={(e) => setPhotoX(parseInt(e.target.value))}
                      className="w-full accent-[#1E6E77]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-brand-muted font-semibold uppercase block mb-1">Y</label>
                    <input
                      type="range"
                      min={-FORMATS[format].h * 0.3}
                      max={FORMATS[format].h * 0.5}
                      value={photoY}
                      onChange={(e) => setPhotoY(parseInt(e.target.value))}
                      className="w-full accent-[#1E6E77]"
                    />
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Label texte */}
          <Section title="Label texte">
            <input
              type="text"
              placeholder="ex : La boisson · Mojito"
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              className="w-full border border-[#E8E0D5] rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-[#1E6E77] mb-3"
            />
            <div className="flex gap-1 flex-wrap mb-3">
              {LABEL_SHAPES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setLabelShape(s.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    labelShape === s.id ? "bg-[#1E6E77] text-white" : "bg-[#FAF7F2] text-brand-text"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap mb-3">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setLabelColorId(c.id)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    labelColorId === c.id ? "ring-2 ring-offset-1 ring-[#1E6E77] scale-110" : ""
                  }`}
                  style={{ background: c.bg, border: c.bg === "#FFFFFF" ? "1px solid #ddd" : "none" }}
                />
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-brand-muted font-semibold uppercase">Taille texte</label>
                <span className="text-xs text-brand-muted">{labelSize}px</span>
              </div>
              <input
                type="range"
                min="36"
                max="120"
                value={labelSize}
                onChange={(e) => setLabelSize(parseInt(e.target.value))}
                className="w-full accent-[#1E6E77]"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-brand-muted font-semibold uppercase block mb-1">Position X</label>
                  <input
                    type="range"
                    min="0"
                    max={FORMATS[format].w - 200}
                    value={labelX}
                    onChange={(e) => setLabelX(parseInt(e.target.value))}
                    className="w-full accent-[#1E6E77]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-brand-muted font-semibold uppercase block mb-1">Position Y</label>
                  <input
                    type="range"
                    min="0"
                    max={FORMATS[format].h - 100}
                    value={labelY}
                    onChange={(e) => setLabelY(parseInt(e.target.value))}
                    className="w-full accent-[#1E6E77]"
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* Props */}
          <Section title="Éléments déco">
            <div className="flex flex-wrap gap-2">
              {PROPS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggleProp(p.id)}
                  title={p.label}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    selectedProps.includes(p.id)
                      ? "bg-[#1E6E77]/15 ring-2 ring-[#1E6E77]"
                      : "bg-[#FAF7F2] hover:bg-[#EFE9DB]"
                  }`}
                >
                  {p.emoji}
                </button>
              ))}
            </div>
          </Section>

          {/* Logo */}
          <Section title="Logo Ypersoa">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setShowLogo((v) => !v)}
                className={`relative w-10 h-6 rounded-full transition-colors ${showLogo ? "bg-[#1E6E77]" : "bg-gray-200"}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showLogo ? "left-5" : "left-1"}`} />
              </button>
              <span className="text-sm text-brand-text">Logo Ypersoa (coin bas droit)</span>
            </div>
            {showLogo && (
              <div className="flex gap-2 flex-wrap">
                {["#FFFFFF", "#1E6E77", "#16324C", "#F4EEE2", "#1A1614"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setLogoColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${
                      logoColor === c ? "ring-2 ring-offset-1 ring-[#1E6E77] scale-110" : ""
                    }`}
                    style={{ background: c, border: c === "#FFFFFF" ? "1px solid #ddd" : "none" }}
                  />
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Right panel — preview */}
        <div className="flex-1 overflow-y-auto bg-[#F4EEE2]/50 flex items-start justify-center p-8">
          <PreviewCanvas renderFn={renderFn} format={format} />
        </div>
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-4 border-b border-[#F0EAE0]">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3">{title}</h3>
      {children}
    </div>
  );
}
