import type { ArticlePayload } from "./geo-guards";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("\n");
}

function toAnchorId(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toShopifyHtml(a: ArticlePayload): string {
  const sections = a.sections
    .map((s) => `<h2>${esc(s.h2)}</h2>\n${paragraphs(s.body)}`)
    .join("\n\n");

  const faq = a.faq
    .map((f) => `<h3>${esc(f.question)}</h3>\n<p>${esc(f.answer)}</p>`)
    .join("\n");

  const links = a.internal_links.length
    ? `<ul>\n${a.internal_links.map((l) => `  <li>${esc(l)}</li>`).join("\n")}\n</ul>`
    : "";

  return `<!-- article GEO -->
<div class="ypersoa-answer">
  <p><strong>${esc(a.direct_answer)}</strong></p>
</div>

${sections}

<h2>Questions frequentes</h2>
${faq}

<div class="ypersoa-cta">
  <p>${esc(a.cta.body)}</p>
  <p><strong>${esc(a.cta.label)}</strong></p>
</div>

${links}`.trim();
}

export function toShopifyArticleBody(a: ArticlePayload): string {
  const toc = a.sections.length
    ? `<nav class="ypersoa-toc">
  <p><strong>Dans cet article</strong></p>
  <ul>
${a.sections.map((s) => `    <li><a href="#${toAnchorId(s.h2)}">${esc(s.h2)}</a></li>`).join("\n")}
  </ul>
</nav>`
    : "";

  const sections = a.sections
    .map((s) => `<section id="${toAnchorId(s.h2)}">
  <h2>${esc(s.h2)}</h2>
${paragraphs(s.body)}
</section>`)
    .join("\n\n");

  const faq = a.faq
    .map((f) => `<details>
  <summary>${esc(f.question)}</summary>
  <p>${esc(f.answer)}</p>
</details>`)
    .join("\n");

  const links = a.internal_links.length
    ? `<ul>
${a.internal_links.map((l) => `  <li>${esc(l)}</li>`).join("\n")}
</ul>`
    : "<p>Aucun lien interne suggere pour cet article.</p>";

  return `<!-- Corps d'article Shopify / Liquid -->
<div class="ypersoa-article">
  <div class="ypersoa-answer">
    <p><strong>${esc(a.direct_answer)}</strong></p>
  </div>

  ${toc}

${sections}

  <section>
    <h2>Questions frequentes</h2>
${faq}
  </section>

  <section class="ypersoa-cta">
    <p>${esc(a.cta.body)}</p>
    <p><strong>${esc(a.cta.label)}</strong></p>
  </section>

  <section>
    <h2>Liens internes a ajouter</h2>
${links}
  </section>
</div>`.trim();
}

export function toFaqJsonLd(a: ArticlePayload) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: a.faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function toShopifySeo(a: ArticlePayload) {
  return {
    title: a.h1,
    handle: a.slug,
    meta_title: a.meta_title,
    meta_description: a.meta_description,
  };
}

export function toShopifyLiquidBundle(a: ArticlePayload) {
  const seo = toShopifySeo(a);
  const articleBody = toShopifyArticleBody(a);
  const faqJsonLd = JSON.stringify(toFaqJsonLd(a), null, 2);

  return {
    handle: seo.handle,
    title: seo.title,
    admin: {
      title: a.h1,
      blog_handle: "journal",
      tags: ["geo", "seo-longue-traine"],
    },
    seo,
    article_body_html: articleBody,
    faq_jsonld: faqJsonLd,
    liquid_section: `{% comment %} article GEO block {% endcomment %}
<article class="article-template__content rte">
${articleBody}
</article>

<script type="application/ld+json">
${faqJsonLd}
</script>`,
  };
}
