import { useState, useCallback } from "react";

const CREAM = "#F5F0EA";
const INK = "#1E2D4A";
const TERRA = "#C4694A";
const TERRA_LIGHT = "#C4694A18";
const TERRA_BORDER = "#C4694A55";

const BRAND_SYSTEM = `Tu es le directeur créatif IA d'Ypersoa, marque de broderie personnalisée sur métier Tajima, basée à Wattrelos (Nord).

IDENTITÉ DE MARQUE :
- Artisanat Tajima, personnalisation émotionnelle, ancrage local nordiste
- Toujours "tu". Jamais "brodé à la main" → toujours "brodé sur métier Tajima"
- Palette : Crème #F5F0EA, Encre #1E2D4A, Terracotta #C4694A
- Fonts marque : Cormorant Garamond + DM Sans

TONE OF VOICE : Chaleureux, direct, humain, artisanal premium. Pas corporate. Jamais clinique.
UNIVERS PRODUITS : Cadeaux de naissance, mariage, baptême, sport, famille, fêtes.
CIBLE : Femmes 25-45 ans, parents, passionnés de personnalisation, cadeaux premium.
PLATEFORMES : Instagram, Pinterest, Facebook, Etsy.
RÈGLES CRÉATIVES : Storytelling émotionnel. Montrer l'humain derrière la broderie. Valoriser le fait local et artisanal. Jamais générique.`;

const TABS = [
  { id: "mentor",    icon: "✦", label: "Mentor" },
  { id: "shoots",    icon: "◎", label: "Shoots" },
  { id: "content",   icon: "✍", label: "Contenu RS" },
  { id: "ads",       icon: "⚡", label: "Ads" },
  { id: "mannequin", icon: "◈", label: "Mannequin" },
];

const BADGE_GROUPS = {
  mentor_obj:   ["Lancer une campagne", "Booster l'engagement", "Direction créative", "Préparer une collab", "Analyser ma stratégie"],
  mentor_mode:  ["Brief créatif 7 jours", "Audit contenu rapide", "Plan de campagne", "Idées virales ×5", "Deep dive stratégie"],
  shoot_prod:   ["Body bébé brodé", "Doudou personnalisé", "Sweat famille", "Sac tote", "Casquette", "Bonnet", "Pyjama naissance"],
  shoot_style:  ["Editorial", "Lifestyle", "Flat lay", "Close-up Tajima", "Ambiance nordiste", "Cadeau unboxing", "Saison / nature"],
  shoot_plat:   ["Instagram feed", "Instagram Reel", "Pinterest", "Etsy cover", "Meta Ads"],
  shoot_mood:   ["Crème & naturel", "Terracotta chaud", "Encre & contraste", "Pastel doux", "Blanc épuré"],
  ct_plat:      ["Instagram", "Pinterest", "Facebook", "Etsy"],
  ct_type:      ["Post carrousel", "Reel caption", "Story texte", "Description produit", "Bio / About"],
  ct_mood:      ["Émotionnel", "Storytelling", "Éducatif", "Promotionnel", "Saisonnier"],
  ct_opts:      ["Inclure hashtags", "Inclure CTA", "Version courte + longue", "Version EN", "Ajouter émojis"],
  ads_obj:      ["Notoriété marque", "Trafic boutique", "Conversion achat", "Retargeting", "Engagement"],
  ads_fmt:      ["Meta carousel", "Meta vidéo", "Pinterest promoted", "Instagram story ad", "Google search"],
  ads_angle:    ["Cadeau parfait", "Artisan local", "Unicité Tajima", "Émotion parentale", "Urgence / stock limité"],
  ads_target:   ["Futurs parents", "Famille & proches", "Amateurs broderie", "Cadeaux B2B", "Mariages"],
  mq_coll:      ["Naissance & bébé", "Mariage & baptême", "Sport & casual", "Famille", "Saison hivernale", "Fête des mères"],
  mq_decor:     ["Intérieur nordiste", "Atelier couture", "Plein air naturel", "Studio crème épuré", "Maison familiale"],
  mq_type:      ["Femme 28–35 ans", "Maman avec bébé", "Couple avec enfant", "Enfant seul", "Mains artisan"],
  mq_intent:    ["Proche & intime", "Magazine editorial", "Authentique & naturel", "Produit mis en valeur", "Storytelling émotionnel"],
};

function Badge({ label, selected, onToggle }) {
  return (
    <span
      onClick={onToggle}
      style={{
        display: "inline-block",
        fontSize: 11,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "4px 10px",
        borderRadius: 20,
        margin: "3px 3px 3px 0",
        cursor: "pointer",
        border: selected ? `1px solid ${TERRA_BORDER}` : "1px solid #ccc4",
        background: selected ? TERRA_LIGHT : "transparent",
        color: selected ? TERRA : "inherit",
        fontWeight: selected ? 500 : 400,
        transition: "all 0.15s",
      }}
    >
      {label}
    </span>
  );
}

