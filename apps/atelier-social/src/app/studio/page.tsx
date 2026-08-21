import Link from "next/link";
import { BookOpen, Camera, Clapperboard, Images, Library, Sparkles } from "lucide-react";

export default function StudioIndex() {
  const parcours = [
    { label: "Shooting", detail: "Un visuel produit précis, prêt pour Instagram, Pinterest ou Shopify.", href: "/studio/shooting", icon: <Camera size={20} />, accent: "#c23a2d" },
    { label: "Lookbook", detail: "Une ambiance, des références et une direction visuelle à faire vivre.", href: "/studio/lookbook", icon: <Images size={20} />, accent: "#c8963c" },
    { label: "Shooting Book", detail: "Un plan de prises de vue qui raconte déjà l’histoire de la série.", href: "/studio/shooting-book", icon: <BookOpen size={20} />, accent: "#2e7d74" },
    { label: "Studio Mood", detail: "Préparer une humeur, un storyboard et l’élan d’un Réel.", href: "/studio/studio-mood", icon: <Clapperboard size={20} />, accent: "#6e1f2e" },
  ];

  return (
    <main className="min-h-full overflow-auto bg-hub-bg px-5 py-8 text-hub-foreground sm:px-8">
      <div className="mx-auto max-w-[1180px]">
        <header className="border-b border-hub-border pb-5">
          <h1 className="font-serif text-[34px] leading-none">Studio</h1>
          <p className="mt-3 text-sm text-hub-foreground/60">Toute la génération visuelle de l’atelier, au même endroit.</p>
          <div className="mt-6 flex items-center gap-6 text-sm">
            <span className="border-b-2 border-hub-accent pb-3 font-semibold text-hub-foreground">Créer</span>
            <Link href="/bibliotheque" className="pb-3 text-hub-foreground/55 hover:text-hub-foreground">La bibliothèque</Link>
          </div>
        </header>

        <section className="relative mt-7 overflow-hidden rounded-[18px] border border-[#eadbc8] bg-[#fffdfa] px-6 pb-7 pt-8 shadow-[0_10px_28px_rgba(22,50,76,.06)] sm:px-8">
          <div className="absolute inset-x-0 top-0 border-t-[5px] border-dashed border-hub-accent" />
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-[10px] font-bold tracking-[.16em] text-hub-accent">QU&apos;EST-CE QU&apos;ON MET EN LUMIÈRE AUJOURD&apos;HUI ?</p>
              <h2 className="mt-1 font-serif text-[36px] leading-none">Créer un <em className="text-hub-accent">visuel</em></h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-hub-foreground/65">Choisis le bon terrain de jeu : la pièce, l’ambiance, le plan de shooting ou le mouvement.</p>
            </div>
            <Link href="/social" className="inline-flex items-center gap-2 rounded-full border border-[#e4d7c7] bg-hub-bg px-4 py-2.5 text-sm font-semibold hover:border-hub-accent hover:text-hub-accent"><Sparkles size={16} /> Atelier Social</Link>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {parcours.map((item) => (
              <Link key={item.href} href={item.href} className="group flex min-h-36 items-center gap-4 rounded-[14px] border border-[#ecd5ce] bg-[#fffdfb] p-5 text-left transition hover:border-hub-accent hover:bg-[#fff9f7]">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white" style={{ background: item.accent }}>{item.icon}</span>
                <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold tracking-[.13em] text-hub-foreground/45">PARCOURS</span><span className="mt-1 block font-serif text-[21px] leading-none">{item.label}</span><span className="mt-2 block text-[13px] leading-5 text-hub-foreground/60">{item.detail}</span></span>
                <span className="text-xl text-hub-foreground/30 transition group-hover:translate-x-1 group-hover:text-hub-accent">→</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-7 border-t border-hub-border pt-5">
          <p className="text-[10px] font-bold tracking-[.16em] text-hub-foreground/50">RESSOURCE</p>
          <Link href="/bibliotheque" className="mt-3 inline-flex items-center gap-2 rounded-full border border-hub-border bg-white px-4 py-2.5 text-sm font-semibold hover:border-hub-accent"><Library size={16} /> Bibliothèque visuelle</Link>
        </section>
      </div>
    </main>
  );
}
