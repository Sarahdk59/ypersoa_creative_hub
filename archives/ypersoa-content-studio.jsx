import { useState, useRef } from "react";

const PILLARS = [
  { id: "process", label: "Process", sub: null, desc: "Coulisses Tajima, savoir-faire, fabrication" },
  {
    id: "emotion", label: "Émotion", desc: "Lien affectif, cadeau, moment de vie",
    sub: [
      { id: "lien", label: "Lien", hook: "Pas un cadeau. Un lien. Pour toujours." },
      { id: "souvenir", label: "Souvenir", hook: "Certains cadeaux deviennent des souvenirs." },
      { id: "presence", label: "Présence", hook: "Même loin. Ta présence. Brodée." },
    ]
  },
  { id: "produit", label: "Produit", sub: null, desc: "Configurateur, catalogue, personnalisation" },
  { id: "preuve", label: "Preuve", sub: null, desc: "Avis clients, délais, social proof" },
];

const FORMATS = [
  { id: "post", label: "Post", icon: "▣", note: "Image + caption" },
  { id: "carrousel", label: "Carrousel", icon: "◧", note: "5–7 slides" },
  { id: "reel", label: "Reel", icon: "▷", note: "Script + vignette" },
];

const SYSTEM_PROMPT = `Tu es le directeur créatif d'Ypersoa, marque française de broderie personnalisée sur métier Tajima TMEZ, basée à Wattrelos (Nord de France).
IDENTITÉ : Cream #F5F0EA, Ink #1E2D4A, Terracotta #C4694A. Josefin Sans titres, DM Sans corps.
TON : tutoiement, élégant, poétique, jamais urgentiste.
INTERDIT : "brodé à la main" → toujours "brodé sur métier Tajima". Jamais "trace" comme mot émotionnel → lien, souvenir, présence. Jamais Etsy.
PRODUITS : 17 motifs, 20 coloris, sweat/hoodie/t-shirt, livraison 72h, made in France.
FORMAT : JSON strict uniquement, sans markdown ni backticks.`;

function buildPrompt(format, pillar, sub) {
  const lbl = pillar.id === "emotion" && sub
    ? `Émotion — variante "${sub.label}" (hook de référence : "${sub.hook}")`
    : pillar.label;

  const imgField = `"image_prompt": "Detailed English prompt for AI image generation (Flux model): editorial product photography, [describe precise scene], cream linen background, Tajima embroidery close-up detail, warm soft natural light, terracotta thread, navy blue garment folds, minimal clean composition, no text no watermark, photorealistic, 60 words max"`;

  if (format.id === "post") return `Post Instagram statique Ypersoa. Pilier: ${lbl}.
JSON: {"hook":"accroche visuelle max 6 mots Josefin Sans bold","subhook":"sous-titre 8 mots italic","caption":"légende 80-100 mots tutoiement CTA lien bio",${imgField},"cta":"CTA court 8 mots","hashtags":["5 hashtags pertinents sans #"]}`;

  if (format.id === "carrousel") return `Carrousel 6 slides Instagram Ypersoa. Pilier: ${lbl}.
JSON: {"hook":"accroche slide 1 max 6 mots","slides":[{"num":1,"titre":"...","texte":"..."},{"num":2,"titre":"...","texte":"..."},{"num":3,"titre":"...","texte":"..."},{"num":4,"titre":"...","texte":"..."},{"num":5,"titre":"...","texte":"..."},{"num":6,"titre":"...","texte":"..."}],"caption":"légende 60-80 mots tutoiement",${imgField},"hashtags":["5 hashtags"]}`;

  return `Script Reel 15-20s Instagram Ypersoa. Pilier: ${lbl}.
JSON: {"hook":"overlay hook max 6 mots","script":[{"timecode":"0-3s","plan":"...","overlay":"...","voix":"..."},{"timecode":"3-8s","plan":"...","overlay":"...","voix":"..."},{"timecode":"8-13s","plan":"...","overlay":"...","voix":"..."},{"timecode":"13-17s","plan":"...","overlay":"...","voix":"..."},{"timecode":"17-20s","plan":"...","overlay":"...","voix":"..."}],"musique":"direction musicale genre tempo ambiance","caption":"70-90 mots tutoiement",${imgField},"hashtags":["5 hashtags"]}`;
}

