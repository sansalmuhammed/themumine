(function () {
  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getSlug() {
    return new URLSearchParams(location.search).get("slug") || "";
  }

  function getTagFilter() {
    return new URLSearchParams(location.search).get("tag") || "";
  }

  function heroTitleLines(hero) {
    if (hero.titleLine1 || hero.titleLine2) {
      return {
        line1: hero.titleLine1 || "",
        line2: hero.titleLine2 || "",
      };
    }
    const t = String(hero.title || "").trim().replace(/\s+/g, " ");
    const splitAt = t.toLowerCase().lastIndexOf(" of ");
    if (splitAt > 0) {
      return {
        line1: t.slice(0, splitAt).trim(),
        line2: t.slice(splitAt + 1).trim(),
      };
    }
    return { line1: t, line2: "" };
  }

  function slugifyTag(text) {
    return String(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function normalizeTags(tags) {
    if (!Array.isArray(tags)) return [];
    return tags
      .map((t) => {
        if (typeof t === "string") {
          const label = t.trim();
          return label ? { label, slug: slugifyTag(label) } : null;
        }
        if (t && t.label) {
          return {
            label: String(t.label).trim(),
            slug: slugifyTag(t.slug || t.label),
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  function articleHasTag(article, tagSlug) {
    return normalizeTags(article.tags).some((t) => t.slug === tagSlug);
  }

  function renderTagList(tags, options) {
    const opts = options || {};
    const list = normalizeTags(tags);
    if (!list.length) return "";
    const items = list
      .map((t) => {
        const href = `thinking.html?tag=${encodeURIComponent(t.slug)}`;
        const cls = opts.className || "tag-pill";
        const inner = opts.linkable === false ? esc(t.label) : `<a href="${href}" rel="tag">${esc(t.label)}</a>`;
        return `<li class="${cls}">${inner}</li>`;
      })
      .join("");
    return `<ul class="tag-list" aria-label="Etiketler">${items}</ul>`;
  }

  function articleExcerpt(article) {
    const seo = article.seo || {};
    if (seo.description) return seo.description;
    const block = (article.blocks || []).find((b) => b.type === "paragraph" && b.text);
    return block ? block.text.slice(0, 160) : "";
  }

  function upsertMeta(name, content, isProperty) {
    const attr = isProperty ? "property" : "name";
    let el = document.querySelector(`meta[${attr}="${name}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  function applyArticleSeo(article, site) {
    const tags = normalizeTags(article.tags);
    const seo = article.seo || {};
    const title = seo.title || `${article.title} — The Mumine`;
    const description = seo.description || articleExcerpt(article);
    const keywords = tags.map((t) => t.label).join(", ");
    const canonical = new URL(
      `article.html?slug=${encodeURIComponent(article.slug)}`,
      location.origin
    ).href;

    document.title = title;
    upsertMeta("description", description);
    if (keywords) upsertMeta("keywords", keywords);
    upsertMeta("robots", "index, follow");
    upsertMeta("og:title", title, true);
    upsertMeta("og:description", description, true);
    upsertMeta("og:type", "article", true);
    upsertMeta("og:url", canonical, true);
    if (article.cardImage) upsertMeta("og:image", article.cardImage, true);
    upsertMeta("article:tag", tags.map((t) => t.label).join(","), true);

    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.rel = "canonical";
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.href = canonical;

    const oldLd = document.getElementById("article-jsonld");
    if (oldLd) oldLd.remove();
    const ld = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
      description,
      url: canonical,
      image: article.cardImage || undefined,
      keywords: keywords || undefined,
      author: { "@type": "Person", name: site.logo || "The Mumine" },
      publisher: { "@type": "Organization", name: site.logo || "The Mumine" },
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "article-jsonld";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
  }

  function applyThinkingSeo(tagSlug, tagLabel) {
    if (!tagSlug) return;
    const title = `Tag: ${tagLabel} — What I'm Thinking — The Mumine`;
    document.title = title;
    upsertMeta("description", `${tagLabel} etiketli blog yazıları — The Mumine`);
    upsertMeta("robots", "index, follow");
  }

  function applyTheme(theme, fonts) {
    const r = document.documentElement;
    if (theme) {
      if (theme.bg) r.style.setProperty("--bg", theme.bg);
      if (theme.text) r.style.setProperty("--text", theme.text);
      if (theme.textMuted) r.style.setProperty("--text-muted", theme.textMuted);
      if (theme.accent) r.style.setProperty("--accent", theme.accent);
      if (theme.accentHover) r.style.setProperty("--accent-hover", theme.accentHover);
      if (theme.border) r.style.setProperty("--border", theme.border);
    }
    if (fonts?.body) r.style.setProperty("--font-body", `"${fonts.body}", system-ui, sans-serif`);
    if (fonts?.display) r.style.setProperty("--font-display", `"${fonts.display}", sans-serif`);
  }

  function renderHeader(site, activePage) {
    const nav = site.nav || [];
    const contact = site.contactButton || { label: "CONTACT", href: "index.html#contact" };
    const logoSrc = site.logoImage || "assets/logo-wordmark.png";
    const logoAlt = site.logo || "The Mumine";

    function navLink(item, className) {
      const active = item.page === activePage ? " is-active" : "";
      return `<a href="${esc(item.href)}" class="${className}${active}" data-page="${esc(item.page)}">${esc(item.label)}</a>`;
    }

    const desktopNav = nav.map((item) => navLink(item, "")).join("");
    const mobileNav =
      nav.map((item) => navLink(item, "")).join("") +
      `<a href="${esc(contact.href)}" class="header-cta header-cta--mobile">${esc(contact.label)}</a>`;

    const brand = logoSrc
      ? `<a href="index.html" class="brand"><img class="brand__img" src="${esc(logoSrc)}" alt="${esc(logoAlt)}" width="240" height="58"></a>`
      : `<a href="index.html" class="brand"><span class="brand__text"><span class="brand__text-the">the</span> Mumine</span></a>`;

    return `
      <div class="header-inner">
        ${brand}
        <nav class="header-nav" aria-label="Ana menü">${desktopNav}</nav>
        <a href="${esc(contact.href)}" class="header-cta">${esc(contact.label)}</a>
        <button class="menu-toggle" type="button" aria-label="Menüyü aç" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
      <nav class="site-nav" aria-label="Mobil menü">${mobileNav}</nav>`;
  }

  function renderFooter(site) {
    const logoSrc = site.logoImage || "assets/logo-wordmark.png";
    const credit = site.footerDesignCredit || "";
    const copy = site.footerCopyright || site.footer || "";
    return `
      <div class="container footer-inner">
        <a href="index.html" class="footer-brand">
          <img src="${esc(logoSrc)}" alt="${esc(site.logo || "The Mumine")}" width="160" height="40">
        </a>
        <p class="footer-credit">${esc(credit)}</p>
        <p class="footer-copy">${esc(copy)}</p>
      </div>`;
  }

  function renderHome(h, projects) {
    const featSlug = h.featured?.projectSlug || (projects[0] && projects[0].slug) || "";
    const witness = (h.witness?.items || [])
      .map(
        (w) => `
        <article class="witness-item">
          <h3>${esc(w.title)}</h3>
          <p>${esc(w.text)}</p>
        </article>`
      )
      .join("");

    const exp = (h.experience?.items || [])
      .map(
        (e) => `
        <li>
          <span class="num">${esc(e.num)}</span>
          <div>
            <h3>${esc(e.title)}</h3>
            <p>${esc(e.text)}</p>
          </div>
        </li>`
      )
      .join("");

    const featParas = (h.featured?.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join("");

    const c = h.contact || {};
    const labels = c.labels || {};
    const hero = h.hero || {};
    const heroLines = heroTitleLines(hero);
    const heroLead = hero.lead ? `<p class="hero-lead">${esc(hero.lead)}</p>` : "";

    return `
      <section class="hero">
        <img class="hero-bg" src="${esc(hero.image)}" alt="${esc(hero.imageAlt || "")}" width="1600" height="900">
        <div class="hero-overlay" aria-hidden="true"></div>
        <div class="hero-content">
          <h1 class="hero-title">
            <span class="hero-title__line hero-title__line--light">${esc(heroLines.line1)}</span>
            <span class="hero-title__line hero-title__line--accent">${esc(heroLines.line2)}</span>
          </h1>
          ${heroLead}
        </div>
      </section>
      <section class="section" id="projects">
        <div class="container">
          <h2 class="section-title">${esc(h.featured?.sectionTitle)}</h2>
          <div class="featured-project">
            <div class="media">
              <span class="accent-square" aria-hidden="true"></span>
              <img src="${esc(h.featured?.image)}" alt="${esc(h.featured?.imageAlt || "")}" width="800" height="600">
            </div>
            <div class="copy">
              ${featParas}
              <a href="project.html?slug=${esc(featSlug)}" class="link-arrow">${esc(h.featured?.linkText)}</a>
            </div>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="container">
          <h2 class="section-title">${esc(h.witness?.sectionTitle)}</h2>
          <div class="witness-grid">${witness}</div>
        </div>
      </section>
      <section class="section">
        <div class="container experience">
          <div>
            <h2 class="section-title">${esc(h.experience?.sectionTitle)}</h2>
            <ol class="experience-list">${exp}</ol>
          </div>
          <div class="experience-graphic" aria-hidden="true">
            <svg viewBox="0 0 200 280" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M100 20 C40 80 40 140 100 200 C160 140 160 80 100 20Z" stroke="currentColor" stroke-width="2"/>
              <path d="M100 200 L100 260 M70 230 L130 230" stroke="currentColor" stroke-width="2"/>
              <path d="M60 120 Q100 60 140 120 Q100 180 60 120" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </div>
        </div>
      </section>
      <section class="section" id="contact">
        <div class="container">
          <h2 class="section-title">${esc(c.sectionTitle)}</h2>
          <form class="contact-form" action="${esc(c.formAction || "#")}" method="post" data-success="${esc(c.successMessage)}">
            <div><label for="name">${esc(labels.name)}</label><input type="text" id="name" name="name" required autocomplete="name"></div>
            <div><label for="email">${esc(labels.email)}</label><input type="email" id="email" name="email" required autocomplete="email"></div>
            <div><label for="message">${esc(labels.message)}</label><textarea id="message" name="message" required></textarea></div>
            <button type="submit" class="btn">${esc(c.submitText)}</button>
          </form>
        </div>
      </section>`;
  }

  function projectCard(p) {
    return `
      <a href="project.html?slug=${esc(p.slug)}" class="card">
        <img class="card-image" src="${esc(p.cardImage)}" alt="" width="800" height="500">
        <h2>${esc(p.cardTitle)}</h2>
        <p class="meta">${esc(p.meta)}</p>
      </a>`;
  }

  function articleCardExcerpt(article) {
    if (article.cardExcerpt) return article.cardExcerpt;
    return articleExcerpt(article);
  }

  function renderBlogCardTags(tags) {
    const list = normalizeTags(tags);
    if (!list.length) return "";
    const items = list
      .map((t) => {
        const href = `thinking.html?tag=${encodeURIComponent(t.slug)}`;
        return `<li class="blog-tag"><a href="${href}" rel="tag">${esc(t.label)}</a></li>`;
      })
      .join("");
    return `<ul class="blog-card__tags" aria-label="Etiketler">${items}</ul>`;
  }

  function articleCard(a, ctaText) {
    const tags = renderBlogCardTags(a.tags);
    const excerpt = articleCardExcerpt(a);
    const cta = ctaText || "Review the blog →";
    const href = `article.html?slug=${encodeURIComponent(a.slug)}`;
    return `
      <article class="blog-card">
        <a class="blog-card__media" href="${href}">
          <img class="blog-card__image" src="${esc(a.cardImage)}" alt="" width="800" height="500">
        </a>
        <div class="blog-card__body">
          ${tags}
          <h2 class="blog-card__title"><a href="${href}">${esc(a.cardTitle)}</a></h2>
          ${excerpt ? `<p class="blog-card__excerpt">${esc(excerpt)}</p>` : ""}
          <a class="blog-card__cta" href="${href}">${esc(cta)}</a>
        </div>
      </article>`;
  }

  function thinkingTitleLines(t) {
    if (t.titleLine1 || t.titleLine2) {
      return { line1: t.titleLine1 || "", line2: t.titleLine2 || "" };
    }
    const full = String(t.title || "What I'm Thinking").trim();
    const words = full.split(/\s+/);
    if (words.length > 2) {
      const mid = Math.ceil(words.length / 2);
      return {
        line1: words.slice(0, mid).join(" "),
        line2: words.slice(mid).join(" "),
      };
    }
    return { line1: full, line2: "" };
  }

  function renderWorks(w, projects) {
    const cards = projects.map(projectCard).join("");
    return `
      <div class="container page-hero"><h1>${esc(w.title)}</h1></div>
      <div class="container card-grid">${cards}</div>`;
  }

  function renderThinking(t, articles, allArticles) {
    const tagSlug = getTagFilter();
    let list = articles || [];
    const ctaText = t.cardLinkText || "Review the blog →";
    let heroHtml = "";

    if (tagSlug) {
      list = (allArticles || list).filter((a) => articleHasTag(a, tagSlug));
      let label = tagSlug.replace(/-/g, " ");
      (allArticles || []).forEach((a) => {
        normalizeTags(a.tags).forEach((tag) => {
          if (tag.slug === tagSlug) label = tag.label;
        });
      });
      applyThinkingSeo(tagSlug, label);
      heroHtml = `
        <section class="thinking-hero thinking-hero--filter">
          <div class="container">
            <p class="thinking-back"><a href="thinking.html">← Tüm yazılar</a></p>
            <h1 class="thinking-hero__title thinking-hero__title--filter">${esc(label)}</h1>
          </div>
        </section>`;
    } else {
      const lines = thinkingTitleLines(t);
      heroHtml = `
        <section class="thinking-hero">
          <div class="container">
            <h1 class="thinking-hero__title">
              <span class="thinking-hero__line thinking-hero__line--light">${esc(lines.line1)}</span>
              <span class="thinking-hero__line thinking-hero__line--accent">${esc(lines.line2)}</span>
            </h1>
            ${t.lead ? `<p class="thinking-hero__lead">${esc(t.lead)}</p>` : ""}
          </div>
        </section>`;
    }

    const cards = list.length
      ? list.map((a) => articleCard(a, ctaText)).join("")
      : `<p class="blog-grid__empty">Bu etikette henüz yazı yok.</p>`;

    const initialVisible = Number(t.initialVisible) > 0 ? Number(t.initialVisible) : 4;
    const loadMore =
      !tagSlug && list.length > initialVisible
        ? `<div class="container thinking-load-more">
            <button type="button" class="btn-outline thinking-load-more__btn" data-load-more data-initial="${initialVisible}">
              ${esc(t.loadMoreText || "Load more archive")}
              <span class="thinking-load-more__icon" aria-hidden="true">↓</span>
            </button>
          </div>`
        : "";

    return `
      ${heroHtml}
      <section class="section thinking-archive">
        <div class="container blog-grid">${cards}</div>
        ${loadMore}
      </section>`;
  }

  function renderTagCloud(articles) {
    const map = new Map();
    (articles || []).forEach((a) => {
      normalizeTags(a.tags).forEach((t) => {
        if (!map.has(t.slug)) map.set(t.slug, { label: t.label, count: 0 });
        map.get(t.slug).count += 1;
      });
    });
    if (!map.size) return "";
    const items = [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(
        ([slug, t]) =>
          `<li class="tag-pill tag-pill--cloud"><a href="thinking.html?tag=${encodeURIComponent(
            slug
          )}" rel="tag">${esc(t.label)} <span class="tag-count">${t.count}</span></a></li>`
      )
      .join("");
    return `<div class="tag-cloud"><span class="tag-cloud__label">Etiketler</span><ul class="tag-list">${items}</ul></div>`;
  }

  function renderProject(p) {
    const paras = (p.paragraphs || []).map((x) => `<p>${esc(x)}</p>`).join("");
    const story = (p.storySections || [])
      .map(
        (s) =>
          `<h3>${esc(s.heading)}</h3>` +
          (s.paragraphs || []).map((x) => `<p>${esc(x)}</p>`).join("")
      )
      .join("");
    const gallery = (p.gallery || [])
      .map((src) => `<img src="${esc(src)}" alt="" width="1200" height="675">`)
      .join("");
    const play = p.showPlayButton
      ? '<div class="play-btn" aria-label="Video oynat"></div>'
      : "";

    return `
      <div class="project-hero">
        <img src="${esc(p.heroImage)}" alt="">
        ${play}
      </div>
      <div class="container project-title"><h1>${esc(p.title)}</h1></div>
      <div class="container two-col">
        <div class="prose">${paras}</div>
        <div class="vertical-image">
          <img src="${esc(p.sideImage)}" alt="${esc(p.sideImageAlt || "")}" width="600" height="800">
        </div>
      </div>
      <section class="story-section">
        <div class="container">
          <h2>${esc(p.storyTitle)}</h2>
          <div class="story-block">${story}</div>
        </div>
      </section>
      <div class="container gallery-stack">${gallery}</div>`;
  }

  function renderArticleBlock(b) {
    switch (b.type) {
      case "paragraph":
        return `<p>${esc(b.text)}</p>`;
      case "heading":
        return `<h2>${esc(b.text)}</h2>`;
      case "list":
        return `<ol>${(b.items || []).map((i) => `<li>${esc(i)}</li>`).join("")}</ol>`;
      case "image":
        return `<figure class="figure"><img src="${esc(b.src)}" alt="${esc(b.alt || "")}" width="1000" height="625"></figure>`;
      case "end":
        return `<p class="article-end">${esc(b.text)}</p>`;
      default:
        return "";
    }
  }

  function renderArticle(a) {
    const body = (a.blocks || []).map(renderArticleBlock).join("");
    const tags = renderTagList(a.tags);
    const metaLine = a.meta ? `<p class="article-meta-line">${esc(a.meta)}</p>` : "";
    return `
      <header class="container article-header">
        ${tags}
        <h1>${esc(a.title)}</h1>
        ${metaLine}
      </header>
      <article class="container article-body">${body}</article>`;
  }

  function renderAbout(ab) {
    const hero = ab.hero || {};
    const story = ab.story || {};
    const skills = ab.skills || {};
    const heroParas = (hero.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join("");
    const storyBlocks = (story.blocks || [])
      .map(
        (b) => `
        <article class="about-story-block">
          <p class="about-story-label"><span class="about-story-num">${esc(b.num)}</span> / <span class="about-story-tag">${esc(b.label)}</span></p>
          <blockquote class="about-story-quote">${esc(b.quote)}</blockquote>
          <p class="about-story-text">${esc(b.text)}</p>
        </article>`
      )
      .join("");
    const skillCards = (skills.cards || [])
      .map(
        (c) => `
        <div class="about-skill-card">
          <span class="about-skill-card__num">${esc(c.num)}</span>
          <h3 class="about-skill-card__title">${esc(c.title)}</h3>
          <ul class="about-skill-card__list">
            ${(c.items || []).map((i) => `<li>${esc(i)}</li>`).join("")}
          </ul>
        </div>`
      )
      .join("");

    return `
      <section class="about-hero">
        <div class="container about-hero__grid">
          <div class="about-hero__text">
            <h1 class="about-hero__title">
              <span class="about-hero__name">${esc(hero.nameLine1)}</span>
              <span class="about-hero__surname">${esc(hero.nameLine2)}</span>
            </h1>
            <div class="about-hero__bio">${heroParas}</div>
          </div>
          <div class="about-hero__media">
            <img src="${esc(hero.image?.src)}" alt="${esc(hero.image?.alt || "")}" width="560" height="640">
          </div>
        </div>
      </section>

      <section class="about-story">
        <div class="container about-story__grid">
          <div class="about-story__media">
            <img src="${esc(story.image?.src)}" alt="${esc(story.image?.alt || "")}" width="480" height="720">
          </div>
          <div class="about-story__content">${storyBlocks}</div>
        </div>
      </section>

      <section class="about-skills">
        <div class="container">
          <h2 class="about-skills__heading">
            <span>${esc(skills.titlePart1)}</span>
            <span class="about-skills__heading-accent">${esc(skills.titlePart2)}</span>
          </h2>
          <div class="about-skills__grid">${skillCards}</div>
        </div>
      </section>`;
  }

  async function loadContent() {
    try {
      const res = await fetch("/.netlify/functions/content");
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data) return json.data;
      }
    } catch (e) {
      /* API yoksa statik yedek */
    }
    const res = await fetch("data/content.json");
    if (!res.ok) throw new Error("İçerik yüklenemedi");
    return await res.json();
  }

  async function init() {
    const page = document.body.dataset.page;
    if (!page) return;

    let data;
    try {
      data = await loadContent();
    } catch (e) {
      console.warn("CMS içeriği yüklenemedi, statik HTML kullanılıyor.", e);
      if (window.initSiteUI) window.initSiteUI();
      return;
    }

    const site = data.site || {};
    applyTheme(site.theme, site.fonts);

    const titles = site.pageTitles || {};
    if (page === "home" && titles.home) document.title = titles.home;
    if (page === "works" && titles.works) document.title = titles.works;
    if (page === "thinking" && titles.thinking) document.title = titles.thinking;
    if (page === "about" && titles.about) document.title = titles.about;

    const headerEl = document.getElementById("site-header");
    const mainEl = document.getElementById("page-root");
    const footerEl = document.getElementById("site-footer");

    let activePage = page;
    if (page === "project") activePage = "works";
    if (page === "article") activePage = "thinking";

    if (headerEl) headerEl.innerHTML = renderHeader(site, activePage);
    if (footerEl) footerEl.innerHTML = renderFooter(site);

    if (!mainEl) return;

    if (page === "home") {
      mainEl.innerHTML = renderHome(data.home || {}, data.projects || []);
    } else if (page === "works") {
      mainEl.innerHTML = renderWorks(data.works || {}, data.projects || []);
    } else if (page === "thinking") {
      mainEl.innerHTML = renderThinking(
        data.thinking || {},
        data.articles || [],
        data.articles || []
      );
    } else if (page === "about") {
      mainEl.innerHTML = renderAbout(data.about || {});
    } else if (page === "project") {
      const slug = getSlug();
      const p = (data.projects || []).find((x) => x.slug === slug);
      if (!p) {
        mainEl.innerHTML = `<div class="container page-hero"><h1>Proje bulunamadı</h1><p><a href="works.html">← Tüm projeler</a></p></div>`;
      } else {
        document.title = p.title + " — The Mumine";
        mainEl.innerHTML = renderProject(p);
      }
    } else if (page === "article") {
      const slug = getSlug();
      const a = (data.articles || []).find((x) => x.slug === slug);
      if (!a) {
        mainEl.innerHTML = `<div class="container page-hero"><h1>Yazı bulunamadı</h1><p><a href="thinking.html">← Tüm yazılar</a></p></div>`;
      } else {
        applyArticleSeo(a, site);
        mainEl.innerHTML = renderArticle(a);
      }
    }

    if (window.initSiteUI) window.initSiteUI();
    if (page === "thinking") initThinkingLoadMore();
  }

  function initThinkingLoadMore() {
    const grid = document.querySelector(".blog-grid");
    const btn = document.querySelector("[data-load-more]");
    if (!grid || !btn) return;
    const initial = parseInt(btn.dataset.initial || "4", 10);
    const cards = [...grid.querySelectorAll(".blog-card")];
    cards.forEach((card, i) => {
      if (i >= initial) card.classList.add("blog-card--hidden");
    });
    btn.addEventListener("click", () => {
      cards.forEach((card) => card.classList.remove("blog-card--hidden"));
      btn.parentElement?.remove();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