function BadgeGroup({ groupId, selections, onToggle }) {
  const items = BADGE_GROUPS[groupId] || [];
  return (
    <div style={{ marginBottom: 4 }}>
      {items.map((item) => (
        <Badge
          key={item}
          label={item}
          selected={selections[groupId]?.has(item)}
          onToggle={() => onToggle(groupId, item)}
        />
      ))}
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: "0.09em", textTransform: "uppercase", color: "#999", marginBottom: 6, marginTop: 14, fontWeight: 500 }}>
      {children}
    </div>
  );
}

function TextArea({ id, placeholder, value, onChange }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      style={{
        width: "100%", boxSizing: "border-box", border: "1px solid #ccc4",
        borderRadius: 8, padding: "9px 12px", fontSize: 13, lineHeight: 1.55,
        fontFamily: "inherit", resize: "vertical", background: "transparent", color: "inherit",
        outline: "none",
      }}
    />
  );
}

function Output({ text, loading }) {
  const [copied, setCopied] = useState(false);
  if (!text && !loading) return null;
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div style={{
      marginTop: 16, padding: "14px 16px", borderRadius: 10,
      border: `1px solid ${TERRA_BORDER}`, background: TERRA_LIGHT,
      fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-wrap", position: "relative",
    }}>
      {loading ? (
        <span style={{ color: TERRA }}>
          <span style={{ animation: "pulse 1s infinite", display: "inline-block" }}>●</span>
          {" "}Génération en cours…
        </span>
      ) : (
        <>
          <button
            onClick={handleCopy}
            style={{
              position: "absolute", top: 10, right: 12, fontSize: 10,
              letterSpacing: "0.07em", textTransform: "uppercase", background: "none",
              border: "none", cursor: "pointer", color: copied ? TERRA : "#999",
            }}
          >
            {copied ? "Copié ✓" : "Copier"}
          </button>
          {text}
        </>
      )}
    </div>
  );
}

function GenButton({ onClick, loading, label = "Générer ↗" }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        marginTop: 14, width: "100%", padding: "11px 20px",
        background: loading ? "#ccc" : INK, color: CREAM,
        border: "none", borderRadius: 8, fontSize: 11,
        letterSpacing: "0.1em", textTransform: "uppercase",
        cursor: loading ? "not-allowed" : "pointer", fontWeight: 500,
        fontFamily: "inherit", transition: "background 0.2s",
      }}
    >
      {loading ? "Génération…" : label}
    </button>
  );
}

async function callAPI(prompt) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: BRAND_SYSTEM,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await resp.json();
  return data.content?.map((c) => c.text || "").join("") || "Erreur de génération.";
}

function useGenerator() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const run = useCallback(async (prompt) => {
    setLoading(true);
    setOutput("");
    try {
      const result = await callAPI(prompt);
      setOutput(result);
    } catch {
      setOutput("Erreur de connexion.");
    }
    setLoading(false);
  }, []);
  return { loading, output, run };
}

function MentorTab({ sel, onToggle }) {
  const [ctx, setCtx] = useState("");
  const { loading, output, run } = useGenerator();
  const go = () => {
    const obj = [...(sel.mentor_obj || [])].join(", ") || "non précisé";
    const mode = [...(sel.mentor_mode || [])].join(", ") || "non précisé";
    run(`Objectif : ${obj}. Mode : ${mode}. Contexte : "${ctx || "non précisé"}".

En tant que mentor créatif Ypersoa, délivre : 1) une lecture directe de la situation 2) les défis créatifs concrets avec actions précises 3) une idée de contenu inédite à tester cette semaine. Sois direct, challenging, humain. 350 mots max.`);
  };
  return (
    <div>
      <div style={{ padding: "12px 14px", borderRadius: 10, borderLeft: `3px solid ${TERRA}`, background: TERRA_LIGHT, marginBottom: 14 }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 16, marginBottom: 4 }}>Ton mentor créatif Ypersoa</div>
        <div style={{ fontSize: 12, lineHeight: 1.6, color: "#888" }}>Je t'analyse, je te challenge, je t'aide à créer du contenu qui construit une vraie communauté.</div>
      </div>
      <Label>Ton objectif du moment</Label>
      <BadgeGroup groupId="mentor_obj" selections={sel} onToggle={onToggle} />
      <Label>Ce que tu ressens / blocages actuels</Label>
      <TextArea placeholder="Ex : Je manque d'inspiration pour les Reels, j'ai du stock de photos mais je sais pas quoi en faire…" value={ctx} onChange={setCtx} />
      <Label>Mode de challenge</Label>
      <BadgeGroup groupId="mentor_mode" selections={sel} onToggle={onToggle} />
      <GenButton onClick={go} loading={loading} label="Lance le mentor ↗" />
      <Output text={output} loading={loading} />
    </div>
  );
}

