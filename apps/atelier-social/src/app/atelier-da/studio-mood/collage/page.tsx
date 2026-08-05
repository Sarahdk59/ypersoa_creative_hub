"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Upload, X, Image as ImageIcon, Type, Sparkles } from "lucide-react";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const TEAL = "#1E6E77";
const MARINE = "#16324C";
const CREAM = "#F4EEE2";

// ── Canvas dimensions ─────────────────────────────────────────────────────────
const FORMATS = {
  "4:5": { w: 1080, h: 1350, label: "Instagram Post (4:5)" },
  "9:16": { w: 1080, h: 1920, label: "Reels / Story (9:16)" },
  "1:1": { w: 1080, h: 1080, label: "Carré (1:1)" },
};

// ── Background presets ────────────────────────────────────────────────────────
const BG_PRESETS = [
  { id: "olive", color: "#8B9E6E", label: "Olive Mojito" },
  { id: "rose", color: "#F2B5C5", label: "Rose poudré" },
  { id: "rouge", color: "#D63A3A", label: "Rouge vif" },
  { id: "teal", color: "#1E6E77", label: "Teal Ypersoa" },
  { id: "marine", color: "#16324C", label: "Marine" },
  { id: "creme", color: "#F4EEE2", label: "Crème" },
  { id: "blanc", color: "#FFFFFF", label: "Blanc" },
  { id: "corail", color: "#E87D5A", label: "Corail" },
  { id: "lavande", color: "#B8A9C9", label: "Lavande" },
];

// ── Pattern options ───────────────────────────────────────────────────────────
const PATTERNS = [
  { id: "none", label: "Aucun" },
  { id: "dots", label: "Polka dots" },
  { id: "blobs", label: "Blobs organiques" },
  { id: "circles", label: "Cercles" },
];

// ── Label shapes ──────────────────────────────────────────────────────────────
const LABEL_SHAPES = [
  { id: "pill", label: "Pill arrondi" },
  { id: "blob", label: "Blob" },
  { id: "rect", label: "Rectangle" },
  { id: "sticker", label: "Sticker" },
];

// ── Label color presets ───────────────────────────────────────────────────────
const LABEL_COLORS = [
  { id: "yellow", bg: "#F2C94C", text: "#1A1614" },
  { id: "red", bg: "#D63A3A", text: "#FFFFFF" },
  { id: "teal", bg: "#1E6E77", text: "#FFFFFF" },
  { id: "marine", bg: "#16324C", text: "#FFFFFF" },
  { id: "white", bg: "#FFFFFF", text: "#1A1614" },
  { id: "cream", bg: "#F4EEE2", text: "#16324C" },
];

// ── Built-in props ────────────────────────────────────────────────────────────
const PROPS = [
  { id: "thread", emoji: "🧵", label: "Bobine de fil" },
  { id: "scissors", emoji: "✂️", label: "Ciseaux" },
  { id: "flower", emoji: "🌸", label: "Fleur" },
  { id: "heart", emoji: "❤️", label: "Cœur" },
  { id: "star", emoji: "⭐", label: "Étoile" },
  { id: "lemon", emoji: "🍋", label: "Citron" },
  { id: "coffee", emoji: "☕", label: "Café" },
  { id: "sparkle", emoji: "✨", label: "Étincelle" },
];

// ── Quatrefoil SVG path ───────────────────────────────────────────────────────
function QuatrefoilSVG({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="30" cy="30" r="22" stroke={color} strokeWidth="5" fill="none" />
      <circle cx="70" cy="30" r="22" stroke={color} strokeWidth="5" fill="none" />
      <circle cx="30" cy="70" r="22" stroke={color} strokeWidth="5" fill="none" />
      <circle cx="70" cy="70" r="22" stroke={color} strokeWidth="5" fill="none" />
    </svg>
  );
}

