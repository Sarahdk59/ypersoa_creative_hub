/**
 * HubAssistant — assistant conversationnel flottant (bulle en bas à droite).
 *
 * Monté UNE fois dans HubShell → présent sur toutes les pages du Hub. Sa base
 * de connaissances (guide + brand book) vit côté serveur dans
 * /api/assistant/chat. Deux missions : aider à se retrouver dans le Hub (liens
 * cliquables) et aider à créer du contenu dans les règles brand.
 *
 * La conversation reste en mémoire tant que la coque du Hub est montée (donc
 * elle survit aux navigations internes).
 */
"use client";

import { useEffect, useRef, useState, Fragment, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";

const ROSE = "var(--color-brand-rose, #B4665F)";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Où je crée un visuel Pinterest ?",
  "Aide-moi à écrire une caption pour la Fête des Pères",
  "C'est quoi la différence entre un format Hero et Désir ?",
  "Comment importer une commande Shopify ?",
];

/** Routes connues du Hub — pour linkifier les chemins bruts en sortie LLM. */
const KNOWN_ROUTE =
  "(?:social|shooting|lookbook|atelier-da|atelier-trends|atelier-production|search|guide)";

/**
 * Rend un texte d'assistant en nœuds React : liens Markdown [label](/route),
 * gras **texte**, et chemins internes bruts /route → cliquables (navigation SPA).
 */
function renderRich(text: string, onNavigate: (href: string) => void): ReactNode[] {
  const TOKEN = new RegExp(
    `\\[([^\\]]+)\\]\\((\\/[^)\\s]+)\\)|\\*\\*([^*]+)\\*\\*|(\\/${KNOWN_ROUTE}[A-Za-z0-9\\-\\/]*)`,
    "g",
  );
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) nodes.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
    const [, mdLabel, mdHref, bold, bareHref] = m;
    const href = mdHref || bareHref;
    if (href) {
      nodes.push(
        <a
          key={key++}
          href={href}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(href);
          }}
          style={{ color: ROSE, fontWeight: 600, textDecoration: "underline", cursor: "pointer" }}
        >
          {mdLabel || href}
        </a>,
      );
    } else if (bold) {
      nodes.push(
        <strong key={key++} style={{ fontWeight: 600 }}>
          {bold}
        </strong>,
      );
    }
    last = TOKEN.lastIndex;
  }
  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return nodes;
}

export function HubAssistant() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll vers le bas à chaque nouveau morceau.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  // Focus l'input à l'ouverture.
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: q }];
    // On ajoute tout de suite une bulle assistant vide qu'on remplit en streaming.
    setMessages([...next, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.body) {
        const fallback = await res.text();
        setMessages([...next, { role: "assistant", content: fallback || "Erreur." }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
      }
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Oups, je n'ai pas pu répondre. Réessaie dans un instant." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Bulle flottante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir l'assistant du Hub"
          title="Assistant du Hub"
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 52,
            padding: "0 18px 0 16px",
            borderRadius: 999,
            border: "none",
            background: ROSE,
            color: "white",
            boxShadow: "0 8px 24px rgba(180,102,95,0.35)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <MessageCircle size={20} strokeWidth={1.8} />
          Assistant
        </button>
      )}

      {/* Panneau de chat */}
      {open && (
        <div
          role="dialog"
          aria-label="Assistant du Hub"
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            zIndex: 1000,
            width: "min(400px, calc(100vw - 32px))",
            height: "min(620px, calc(100vh - 96px))",
            display: "flex",
            flexDirection: "column",
            background: "white",
            border: "0.5px solid var(--hub-border)",
            borderRadius: 16,
            boxShadow: "0 16px 48px rgba(30,45,74,0.22)",
            overflow: "hidden",
            fontFamily: "var(--font-sans)",
          }}
        >
          {/* En-tête */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              background: ROSE,
              color: "white",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={17} strokeWidth={1.8} />
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Assistant du Hub</div>
                <div style={{ fontSize: 10.5, opacity: 0.85 }}>Guide + brand book Ypersoa</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer l'assistant"
              style={{
                display: "flex",
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X size={18} strokeWidth={1.8} />
            </button>
          </div>

          {/* Fil de discussion */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 14,
              background: "var(--hub-bg)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {messages.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: "var(--hub-foreground)",
                    background: "white",
                    border: "0.5px solid var(--hub-border)",
                    borderRadius: 12,
                    padding: "10px 12px",
                  }}
                >
                  Salut 👋 Je suis ton assistant. Je connais le guide et le brand book.
                  Demande-moi où trouver une fonction dans le Hub, ou de l'aide pour créer
                  un contenu (caption, hooks, titre Pinterest…).
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      style={{
                        fontSize: 11.5,
                        textAlign: "left",
                        padding: "7px 10px",
                        borderRadius: 999,
                        border: `0.5px solid ${ROSE}`,
                        background: "white",
                        color: ROSE,
                        cursor: "pointer",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => {
              const isUser = m.role === "user";
              const streaming = busy && i === messages.length - 1 && m.role === "assistant";
              return (
                <div
                  key={i}
                  style={{
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth: "88%",
                    fontSize: 13,
                    lineHeight: 1.5,
                    padding: "9px 12px",
                    borderRadius: 12,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    background: isUser ? ROSE : "white",
                    color: isUser ? "white" : "var(--hub-foreground)",
                    border: isUser ? "none" : "0.5px solid var(--hub-border)",
                  }}
                >
                  {isUser ? m.content : renderRich(m.content, navigate)}
                  {streaming && m.content === "" && (
                    <span style={{ opacity: 0.5 }}>…</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Saisie */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              padding: 10,
              borderTop: "0.5px solid var(--hub-border)",
              background: "white",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Pose ta question… (Entrée pour envoyer)"
              style={{
                flex: 1,
                resize: "none",
                maxHeight: 96,
                border: "0.5px solid var(--hub-border)",
                borderRadius: 10,
                padding: "8px 10px",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--hub-foreground)",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Envoyer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 38,
                height: 38,
                flexShrink: 0,
                borderRadius: 10,
                border: "none",
                background: busy || !input.trim() ? "var(--hub-border)" : ROSE,
                color: "white",
                cursor: busy || !input.trim() ? "default" : "pointer",
              }}
            >
              <Send size={16} strokeWidth={1.8} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