function ShootsTab({ sel, onToggle }) {
  const [extra, setExtra] = useState("");
  const { loading, output, run } = useGenerator();
  const go = () => {
    const prod = [...(sel.shoot_prod || [])].join(", ") || "à définir";
    const style = [...(sel.shoot_style || [])].join(", ") || "à définir";
    const plat = [...(sel.shoot_plat || [])].join(", ") || "à définir";
    const mood = [...(sel.shoot_mood || [])].join(", ") || "à définir";
    run(`Génère un prompt product shoot IA ultra-détaillé : Produit: ${prod} / Style: ${style} / Plateforme: ${plat} / Palette: ${mood} / Notes: "${extra || "aucune"}".

Délivre : 1) Prompt Midjourney complet EN format /imagine 2) Brief photographique FR pour vraie séance (150 mots) 3) 2 variantes créatives alternatives. Respecte scrupuleusement l'univers Ypersoa.`);
  };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><Label>Produit à shooter</Label><BadgeGroup groupId="shoot_prod" selections={sel} onToggle={onToggle} /></div>
        <div><Label>Style visuel</Label><BadgeGroup groupId="shoot_style" selections={sel} onToggle={onToggle} /></div>
        <div><Label>Plateforme cible</Label><BadgeGroup groupId="shoot_plat" selections={sel} onToggle={onToggle} /></div>
        <div><Label>Mood palette</Label><BadgeGroup groupId="shoot_mood" selections={sel} onToggle={onToggle} /></div>
      </div>
      <Label>Contexte ou contrainte spécifique</Label>
      <TextArea placeholder="Ex : Zoom sur le fil Tajima, fond lin naturel, lumière matinale…" value={extra} onChange={setExtra} />
      <GenButton onClick={go} loading={loading} label="Générer le prompt shoot ↗" />
      <Output text={output} loading={loading} />
    </div>
  );
}

function ContentTab({ sel, onToggle }) {
  const [sujet, setSujet] = useState("");
  const { loading, output, run } = useGenerator();
  const go = () => {
    const plat = [...(sel.ct_plat || [])].join(", ") || "Instagram";
    const type = [...(sel.ct_type || [])].join(", ") || "post";
    const mood = [...(sel.ct_mood || [])].join(", ") || "émotionnel";
    const opts = [...(sel.ct_opts || [])].join(", ") || "standard";
    run(`Crée du contenu RS Ypersoa : Plateforme: ${plat} / Format: ${type} / Mood: ${mood} / Options: ${opts} / Sujet: "${sujet || "broderie personnalisée"}".

Contenu prêt à publier, tone of voice Ypersoa : chaleureux, artisanal, humain. Toujours "tu". Respecte les options demandées.`);
  };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div><Label>Plateforme</Label><BadgeGroup groupId="ct_plat" selections={sel} onToggle={onToggle} /></div>
        <div><Label>Format</Label><BadgeGroup groupId="ct_type" selections={sel} onToggle={onToggle} /></div>
        <div><Label>Mood</Label><BadgeGroup groupId="ct_mood" selections={sel} onToggle={onToggle} /></div>
      </div>
      <Label>Sujet / produit / occasion</Label>
      <TextArea placeholder="Ex : Body naissance prénom MALO en fil terracotta, cadeau original, livraison express…" value={sujet} onChange={setSujet} />
      <Label>Options de rendu</Label>
      <BadgeGroup groupId="ct_opts" selections={sel} onToggle={onToggle} />
      <GenButton onClick={go} loading={loading} label="Générer le contenu RS ↗" />
      <Output text={output} loading={loading} />
    </div>
  );
}

function AdsTab({ sel, onToggle }) {
  const [extra, setExtra] = useState("");
  const { loading, output, run } = useGenerator();
  const go = () => {
    const obj = [...(sel.ads_obj || [])].join(", ") || "conversion";
    const fmt = [...(sel.ads_fmt || [])].join(", ") || "Meta";
    const angle = [...(sel.ads_angle || [])].join(", ") || "émotion";
    const target = [...(sel.ads_target || [])].join(", ") || "parents";
    run(`Crée une publicité Ypersoa : Objectif: ${obj} / Format: ${fmt} / Angle: ${angle} / Cible: ${target} / Offre: "${extra || "broderie personnalisée Tajima"}".

Délivre : 1) Hook (<10 mots) 2) Body copy (50–80 mots) 3) CTA fort 4) Suggestion créatif visuel 5) Variante A/B. Ton Ypersoa, pas de jargon pub générique.`);
  };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><Label>Objectif campagne</Label><BadgeGroup groupId="ads_obj" selections={sel} onToggle={onToggle} /></div>
        <div><Label>Format Ad</Label><BadgeGroup groupId="ads_fmt" selections={sel} onToggle={onToggle} /></div>
        <div><Label>Angle créatif</Label><BadgeGroup groupId="ads_angle" selections={sel} onToggle={onToggle} /></div>
        <div><Label>Audience cible</Label><BadgeGroup groupId="ads_target" selections={sel} onToggle={onToggle} /></div>
      </div>
      <Label>Produit / offre à mettre en avant</Label>
      <TextArea placeholder="Ex : Pack naissance complet, -15% fête des mères, livraison garantie 5 jours…" value={extra} onChange={setExtra} />
      <GenButton onClick={go} loading={loading} label="Générer l'Ad ↗" />
      <Output text={output} loading={loading} />
    </div>
  );
}