// ── Canvas renderer ───────────────────────────────────────────────────────────
function drawCollage(
  canvas: HTMLCanvasElement,
  opts: {
    format: keyof typeof FORMATS;
    bgColor: string;
    pattern: string;
    photo: HTMLImageElement | null;
    photoScale: number;
    photoX: number;
    photoY: number;
    labelText: string;
    labelShape: string;
    labelBg: string;
    labelFg: string;
    labelSize: number;
    labelX: number;
    labelY: number;
    selectedProps: string[];
    showLogo: boolean;
    logoColor: string;
  }
) {
  const { w, h } = FORMATS[opts.format];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = opts.bgColor;
  ctx.fillRect(0, 0, w, h);

  // Pattern overlay
  if (opts.pattern === "dots") {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    const dot = 28;
    const gap = 70;
    for (let y = gap / 2; y < h + gap; y += gap) {
      for (let x = gap / 2; x < w + gap; x += gap) {
        ctx.beginPath();
        ctx.arc(x, y, dot, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (opts.pattern === "blobs") {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    const blobs = [
      [0.85 * w, 0.05 * h, 0.08 * w],
      [0.92 * w, 0.15 * h, 0.05 * w],
      [0.05 * w, 0.8 * h, 0.09 * w],
      [0.12 * w, 0.92 * h, 0.06 * w],
      [0.78 * w, 0.88 * h, 0.07 * w],
    ];
    blobs.forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    const hearts = [
      [0.1 * w, 0.1 * h, 0.06 * w],
      [0.88 * w, 0.75 * h, 0.05 * w],
    ];
    hearts.forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (opts.pattern === "circles") {
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 4;
    [[0.9 * w, 0.08 * h, 120], [0.08 * w, 0.9 * h, 100], [0.5 * w, 0.5 * h, 200]].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  // Photo avec mix-blend multiply
  if (opts.photo) {
    const imgW = opts.photo.naturalWidth * opts.photoScale;
    const imgH = opts.photo.naturalHeight * opts.photoScale;
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(opts.photo, opts.photoX, opts.photoY, imgW, imgH);
    ctx.restore();
  }

  // Label
  if (opts.labelText.trim()) {
    const fontSize = opts.labelSize;
    ctx.font = `700 ${fontSize}px 'Arial', sans-serif`;
    const textW = ctx.measureText(opts.labelText).width;
    const padX = 40;
    const padY = 24;
    const lx = opts.labelX;
    const ly = opts.labelY;
    const lw = textW + padX * 2;
    const lh = fontSize + padY * 2;

    ctx.save();
    ctx.fillStyle = opts.labelBg;

    if (opts.labelShape === "pill") {
      const r = lh / 2;
      ctx.beginPath();
      ctx.moveTo(lx + r, ly);
      ctx.lineTo(lx + lw - r, ly);
      ctx.arc(lx + lw - r, ly + r, r, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(lx + r, ly + lh);
      ctx.arc(lx + r, ly + r, r, Math.PI / 2, -Math.PI / 2);
      ctx.closePath();
      ctx.fill();
    } else if (opts.labelShape === "blob") {
      ctx.beginPath();
      ctx.moveTo(lx + lw * 0.1, ly + lh * 0.2);
      ctx.bezierCurveTo(lx - lw * 0.05, ly - lh * 0.1, lx + lw * 0.4, ly - lh * 0.15, lx + lw * 0.6, ly + lh * 0.05);
      ctx.bezierCurveTo(lx + lw * 0.85, ly - lh * 0.05, lx + lw * 1.1, ly + lh * 0.4, lx + lw * 0.95, ly + lh * 0.75);
      ctx.bezierCurveTo(lx + lw * 1.05, ly + lh * 1.1, lx + lw * 0.6, ly + lh * 1.15, lx + lw * 0.4, ly + lh * 0.95);
      ctx.bezierCurveTo(lx + lw * 0.1, ly + lh * 1.2, lx - lw * 0.05, ly + lh * 0.8, lx + lw * 0.1, ly + lh * 0.2);
      ctx.closePath();
      ctx.fill();
    } else if (opts.labelShape === "sticker") {
      const r = 20;
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      ctx.roundRect(lx, ly, lw, lh, r);
      ctx.fill();
      ctx.shadowColor = "transparent";
    } else {
      ctx.fillRect(lx, ly, lw, lh);
    }

    ctx.fillStyle = opts.labelFg;
    ctx.font = `700 ${fontSize}px 'Arial', sans-serif`;
    ctx.fillText(opts.labelText, lx + padX, ly + padY + fontSize * 0.78);
    ctx.restore();
  }

  // Props (emoji)
  const propPositions = [
    [0.75 * w, 0.18 * h],
    [0.15 * w, 0.55 * h],
    [0.8 * w, 0.65 * h],
    [0.2 * w, 0.82 * h],
    [0.65 * w, 0.85 * h],
    [0.05 * w, 0.3 * h],
    [0.85 * w, 0.4 * h],
    [0.5 * w, 0.12 * h],
  ];
  ctx.font = `${Math.round(w * 0.1)}px serif`;
  ctx.textAlign = "center";
  opts.selectedProps.forEach((propId, i) => {
    const prop = PROPS.find((p) => p.id === propId);
    if (!prop) return;
    const [px, py] = propPositions[i % propPositions.length];
    ctx.fillText(prop.emoji, px, py);
  });
  ctx.textAlign = "left";

  // Quatrefoil logo
  if (opts.showLogo) {
    const logoSize = Math.round(w * 0.08);
    const margin = Math.round(w * 0.04);
    const lx2 = w - logoSize - margin;
    const ly2 = h - logoSize - margin;
    ctx.save();
    ctx.strokeStyle = opts.logoColor;
    ctx.lineWidth = Math.max(3, logoSize * 0.06);
    const cx1 = lx2 + logoSize * 0.3;
    const cy1 = ly2 + logoSize * 0.3;
    const cx2 = lx2 + logoSize * 0.7;
    const cy2 = ly2 + logoSize * 0.7;
    const r = logoSize * 0.22;
    [[cx1, cy1], [cx2, cy1], [cx1, cy2], [cx2, cy2]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();
  }
}

// ── Preview Canvas component ──────────────────────────────────────────────────
function PreviewCanvas({ renderFn, format }: { renderFn: (c: HTMLCanvasElement) => void; format: keyof typeof FORMATS }) {
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
  const [format, setFormat] = useState<keyof typeof FORMATS>("4:5");
  const [bgColor, setBgColor] = useState("#8B9E6E");
  const [customBg, setCustomBg] = useState(false);
  const [pattern, setPattern] = useState("dots");
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
      pattern,
      photo,
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
      logoColor,
    });
  }, [format, bgColor, pattern, photo, photoScale, photoX, photoY, labelText, labelShape, lc, labelSize, labelX, labelY, selectedProps, showLogo, logoColor]);

  const handleDownload = () => {
    const canvas = document.createElement("canvas");
    drawCollage(canvas, {
      format,
      bgColor,
      pattern,
      photo,
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
      logoColor,
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
              {(Object.keys(FORMATS) as Array<keyof typeof FORMATS>).map((f) => (
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
            <div className="flex flex-col gap-1.5">
              {PATTERNS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPattern(p.id)}
                  className={`text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    pattern === p.id ? "bg-[#1E6E77] text-white" : "bg-[#FAF7F2] text-brand-text hover:bg-[#EFE9DB]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
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
              <span className="text-sm text-brand-text">Quatrefoil (coin bas droit)</span>
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
