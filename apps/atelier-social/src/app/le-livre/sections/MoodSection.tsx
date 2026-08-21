"use client";

// Le Studio Mood — le rituel récurrent, fusionné dans Le Livre le 21/08/2026.
// Ex-app/studio/studio-mood/kit/page.tsx. Guide de production illustré pour
// Maï. Note ouverte : cette palette (Ambre comme accent, pas de rouge
// coquelicot) et l'interdiction « Terracotta » datent d'avant la palette
// actuelle du Livre §3 — à recaler un jour, pas fait dans cette fusion.

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const T = "#1E6E77";   // teal
const M = "#16324C";   // marine
const CR = "#F4EEE2";  // cream
const CR2 = "#EFE9DB"; // cream darker
const SG = "#97A886";  // sage
const AM = "#E0942E";  // amber

// ── Type helpers ──────────────────────────────────────────────────────────────
const NR = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: "var(--font-editorial)",
  fontStyle: "italic",
  fontWeight: 600,
  ...extra,
});
const HK = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: "var(--font-sans)",
  ...extra,
});

// ── Shared primitives ─────────────────────────────────────────────────────────

function AvatarFace({ size = 70 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "#DCCFC8",
      border: `${Math.max(2, Math.round(size / 22))}px solid ${M}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", flexShrink: 0,
    }}>
      <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 60 60" fill="none">
        <ellipse cx="30" cy="24" rx="14" ry="17" fill="#C9A090" />
        <circle cx="25" cy="21" r="2.5" fill={M} />
        <circle cx="35" cy="21" r="2.5" fill={M} />
        <path d="M25 30 Q30 34 35 30" stroke={M} strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="30" cy="46" rx="11" ry="8" fill="#B08070" />
      </svg>
    </div>
  );
}

function Heart({ size = 80, color = AM }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 100 90" fill={color}>
      <path d="M50 85 C50 85 5 50 5 25 C5 10 15 0 30 0 C38 0 46 5 50 12 C54 5 62 0 70 0 C85 0 95 10 95 25 C95 50 50 85 50 85Z" />
    </svg>
  );
}

function MacroSlot({ label }: { label: string }) {
  return (
    <div style={{
      position: "absolute", inset: 14,
      border: `2px dashed ${AM}`, borderRadius: 14,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 8, padding: 16, boxSizing: "border-box", textAlign: "center",
    }}>
      <div style={{ fontSize: 36, lineHeight: 1 }}>📷</div>
      <div style={HK({ fontSize: 13, color: CR, fontWeight: 600, lineHeight: 1.4 })}>{label}</div>
    </div>
  );
}

function SlideHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <>
      <div style={HK({ fontSize: 16, letterSpacing: "4px", fontWeight: 700, color: AM, textTransform: "uppercase" })}>
        {eyebrow}
      </div>
      <div style={NR({ fontSize: 64, color: M, marginTop: 6, lineHeight: 1.05 })}>{title}</div>
      {subtitle && (
        <div style={HK({ fontSize: 18, color: "#3d4d4f", marginTop: 8, maxWidth: 1100 })}>{subtitle}</div>
      )}
    </>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: "#fff", borderRadius: 18, padding: 30, ...style }}>{children}</div>;
}
function TintCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: CR2, borderRadius: 18, padding: "26px 30px", ...style }}>{children}</div>;
}

function Swatch({ color, name, hex, border }: { color: string; name: string; hex: string; border?: boolean }) {
  return (
    <div style={{ width: 150 }}>
      <div style={{ width: 150, height: 100, borderRadius: 14, background: color, border: border ? "2px solid #d8cfba" : undefined }} />
      <div style={HK({ marginTop: 10, fontSize: 15, fontWeight: 600, color: M })}>{name}</div>
      <div style={HK({ fontSize: 13, color: "#5b6b6d" })}>{hex}</div>
    </div>
  );
}
function MiniSwatch({ color }: { color: string }) {
  return <div style={{ width: 40, height: 40, borderRadius: 8, background: color, flexShrink: 0 }} />;
}

// ── Slides ────────────────────────────────────────────────────────────────────

function Slide01() {
  const dots = [
    [{ t: 0, l: 85 }, { t: 85, l: 0 }, { t: 85, l: 170 }, { t: 170, l: 85 }],
    [{ t: 0, l: 90 }, { t: 90, l: 0 }, { t: 90, l: 180 }, { t: 180, l: 90 }],
  ];
  return (
    <div style={{ width: 1920, height: 1080, background: CR, position: "relative", overflow: "hidden", ...HK(), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* top-left rosace */}
      <div style={{ position: "absolute", top: -40, left: -40, width: 260, height: 260 }}>
        {dots[0].map((p, i) => (
          <div key={i} style={{ position: "absolute", top: p.t, left: p.l, width: 150, height: 150, borderRadius: "50%", background: T, opacity: 0.14 }} />
        ))}
        <div style={{ position: "absolute", top: 110, left: 110, width: 60, height: 60, borderRadius: "50%", background: AM, opacity: 0.25 }} />
      </div>
      {/* bottom-right rosace */}
      <div style={{ position: "absolute", bottom: -60, right: -60, width: 280, height: 280 }}>
        {dots[1].map((p, i) => (
          <div key={i} style={{ position: "absolute", top: p.t, left: p.l, width: 160, height: 160, borderRadius: "50%", background: M, opacity: 0.10 }} />
        ))}
      </div>

      <div style={HK({ fontSize: 20, letterSpacing: "6px", fontWeight: 700, color: AM, textTransform: "uppercase", marginBottom: 28 })}>
        Rubrique Instagram
      </div>
      <div style={NR({ fontSize: 168, color: T, lineHeight: 1 })}>Mood brodé</div>
      <div style={HK({ fontSize: 30, color: M, marginTop: 28, fontWeight: 500 })}>
        Kit visuel – guide d&apos;exécution
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 56 }}>
        <div style={HK({ background: M, color: CR, padding: "12px 28px", borderRadius: 100, fontSize: 18, fontWeight: 600, letterSpacing: "1px" })}>
          Niveau simple assumé · v1
        </div>
        <div style={HK({ border: `2px dashed ${AM}`, color: AM, padding: "10px 28px", borderRadius: 100, fontSize: 18, fontWeight: 600, letterSpacing: "1px" })}>
          Premium – phase 2
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 40, ...HK({ fontSize: 15, color: SG, fontWeight: 600, letterSpacing: "1px" }) }}>
        À l&apos;usage de Maï – guide de production
      </div>
    </div>
  );
}

function Slide02() {
  return (
    <div style={{ width: 1920, height: 1080, background: CR, ...HK(), padding: 80, boxSizing: "border-box", overflow: "hidden" }}>
      <SlideHeader eyebrow="Direction artistique" title="Couleurs & typographie" />
      <div style={{ display: "flex", gap: 70, marginTop: 48 }}>
        <div style={{ flex: 1 }}>
          <div style={HK({ fontSize: 17, fontWeight: 700, color: M, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 18 })}>
            Palette ancre – toujours présente
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <Swatch color={T} name="Teal" hex="#1E6E77" />
            <Swatch color={M} name="Marine" hex="#16324C" />
            <Swatch color={CR} name="Crème" hex="#F4EEE2" border />
            <Swatch color={SG} name="Sauge (neutre)" hex="#97A886" />
            <Swatch color={AM} name="Ambre (accent, dosé)" hex="#E0942E" />
          </div>
          <div style={HK({ fontSize: 17, fontWeight: 700, color: M, textTransform: "uppercase", letterSpacing: "1px", margin: "38px 0 16px" })}>
            Amplis saisonniers – décor uniquement
          </div>
          <div style={{ display: "flex", gap: 36 }}>
            {[
              { label: "Saint-Valentin", colors: ["#D33A34", "#E86A97", "#F3C9D6"] },
              { label: "Été", colors: ["#EC1E79", "#F2B933", "#56C8A4", "#2483B8"] },
              { label: "Noël", colors: ["#6E1D24", "#21503A", "#C6982F"] },
            ].map((g) => (
              <div key={g.label}>
                <div style={HK({ fontSize: 14, fontWeight: 600, color: M, marginBottom: 8 })}>{g.label}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {g.colors.map((c) => <MiniSwatch key={c} color={c} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ width: 520 }}>
          <div style={HK({ fontSize: 17, fontWeight: 700, color: M, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 18 })}>
            Typographie
          </div>
          <Card>
            <div style={NR({ fontSize: 56, color: T })}>joyeuse</div>
            <div style={HK({ fontSize: 13, color: "#8a8a8a", marginBottom: 18 })}>Newsreader italic – mots d&apos;humeur, signature</div>
            <div style={HK({ fontWeight: 600, fontSize: 22, color: M })}>Hanken Grotesk</div>
            <div style={HK({ fontSize: 15, color: "#5b6b6d" })}>Titres de section, légendes, CTA – jamais l&apos;inverse.</div>
          </Card>
          <div style={{ marginTop: 24, border: "2px solid #b23b2e", borderRadius: 14, padding: "18px 22px", background: "#fbeceb" }}>
            <div style={HK({ fontSize: 14, fontWeight: 700, color: "#7a2a20", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 })}>
              Interdit
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#D97757", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 20, flexShrink: 0 }}>✕</div>
              <div style={HK({ fontSize: 14, color: "#7a2a20", lineHeight: 1.4 })}>Terracotta & voisins, stickers kawaii criards, texte gris timide.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slide03() {
  return (
    <div style={{ width: 1920, height: 1080, background: CR, ...HK(), padding: 80, boxSizing: "border-box", overflow: "hidden" }}>
      <SlideHeader eyebrow="Système visuel" title="Grammaire & garde-fous" />
      <div style={{ display: "flex", gap: 24, marginTop: 44 }}>
        {/* Rosace */}
        <Card style={{ flex: 1, textAlign: "center" }}>
          <div style={{ position: "relative", width: 130, height: 130, margin: "0 auto 14px" }}>
            {[{ t: 0, l: 35 }, { t: 35, l: 0 }, { t: 35, l: 70 }, { t: 70, l: 35 }].map((p, i) => (
              <div key={i} style={{ position: "absolute", top: p.t, left: p.l, width: 60, height: 60, borderRadius: "50%", background: T }} />
            ))}
            <div style={{ position: "absolute", top: 48, left: 48, width: 34, height: 34, borderRadius: "50%", background: AM }} />
          </div>
          <div style={HK({ fontSize: 16, fontWeight: 700, color: M })}>Rosace quatrefoil</div>
          <div style={HK({ fontSize: 13, color: "#5b6b6d", marginTop: 4 })}>Décor de fond, coin de cadre</div>
        </Card>
        {/* Cœur */}
        <Card style={{ flex: 1, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, marginTop: 10 }}>
            <Heart size={90} />
          </div>
          <div style={HK({ fontSize: 16, fontWeight: 700, color: M })}>Cœur</div>
          <div style={HK({ fontSize: 13, color: "#5b6b6d", marginTop: 4 })}>Point d&apos;exclamation visuel, jamais seul</div>
        </Card>
        {/* Mot brodé */}
        <Card style={{ flex: 1, textAlign: "center" }}>
          <div style={NR({ fontSize: 44, color: T, marginBottom: 10 })}>Prénom</div>
          <div style={HK({ fontSize: 16, fontWeight: 700, color: M })}>Mot brodé</div>
          <div style={HK({ fontSize: 13, color: "#5b6b6d", marginTop: 4 })}>Toujours Newsreader italique, teal ou marine</div>
        </Card>
        {/* Signature */}
        <Card style={{ flex: 1, textAlign: "center" }}>
          <div style={NR({ fontSize: 30, color: M, marginBottom: 10, marginTop: 16 })}>à ta commande</div>
          <div style={HK({ fontSize: 16, fontWeight: 700, color: M })}>Signature</div>
          <div style={HK({ fontSize: 13, color: "#5b6b6d", marginTop: 4 })}>Ferme systématiquement chaque épisode</div>
        </Card>
      </div>
      <div style={{ display: "flex", gap: 24, marginTop: 36 }}>
        {[
          { title: "Où le mignon est permis", body: "Confettis, petites étoiles, décor de fond, props secondaires – jamais sur le visage ni la broderie elle-même." },
          { title: "Ce qui reste teal / marine", body: "Le personnage de base, les cadres, la typo de titre, le CTA – le socle ne change jamais de famille de couleur." },
          { title: "Typo des mots d'humeur", body: "Newsreader italique uniquement, en teal ou marine – jamais de dégradé, jamais de contour coloré." },
        ].map((c) => (
          <TintCard key={c.title} style={{ flex: 1 }}>
            <div style={HK({ fontSize: 15, fontWeight: 700, color: M, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 })}>{c.title}</div>
            <div style={HK({ fontSize: 15, color: "#3d4d4f", lineHeight: 1.6 })}>{c.body}</div>
          </TintCard>
        ))}
      </div>
    </div>
  );
}

function Slide04() {
  return (
    <div style={{ width: 1920, height: 1080, background: CR, ...HK(), padding: 80, boxSizing: "border-box", overflow: "hidden" }}>
      <SlideHeader
        eyebrow="Asset réutilisable"
        title="Le template avatar"
        subtitle="Un seul personnage, posé une fois. À chaque épisode : on change le vêtement et le décor – jamais le buste."
      />
      <div style={{ display: "flex", gap: 80, marginTop: 44, alignItems: "flex-start" }}>
        {/* Avatar diagram */}
        <div style={{ position: "relative", width: 340 }}>
          <div style={{ position: "relative", width: 220, height: 400, margin: "0 auto" }}>
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", zIndex: 2 }}>
              <AvatarFace size={150} />
            </div>
            <div style={{
              position: "absolute", top: 130, left: "50%", transform: "translateX(-50%)",
              width: 190, height: 260, background: T,
              borderRadius: "50px 50px 20px 20px",
              border: `3px dashed ${M}`, boxSizing: "border-box",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}>
              <div style={HK({ color: CR, fontSize: 12, fontWeight: 700, textAlign: "center", letterSpacing: "0.5px", lineHeight: 1.5 })}>
                ZONE VÊTEMENT<br />– modifiable –
              </div>
            </div>
          </div>
          <div style={{ position: "absolute", top: -5, left: 90, width: 160, height: 160, borderRadius: "50%", border: `3px solid ${AM}`, boxSizing: "border-box", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 70, left: -30, ...HK({ fontSize: 13, fontWeight: 700, color: AM, width: 110, textAlign: "right", lineHeight: 1.4 }) }}>
            BUSTE FIXE<br />ne pas modifier
          </div>
        </div>
        {/* Right */}
        <div style={{ flex: 1 }}>
          <div style={HK({ fontSize: 16, fontWeight: 700, color: M, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 20 })}>
            Ce qui change à chaque épisode
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              { label: "Épisode « HAPPY »", note: "Vêtement ambre", color: AM },
              { label: "Épisode « SAD DAY »", note: "Vêtement marine", color: M },
              { label: "Épisode « Retraite »", note: "Vêtement sauge", color: SG },
            ].map((ep) => (
              <Card key={ep.label} style={{ flex: 1, textAlign: "center", padding: 22 }}>
                <div style={{ width: 70, height: 100, background: ep.color, borderRadius: "20px 20px 8px 8px", margin: "0 auto 14px" }} />
                <div style={HK({ fontSize: 14, fontWeight: 700, color: M })}>{ep.label}</div>
                <div style={HK({ fontSize: 12, color: "#5b6b6d", marginTop: 4 })}>{ep.note}</div>
              </Card>
            ))}
          </div>
          <TintCard style={{ marginTop: 28, borderRadius: 16 }}>
            <div style={HK({ fontSize: 15, fontWeight: 700, color: M, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 })}>Décor</div>
            <div style={HK({ fontSize: 15, color: "#3d4d4f", lineHeight: 1.6 })}>
              Fond à motif (pois, rayures) en crème/sauge par défaut ; amplis saisonniers autorisés en petites touches (confettis, cœurs) – jamais en fond plein.
            </div>
          </TintCard>
          <div style={HK({ marginTop: 16, fontSize: 14, color: SG, fontWeight: 600 })}>
            ⚠ Maï : dupliquer ce fichier avatar, ne toucher qu&apos;aux calques « vêtement » et « décor ».
          </div>
        </div>
      </div>
    </div>
  );
}

function Slide05() {
  const frames = [
    {
      borderColor: M, bg: "#fff", label: "1 · HOOK", time: "0–2s · humeur du jour", timeColor: SG,
      content: (
        <div style={{ position: "absolute", inset: 14, border: `2px dashed ${SG}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 16, boxSizing: "border-box" }}>
          <span style={HK({ fontSize: 13, color: "#5b6b6d", fontWeight: 600 })}>Avatar + mot d&apos;humeur<br />en Newsreader italique</span>
        </div>
      ),
    },
    {
      borderColor: M, bg: "#fff", label: "2 · GAG VISUEL", time: "2–5s · le twist", timeColor: SG,
      content: (
        <div style={{ position: "absolute", inset: 14, border: `2px dashed ${SG}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 16, boxSizing: "border-box" }}>
          <span style={HK({ fontSize: 13, color: "#5b6b6d", fontWeight: 600 })}>Avatar en situation<br />+ prop comique</span>
        </div>
      ),
    },
    {
      borderColor: AM, bg: M, label: "3 · MACRO BRODERIE", time: "5–7s · obligatoire, photo réelle", timeColor: AM,
      content: (
        <div style={{ position: "absolute", inset: 14, border: `2px dashed ${AM}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 16, boxSizing: "border-box" }}>
          <span style={HK({ fontSize: 13, color: CR, fontWeight: 600 })}>Plan macro réel<br />de la broderie –<br />mot lisible</span>
        </div>
      ),
    },
    {
      borderColor: M, bg: T, label: "4 · CTA", time: "7–9s · signature", timeColor: SG,
      content: (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={NR({ fontSize: 26, color: CR })}>à ta commande</div>
        </div>
      ),
    },
  ];
  return (
    <div style={{ width: 1920, height: 1080, background: CR, ...HK(), padding: 80, boxSizing: "border-box", overflow: "hidden" }}>
      <SlideHeader eyebrow="Format Reel – 9:16" title="Le template d'épisode" subtitle="4 frames, toujours dans cet ordre. Le macro broderie réel est obligatoire." />
      <div style={{ display: "flex", gap: 30, justifyContent: "center", marginTop: 46 }}>
        {frames.map((f) => (
          <div key={f.label} style={{ width: 260 }}>
            <div style={{ width: 260, height: 462, borderRadius: 22, border: `3px solid ${f.borderColor}`, background: f.bg, position: "relative", overflow: "hidden", boxSizing: "border-box" }}>
              {f.content}
            </div>
            <div style={{ textAlign: "center", marginTop: 14, ...HK({ fontSize: 15, fontWeight: 700, color: M }) }}>{f.label}</div>
            <div style={{ textAlign: "center", ...HK({ fontSize: 12, color: f.timeColor, fontWeight: f.timeColor === AM ? 700 : 600 }) }}>{f.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PiloteProps {
  titleWord: string; titleColor: string; subtitlePilot: string;
  hookWord: string; hookColor: string; clothColor: string;
  gagText: string; macroLabel: string;
  frame1Bg: string; frame2Bg: string; confetti?: boolean;
}

function PiloteSlide({ titleWord, titleColor, subtitlePilot, hookWord, hookColor, clothColor, gagText, macroLabel, frame1Bg, frame2Bg, confetti = false }: PiloteProps) {
  const confettiShapes = [
    { top: 20, left: 24, w: 16, h: 16, r: 3, bg: AM, rot: 15 },
    { top: 50, left: 190, w: 14, h: 14, r: 50, bg: T },
    { top: 90, left: 60, w: 14, h: 14, r: 3, bg: SG, rot: -20 },
    { top: 30, left: 110, w: 16, h: 16, r: 50, bg: AM },
    { top: 140, left: 200, w: 14, h: 14, r: 3, bg: M, rot: 30 },
  ];
  return (
    <div style={{ width: 1920, height: 1080, background: CR, ...HK(), padding: 80, boxSizing: "border-box", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <div style={NR({ fontSize: 56, color: titleColor })}>{titleWord}</div>
        <div style={HK({ fontSize: 16, color: SG, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" })}>{subtitlePilot}</div>
      </div>
      <div style={{ display: "flex", gap: 30, justifyContent: "center", marginTop: 40 }}>
        {/* Frame 1 — Hook */}
        <div style={{ width: 260, height: 462, borderRadius: 22, border: `3px solid ${M}`, background: frame1Bg, position: "relative", overflow: "hidden", boxSizing: "border-box" }}>
          <div style={{ position: "absolute", top: 20, left: 0, right: 0, textAlign: "center", ...NR({ fontSize: 30, color: hookColor }) }}>
            {hookWord}
          </div>
          <div style={{ position: "relative", width: 120, height: 220, margin: "120px auto 0" }}>
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", zIndex: 2 }}><AvatarFace size={70} /></div>
            <div style={{ position: "absolute", top: 58, left: "50%", transform: "translateX(-50%)", width: 90, height: 150, background: clothColor, borderRadius: "26px 26px 10px 10px" }} />
          </div>
        </div>
        {/* Frame 2 — Gag */}
        <div style={{ width: 260, height: 462, borderRadius: 22, border: `3px solid ${M}`, background: frame2Bg, position: "relative", overflow: "hidden", boxSizing: "border-box" }}>
          {confetti && confettiShapes.map((d, i) => (
            <div key={i} style={{ position: "absolute", top: d.top, left: d.left, width: d.w, height: d.h, borderRadius: d.r, background: d.bg, transform: d.rot ? `rotate(${d.rot}deg)` : undefined }} />
          ))}
          <div style={{ position: "relative", width: 120, height: 220, margin: "130px auto 0" }}>
            <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 2 }}><AvatarFace size={70} /></div>
            <div style={{ position: "absolute", top: 68, left: "50%", transform: "translateX(-50%)", width: 90, height: 130, background: clothColor, borderRadius: "26px 26px 10px 10px" }} />
          </div>
          <div style={{ position: "absolute", bottom: 30, left: 0, right: 0, textAlign: "center", ...HK({ fontSize: 14, color: "#5b6b6d", fontWeight: 600, lineHeight: 1.5, whiteSpace: "pre-line" }) }}>
            {gagText}
          </div>
        </div>
        {/* Frame 3 — Macro */}
        <div style={{ width: 260, height: 462, borderRadius: 22, border: `3px solid ${AM}`, background: M, position: "relative", overflow: "hidden", boxSizing: "border-box" }}>
          <MacroSlot label={macroLabel} />
        </div>
        {/* Frame 4 — CTA */}
        <div style={{ width: 260, height: 462, borderRadius: 22, border: `3px solid ${M}`, background: T, position: "relative", overflow: "hidden", boxSizing: "border-box" }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={NR({ fontSize: 26, color: CR })}>à ta commande</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Slide06 = () => (
  <PiloteSlide
    titleWord="HAPPY" titleColor={T} subtitlePilot="Pilote 1 · rentrée, plein d'énergie"
    hookWord="motivée !" hookColor={T} clothColor={AM}
    gagText={"elle danse avec son\nnouveau cartable"}
    macroLabel={"Photo macro – broderie « HAPPY »"}
    frame1Bg={`repeating-linear-gradient(45deg,${CR},${CR} 18px,#efe6d2 18px,#efe6d2 20px)`}
    frame2Bg={CR}
  />
);

const Slide07 = () => (
  <PiloteSlide
    titleWord="SAD DAY" titleColor={M} subtitlePilot="Pilote 2 · rentrée sous la pluie"
    hookWord="flemme." hookColor={M} clothColor={M}
    gagText={"elle s'affale sur\nsa chaise de bureau"}
    macroLabel={"Photo macro – broderie « SAD DAY »"}
    frame1Bg="#E9E3D4" frame2Bg={CR}
  />
);

const Slide08 = () => (
  <PiloteSlide
    titleWord="Départ retraite" titleColor={T} subtitlePilot="Pilote 3 · confettis, dernier jour"
    hookWord="dernier jour." hookColor={T} clothColor={SG}
    gagText={"confettis, collègues\napplaudissent"}
    macroLabel={"Photo macro – broderie « MERCI »"}
    frame1Bg={CR} frame2Bg={CR2} confetti
  />
);

function Slide09() {
  return (
    <div style={{ width: 1920, height: 1080, background: CR, ...HK(), padding: 80, boxSizing: "border-box", overflow: "hidden" }}>
      <SlideHeader eyebrow="À épingler" title="Planche récap" />
      <div style={{ display: "flex", gap: 24, marginTop: 44 }}>
        <Card style={{ flex: 1, padding: 26 }}>
          <div style={HK({ fontSize: 15, fontWeight: 700, color: M, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 })}>Palette</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[{ c: T }, { c: M }, { c: CR, b: true }, { c: SG }, { c: AM }].map((s, i) => (
              <div key={i} style={{ width: 52, height: 52, borderRadius: 10, background: s.c, border: s.b ? "2px solid #d8cfba" : undefined }} />
            ))}
          </div>
          <div style={HK({ fontSize: 13, color: "#5b6b6d", marginTop: 10 })}>Ancre fixe · amplis saisonniers en décor seulement</div>
        </Card>
        <Card style={{ flex: 1, padding: 26 }}>
          <div style={HK({ fontSize: 15, fontWeight: 700, color: M, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 })}>Typo</div>
          <div style={NR({ fontSize: 34, color: T })}>Newsreader italique</div>
          <div style={HK({ fontSize: 13, color: "#5b6b6d", margin: "4px 0 14px" })}>mots d&apos;humeur, signature</div>
          <div style={HK({ fontWeight: 700, fontSize: 20, color: M })}>Hanken Grotesk</div>
          <div style={HK({ fontSize: 13, color: "#5b6b6d", marginTop: 4 })}>titres, légendes, CTA</div>
        </Card>
        <Card style={{ flex: 1, padding: 26 }}>
          <div style={HK({ fontSize: 15, fontWeight: 700, color: M, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 })}>Avatar</div>
          <div style={HK({ fontSize: 14, color: "#3d4d4f", lineHeight: 1.7 })}>
            Buste fixe (photo). Zone vêtement + zone décor modifiables à chaque épisode. Jamais l&apos;inverse.
          </div>
        </Card>
        <Card style={{ flex: 1, padding: 26 }}>
          <div style={HK({ fontSize: 15, fontWeight: 700, color: M, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 })}>Structure épisode</div>
          <div style={HK({ fontSize: 14, color: "#3d4d4f", lineHeight: 1.9 })}>
            1 · Hook (humeur)<br />
            2 · Gag visuel<br />
            3 · Macro broderie <span style={{ color: AM, fontWeight: 700 }}>★ obligatoire</span><br />
            4 · CTA « à ta commande »
          </div>
        </Card>
      </div>
      <div style={{ marginTop: 24, background: M, borderRadius: 18, padding: "24px 30px", display: "flex", gap: 40, alignItems: "center" }}>
        <div style={HK({ fontSize: 15, fontWeight: 700, color: CR, textTransform: "uppercase", letterSpacing: "1px", flexShrink: 0 })}>
          Checklist avant publication
        </div>
        <div style={HK({ fontSize: 14, color: "#cfe0dc" })}>
          Mot brodé lisible ✓ &nbsp;·&nbsp; Pas de terracotta ✓ &nbsp;·&nbsp; Signature présente ✓ &nbsp;·&nbsp; Amplis saisonniers en décor seulement ✓
        </div>
      </div>
    </div>
  );
}

function Slide10() {
  return (
    <div style={{ width: 1920, height: 1080, background: CR, ...HK(), padding: 80, boxSizing: "border-box", overflow: "hidden" }}>
      <SlideHeader eyebrow="Feuille de route" title="Simple assumé – Premium" />
      <div style={{ display: "flex", gap: 30, marginTop: 48 }}>
        <Card style={{ flex: 1, padding: 36 }}>
          <div style={{ display: "inline-block", background: M, color: CR, padding: "8px 20px", borderRadius: 100, ...HK({ fontSize: 14, fontWeight: 700, letterSpacing: "1px" }) }}>
            LIVRÉ AUJOURD&apos;HUI
          </div>
          <div style={HK({ fontSize: 26, fontWeight: 700, color: M, marginTop: 18 })}>Niveau simple assumé</div>
          <div style={HK({ fontSize: 16, color: "#3d4d4f", lineHeight: 2, marginTop: 16 })}>
            ✓ Avatar cutout plat, aplats francs<br />
            ✓ Décor motif simple (pois, rayures)<br />
            ✓ Texte CTA statique<br />
            ✓ Macro broderie brute, sans retouche<br />
            ✓ 4 frames fixes, montage cut-to-cut
          </div>
        </Card>
        <div style={{ flex: 1, background: "#fff", borderRadius: 20, padding: 36, border: `2px dashed ${AM}`, position: "relative" }}>
          <div style={{ display: "inline-block", border: `2px solid ${AM}`, color: AM, padding: "8px 20px", borderRadius: 100, ...HK({ fontSize: 14, fontWeight: 700, letterSpacing: "1px" }) }}>
            PHASE 2
          </div>
          <div style={HK({ fontSize: 26, fontWeight: 700, color: M, marginTop: 18 })}>Niveau premium</div>
          <div style={HK({ fontSize: 16, color: "#7d8a83", lineHeight: 2, marginTop: 16 })}>
            → Ombres portées & textures papier<br />
            → Micro-animations (clignement, tissu)<br />
            → Décor illustré riche par saison<br />
            → Macro broderie retouchée pro (grain, lumière)<br />
            → Transitions animées entre frames
          </div>
          <div style={{ position: "absolute", bottom: 24, right: 32, ...HK({ fontSize: 13, color: AM, fontWeight: 700 }) }}>
            À concevoir une fois le simple validé →
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Slide registry ────────────────────────────────────────────────────────────

const SLIDES = [
  { num: "01", label: "Couverture", Component: Slide01 },
  { num: "02", label: "Couleurs & typo", Component: Slide02 },
  { num: "03", label: "Grammaire & garde-fous", Component: Slide03 },
  { num: "04", label: "Template avatar", Component: Slide04 },
  { num: "05", label: "Template épisode", Component: Slide05 },
  { num: "06", label: "Pilote – HAPPY", Component: Slide06 },
  { num: "07", label: "Pilote – SAD DAY", Component: Slide07 },
  { num: "08", label: "Pilote – Retraite", Component: Slide08 },
  { num: "09", label: "Planche récap", Component: Slide09 },
  { num: "10", label: "Simple vs Premium", Component: Slide10 },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export function MoodSection() {
  const [current, setCurrent] = useState(0);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setScale(containerRef.current.offsetWidth / 1920);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const prev = useCallback(() => setCurrent((c) => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent((c) => Math.min(SLIDES.length - 1, c + 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  const { Component } = SLIDES[current];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", fontFamily: "var(--font-sans)" }}>
      <header style={{ marginBottom: 24, display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <BookOpen size={18} style={{ color: "#1E6E77" }} />
            <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 28, fontWeight: 500, margin: 0 }}>
              Kit visuel Mood brodé
            </h1>
          </div>
          <p style={{ fontSize: 14, opacity: 0.6, margin: 0 }}>
            Guide de production pour Maï – {SLIDES.length} planches · ← → pour naviguer
          </p>
        </div>
      </header>

      {/* Slide viewer */}
      <div ref={containerRef} style={{ width: "100%", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 32px rgba(0,0,0,0.12)" }}>
        <div style={{ width: "100%", paddingTop: `${(1080 / 1920) * 100}%`, position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, transformOrigin: "top left", transform: `scale(${scale})` }}>
              <Component />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, gap: 12 }}>
        <button onClick={prev} disabled={current === 0} style={navBtnStyle(current === 0)}>
          <ChevronLeft size={15} /> Précédent
        </button>

        {/* Dot strip */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center" }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: i === current ? 28 : 8, height: 8,
                borderRadius: 4,
                background: i === current ? "#1E6E77" : "#D4CFC8",
                border: "none", cursor: "pointer", padding: 0,
                transition: "width 0.2s, background 0.2s",
              }}
            />
          ))}
        </div>

        <button onClick={next} disabled={current === SLIDES.length - 1} style={navBtnStyle(current === SLIDES.length - 1)}>
          Suivant <ChevronRight size={15} />
        </button>
      </div>

      {/* Slide label */}
      <div style={{ textAlign: "center", margin: "8px 0 20px", fontSize: 13, opacity: 0.55, fontFamily: "var(--font-sans)" }}>
        {SLIDES[current].num} / {SLIDES.length} — {SLIDES[current].label}
      </div>

      {/* Thumbnail strip */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
        {SLIDES.map((s, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            title={s.label}
            style={{
              flexShrink: 0,
              padding: "8px 12px",
              borderRadius: 8,
              border: `2px solid ${i === current ? "#1E6E77" : "transparent"}`,
              background: i === current ? "#EBF4F5" : "#F0EDE8",
              cursor: "pointer",
              textAlign: "left",
              minWidth: 90,
            }}
          >
            <div style={{ fontSize: 10, fontFamily: "var(--font-sans)", fontWeight: 700, color: "#1E6E77", opacity: 0.7, marginBottom: 2 }}>
              {s.num}
            </div>
            <div style={{ fontSize: 10, fontFamily: "var(--font-sans)", fontWeight: 600, color: "#16324C", lineHeight: 1.3 }}>
              {s.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 4,
  padding: "8px 14px", borderRadius: 8,
  background: disabled ? "#F0EDE8" : "#1E6E77",
  color: disabled ? "#aaa" : "#fff",
  border: "none", cursor: disabled ? "default" : "pointer",
  fontSize: 13, fontFamily: "var(--font-sans)", fontWeight: 500,
});