function MannequinTab({ sel, onToggle }) {
  const [notes, setNotes] = useState("");
  const { loading, output, run } = useGenerator();
  const go = () => {
    const coll = [...(sel.mq_coll || [])].join(", ") || "naissance";
    const decor = [...(sel.mq_decor || [])].join(", ") || "intérieur";
    const type = [...(sel.mq_type || [])].join(", ") || "maman";
    const intent = [...(sel.mq_intent || [])].join(", ") || "émotionnel";
    run(`Crée un brief mannequin virtuel Ypersoa : Collection: ${coll} / Décor: ${decor} / Mannequin: ${type} / Intention: ${intent} / Notes: "${notes || "aucune"}".

Délivre : 1) Brief mannequin FR (styling, pose, expression, ambiance — 150 mots) 2) Prompt Midjourney EN complet 3) Légende Instagram prête à publier basée sur ce visuel.`);
  };
  return (
    <div>
      <div style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid #ccc4", marginBottom: 14, fontSize: 12, lineHeight: 1.6, color: "#888" }}>
        <span style={{ fontFamily: "Georgia, serif", fontSize: 15, color: "inherit", display: "block", marginBottom: 3 }}>◈ Mannequin virtuel Ypersoa</span>
        Brief complet pour ton mannequin de marque — univers, pose, styling — + prompt Midjourney + légende RS.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><Label>Collection / univers</Label><BadgeGroup groupId="mq_coll" selections={sel} onToggle={onToggle} /></div>
        <div><Label>Ambiance & décor</Label><BadgeGroup groupId="mq_decor" selections={sel} onToggle={onToggle} /></div>
        <div><Label>Type de mannequin</Label><BadgeGroup groupId="mq_type" selections={sel} onToggle={onToggle} /></div>
        <div><Label>Intention visuelle</Label><BadgeGroup groupId="mq_intent" selections={sel} onToggle={onToggle} /></div>
      </div>
      <Label>Notes libres (produit porté, couleurs fil, détails…)</Label>
      <TextArea placeholder="Ex : Body crème brodé prénom LÉON en fil terracotta, mannequin tient le vêtement…" value={notes} onChange={setNotes} />
      <GenButton onClick={go} loading={loading} label="Générer le brief mannequin ↗" />
      <Output text={output} loading={loading} />
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("mentor");
  const [selections, setSelections] = useState({});

  const handleToggle = useCallback((group, value) => {
    setSelections((prev) => {
      const next = { ...prev };
      const set = new Set(prev[group] || []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      next[group] = set;
      return next;
    });
  }, []);

  const renderTab = () => {
    const props = { sel: selections, onToggle: handleToggle };
    switch (activeTab) {
      case "mentor":    return <MentorTab    {...props} />;
      case "shoots":    return <ShootsTab    {...props} />;
      case "content":   return <ContentTab   {...props} />;
      case "ads":       return <AdsTab       {...props} />;
      case "mannequin": return <MannequinTab {...props} />;
      default:          return null;
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 13 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #ccc3" }}>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 24, fontWeight: 600, letterSpacing: "0.14em", color: TERRA }}>YPERSOA</div>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#999" }}>AI Content Studio</div>
        <div style={{ marginLeft: "auto", fontSize: 10, color: "#bbb", letterSpacing: "0.06em" }}>✦ Mentor actif</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid #ccc3", overflowX: "auto" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "8px 16px", fontSize: 11, letterSpacing: "0.07em",
              textTransform: "uppercase", fontWeight: 500, cursor: "pointer",
              border: "none", background: "transparent", whiteSpace: "nowrap",
              borderBottom: activeTab === t.id ? `2px solid ${TERRA}` : "2px solid transparent",
              color: activeTab === t.id ? TERRA : "#999",
              fontFamily: "inherit", transition: "color 0.15s",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div>{renderTab()}</div>
    </div>
  );
}