function buildImageUrl(prompt) {
  const full = `${prompt}, Ypersoa brand editorial, cream background, embroidery texture detail, no text, no watermark`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=1080&height=1080&nologo=true&model=flux&seed=${Math.floor(Math.random() * 99999)}`;
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:ital,wght@0,300;0,400;0,600;0,700;1,300&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.app{font-family:'DM Sans',sans-serif;background:#F5F0EA;min-height:100vh;color:#1E2D4A;}
.hdr{background:#1E2D4A;padding:20px 28px;border-bottom:2px solid #C4694A;display:flex;align-items:center;gap:16px;}
.htitle{font-family:'Josefin Sans',sans-serif;font-size:17px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#F5F0EA;}
.hsub{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#C4694A;margin-top:2px;}
.layout{display:grid;grid-template-columns:250px 1fr;min-height:calc(100vh - 62px);}
.side{background:white;border-right:1px solid #EDE8E0;padding:18px 14px;display:flex;flex-direction:column;gap:5px;overflow-y:auto;}
.sl{font-family:'Josefin Sans',sans-serif;font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#C4694A;margin:14px 0 8px 2px;}
.sl:first-child{margin-top:2px;}
.fb{background:#F5F0EA;border:1.5px solid #EDE8E0;border-radius:7px;padding:9px 11px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:border-color .12s,background .12s;width:100%;}
.fb:hover{border-color:#1E2D4A;}
.fb.on{background:#1E2D4A;border-color:#1E2D4A;}
.fi{font-size:14px;color:#C4694A;width:16px;text-align:center;flex-shrink:0;}
.fn{font-family:'Josefin Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#1E2D4A;}
.fb.on .fn{color:#F5F0EA;}
.fnt{font-size:10px;color:#bbb;margin-left:auto;}
.fb.on .fnt{color:rgba(245,240,234,.35);}
.pb{background:#F5F0EA;border:1.5px solid #EDE8E0;border-radius:7px;padding:9px 11px;cursor:pointer;text-align:left;transition:all .12s;width:100%;}
.pb:hover{border-color:#1E2D4A;}
.pb.on{background:#1E2D4A;border-color:#1E2D4A;}
.pn{font-family:'Josefin Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#1E2D4A;margin-bottom:2px;}
.pb.on .pn{color:#F5F0EA;}
.pd{font-size:10px;color:#bbb;line-height:1.4;}
.pb.on .pd{color:rgba(245,240,234,.35);}
.subrow{display:flex;gap:5px;flex-wrap:wrap;padding:0 2px;}
.sbt{background:white;border:1.5px solid #EDE8E0;border-radius:20px;padding:5px 11px;cursor:pointer;font-size:10px;font-family:'Josefin Sans',sans-serif;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#1E2D4A;transition:all .12s;}
.sbt:hover{border-color:#C4694A;color:#C4694A;}
.sbt.on{background:#C4694A;border-color:#C4694A;color:white;}
.hint{font-size:9px;color:#bbb;font-style:italic;padding:2px 4px 4px;line-height:1.5;}
.gbtn{margin:14px 2px 0;background:#C4694A;color:white;border:none;border-radius:7px;padding:11px;font-family:'Josefin Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;cursor:pointer;transition:background .12s;display:flex;align-items:center;justify-content:center;gap:7px;width:calc(100% - 4px);}
.gbtn:hover:not(:disabled){background:#b55a3d;}
.gbtn:disabled{background:#ccc;cursor:not-allowed;}
.spin{width:11px;height:11px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:sp .7s linear infinite;}
@keyframes sp{to{transform:rotate(360deg);}}
.errbox{background:#fff0ed;border:1px solid #f5c4b0;border-radius:6px;padding:9px 12px;font-size:11px;color:#8B3A20;margin-top:6px;}
.canvas{padding:22px 26px;overflow-y:auto;}
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px;color:#ccc;text-align:center;}
.eico{font-size:36px;opacity:.25;}
.etxt{font-family:'Josefin Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;}
.card{background:white;border-radius:12px;border:1px solid #EDE8E0;overflow:hidden;}
.chdr{background:#1E2D4A;padding:11px 16px;display:flex;align-items:center;gap:7px;}
.ctitle{font-family:'Josefin Sans',sans-serif;font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#F5F0EA;}
.cdot{width:5px;height:5px;border-radius:50%;background:#C4694A;flex-shrink:0;}
.cbody{padding:18px;display:flex;flex-direction:column;gap:14px;}
.row{border-left:2px solid #EDE8E0;padding-left:11px;}
.row.acc{border-left-color:#C4694A;}
.rl{font-family:'Josefin Sans',sans-serif;font-size:8px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#C4694A;margin-bottom:5px;}
.hook{font-family:'Josefin Sans',sans-serif;font-size:22px;font-weight:700;letter-spacing:.03em;color:#1E2D4A;line-height:1.1;}
.subhook{font-size:13px;color:#999;font-style:italic;margin-top:3px;line-height:1.35;}
.btext{font-size:13px;line-height:1.75;color:#333;white-space:pre-line;}
.vis{background:#F5F0EA;border-radius:7px;padding:9px 12px;font-size:11px;line-height:1.6;color:#777;font-style:italic;}
.tags{display:flex;flex-wrap:wrap;gap:5px;}
.tag{background:#EDE8E0;color:#1E2D4A;font-size:10px;padding:3px 9px;border-radius:20px;font-family:'Josefin Sans',sans-serif;font-weight:700;letter-spacing:.05em;}
.cpbtn{background:none;border:1px solid #EDE8E0;border-radius:5px;padding:5px 9px;font-size:9px;font-family:'Josefin Sans',sans-serif;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#bbb;cursor:pointer;margin-left:auto;display:block;margin-top:7px;transition:all .12s;}
.cpbtn:hover{border-color:#1E2D4A;color:#1E2D4A;}
.imgblock{display:flex;flex-direction:column;gap:10px;}
.imgframe{border-radius:9px;overflow:hidden;border:1px solid #EDE8E0;background:#EDE8E0;aspect-ratio:1;display:flex;align-items:center;justify-content:center;position:relative;}
.imgframe img{width:100%;height:100%;object-fit:cover;}
.imgspin{display:flex;flex-direction:column;align-items:center;gap:9px;color:#bbb;}
.is{width:22px;height:22px;border:2px solid #EDE8E0;border-top-color:#C4694A;border-radius:50%;animation:sp .9s linear infinite;}
.inote{font-family:'Josefin Sans',sans-serif;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#bbb;}
.imgacts{display:flex;gap:6px;flex-wrap:wrap;}
.ibtn{background:none;border:1.5px solid #EDE8E0;border-radius:6px;padding:6px 12px;font-size:10px;font-family:'Josefin Sans',sans-serif;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#999;cursor:pointer;transition:all .12s;}
.ibtn:hover{border-color:#C4694A;color:#C4694A;}
.ibtn.pri{background:#C4694A;border-color:#C4694A;color:white;}
.ibtn.pri:hover{background:#b55a3d;}
.slides{display:flex;flex-direction:column;gap:7px;}
.slide{background:#F5F0EA;border-radius:7px;padding:9px 11px;display:flex;gap:9px;}
.snum{font-family:'Josefin Sans',sans-serif;font-size:10px;font-weight:700;color:#C4694A;min-width:18px;padding-top:1px;}
.stit{font-size:12px;font-weight:500;color:#1E2D4A;margin-bottom:2px;}
.stxt{font-size:11px;color:#555;line-height:1.5;}
.seqs{display:flex;flex-direction:column;}
.seq{display:grid;grid-template-columns:48px 1fr;gap:8px;padding:7px 0;border-bottom:.5px solid #EDE8E0;}
.seq:last-child{border-bottom:none;}
.tc{font-family:'Josefin Sans',sans-serif;font-size:9px;font-weight:700;color:#C4694A;padding-top:2px;letter-spacing:.06em;}
.spl{font-size:12px;color:#333;line-height:1.5;margin-bottom:3px;}
.sovl{display:inline-block;font-size:11px;font-weight:700;color:#1E2D4A;background:#EDE8E0;padding:2px 7px;border-radius:4px;font-family:'Josefin Sans',sans-serif;letter-spacing:.04em;}
.svo{font-size:10px;color:#aaa;font-style:italic;margin-top:3px;}
`;

function ImageBlock({ prompt }) {
  const [status, setStatus] = useState("idle");
  const [src, setSrc] = useState(null);
  const [copied, setCopied] = useState(false);

  const gen = () => { setStatus("loading"); setSrc(buildImageUrl(prompt)); };
  const regen = () => { setStatus("loading"); setSrc(null); setTimeout(() => setSrc(buildImageUrl(prompt)), 50); };
  const copyPrompt = () => { navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="imgblock">
      <div className="vis">{prompt}</div>
      <div className="imgacts">
        {!src && <button className="ibtn pri" onClick={gen}>Générer l'image →</button>}
        {src && <button className="ibtn" onClick={regen}>↺ Regénérer</button>}
        {src && status === "ready" && (
          <a className="ibtn pri" href={src} target="_blank" rel="noreferrer">↓ Ouvrir</a>
        )}
        <button className="ibtn" onClick={copyPrompt}>{copied ? "✓ Copié" : "Copier prompt"}</button>
      </div>
      {src && (
        <div className="imgframe">
          {status === "loading" && (
            <div className="imgspin">
              <div className="is" />
              <div className="inote">Génération image…</div>
            </div>
          )}
          <img src={src} alt="generated"
            style={{ display: status === "loading" ? "none" : "block" }}
            onLoad={() => setStatus("ready")}
            onError={() => setStatus("error")} />
          {status === "error" && <div className="inote" style={{ color: "#C4694A" }}>Erreur — réessaie</div>}
        </div>
      )}
    </div>
  );
}

function Result({ fmt, pillar, sub, data }) {
  const lbl = `${fmt.label} — ${pillar.label}${sub ? " · " + sub.label : ""}`;
  const cp = (t) => navigator.clipboard.writeText(t);
  const tags = (data.hashtags || []).map(h => "#" + h).join(" ");

  return (
    <div className="card">
      <div className="chdr"><div className="cdot" /><div className="ctitle">{lbl}</div></div>
      <div className="cbody">

        <div className="row acc">
          <div className="rl">Hook visuel</div>
          <div className="hook">{data.hook}</div>
          {data.subhook && <div className="subhook">{data.subhook}</div>}
        </div>

        {fmt.id === "post" && <>
          <div className="row"><div className="rl">Image IA</div><ImageBlock prompt={data.image_prompt} /></div>
          <div className="row">
            <div className="rl">Caption</div>
            <div className="btext">{data.caption}</div>
            <button className="cpbtn" onClick={() => cp(data.caption + "\n\n" + tags)}>Copier caption + hashtags</button>
          </div>
          <div className="row"><div className="rl">CTA</div><div className="btext">{data.cta}</div></div>
        </>}

        {fmt.id === "carrousel" && <>
          <div className="row">
            <div className="rl">Slides</div>
            <div className="slides">
              {(data.slides || []).map((s, i) => (
                <div key={i} className="slide">
                  <div className="snum">{s.num || i + 1}</div>
                  <div><div className="stit">{s.titre}</div><div className="stxt">{s.texte}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="row"><div className="rl">Visuel couverture</div><ImageBlock prompt={data.image_prompt} /></div>
          <div className="row">
            <div className="rl">Caption</div>
            <div className="btext">{data.caption}</div>
            <button className="cpbtn" onClick={() => cp(data.caption + "\n\n" + tags)}>Copier</button>
          </div>
        </>}

        {fmt.id === "reel" && <>
          <div className="row">
            <div className="rl">Script</div>
            <div className="seqs">
              {(data.script || []).map((s, i) => (
                <div key={i} className="seq">
                  <div className="tc">{s.timecode}</div>
                  <div>
                    <div className="spl">{s.plan}</div>
                    {s.overlay && <span className="sovl">{s.overlay}</span>}
                    {s.voix && <div className="svo">🎙 {s.voix}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="row"><div className="rl">Musique</div><div className="btext" style={{ fontStyle: "italic", color: "#777" }}>{data.musique}</div></div>
          <div className="row"><div className="rl">Vignette</div><ImageBlock prompt={data.image_prompt} /></div>
          <div className="row">
            <div className="rl">Caption</div>
            <div className="btext">{data.caption}</div>
            <button className="cpbtn" onClick={() => cp(data.caption + "\n\n" + tags)}>Copier</button>
          </div>
        </>}

        <div className="row">
          <div className="rl">Hashtags</div>
          <div className="tags">{(data.hashtags || []).map((h, i) => <span key={i} className="tag">#{h}</span>)}</div>
        </div>

      </div>
    </div>
  );
}

export default function App() {
  const [fmt, setFmt] = useState(null);
  const [pillar, setPillar] = useState(null);
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const canGen = fmt && pillar && (pillar.id !== "emotion" || sub);

  const generate = async () => {
    setLoading(true); setResult(null); setError(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildPrompt(fmt, pillar, sub) }]
        })
      });
      const d = await res.json();
      const txt = (d.content || []).map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
      setResult(JSON.parse(txt));
    } catch { setError("Erreur de génération — réessaie."); }
    setLoading(false);
  };

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="hdr">
          <div>
            <div className="htitle">Ypersoa Content Studio</div>
            <div className="hsub">Générateur IA — Post · Carrousel · Reel</div>
          </div>
        </div>

        <div className="layout">
          <div className="side">
            <div className="sl">Format</div>
            {FORMATS.map(f => (
              <button key={f.id} className={`fb${fmt?.id === f.id ? " on" : ""}`} onClick={() => { setFmt(f); setResult(null); }}>
                <span className="fi">{f.icon}</span>
                <span className="fn">{f.label}</span>
                <span className="fnt">{f.note}</span>
              </button>
            ))}

            <div className="sl">Pilier</div>
            {PILLARS.map(p => (
              <button key={p.id} className={`pb${pillar?.id === p.id ? " on" : ""}`} onClick={() => { setPillar(p); setSub(null); setResult(null); }}>
                <div className="pn">{p.label}</div>
                <div className="pd">{p.desc}</div>
              </button>
            ))}

            {pillar?.sub && <>
              <div className="sl">Angle émotionnel</div>
              <div className="subrow">
                {pillar.sub.map(s => (
                  <button key={s.id} className={`sbt${sub?.id === s.id ? " on" : ""}`} onClick={() => { setSub(s); setResult(null); }}>
                    {s.label}
                  </button>
                ))}
              </div>
              {sub && <div className="hint">« {sub.hook} »</div>}
            </>}

            <button className="gbtn" disabled={!canGen || loading} onClick={generate}>
              {loading && <span className="spin" />}
              {loading ? "Génération…" : "Générer →"}
            </button>
            {error && <div className="errbox">{error}</div>}
          </div>

          <div className="canvas">
            {!result && !loading && (
              <div className="empty">
                <div className="eico">✦</div>
                <div className="etxt">Choisis un format et un pilier</div>
              </div>
            )}
            {loading && (
              <div className="empty">
                <div className="spin" style={{ width: 28, height: 28, borderWidth: 3, borderColor: "#EDE8E0", borderTopColor: "#C4694A" }} />
                <div className="etxt">Création du contenu…</div>
              </div>
            )}
            {result && !loading && <Result fmt={fmt} pillar={pillar} sub={sub} data={result} />}
          </div>
        </div>
      </div>
    </>
  );
}
