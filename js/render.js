(function () {
  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Preserves intentional line breaks from CMS/Figma copy (\n → br). */
  function formatText(s) {
    if (s == null) return "";
    return esc(s).replace(/\n/g, "<br>");
  }

  /** Extract YouTube video ID from watch, youtu.be, embed, or shorts URLs. */
  function parseYoutubeId(url) {
    if (url == null) return "";
    const s = String(url).trim();
    if (!s) return "";
    if (/^[\w-]{11}$/.test(s)) return s;
    try {
      const u = new URL(s.includes("://") ? s : "https://" + s);
      const host = u.hostname.replace(/^www\./, "");
      if (host === "youtu.be") return u.pathname.split("/").filter(Boolean)[0] || "";
      if (u.pathname.includes("/shorts/")) {
        return u.pathname.split("/shorts/")[1]?.split(/[?&#/]/)[0] || "";
      }
      if (u.pathname.includes("/embed/")) {
        return u.pathname.split("/embed/")[1]?.split(/[?&#/]/)[0] || "";
      }
      if (host.includes("youtube.com")) return u.searchParams.get("v") || "";
    } catch (e) {
      return "";
    }
    return "";
  }

  function renderProjectPlayButton(project, className) {
    const id = parseYoutubeId(project.videoUrl);
    if (!id || project.showPlayButton === false) return "";
    const cls = className || "project-inside__play";
    const iconCls = cls.replace(/__play$/, "__play-icon");
    return `<button type="button" class="${esc(cls)}" data-youtube-play="${esc(id)}" aria-label="Play video">
      <span class="${esc(iconCls)}" aria-hidden="true"></span>
    </button>`;
  }

  function getSlug() {
    return new URLSearchParams(location.search).get("slug") || "";
  }

  function getTagFilter() {
    return new URLSearchParams(location.search).get("tag") || "";
  }

  function splitTitleLines(section, fallback) {
    if (section.titleLine1 || section.titleLine2) {
      return { line1: section.titleLine1 || "", line2: section.titleLine2 || "" };
    }
    const full = String(section.title || section.sectionTitle || fallback || "").trim();
    const words = full.split(/\s+/);
    if (words.length > 2) {
      const mid = Math.ceil(words.length / 2);
      return { line1: words.slice(0, mid).join(" "), line2: words.slice(mid).join(" ") };
    }
    if (words.length === 2) return { line1: words[0], line2: words[1] };
    return { line1: full, line2: "" };
  }

  function renderSplitHeading(lines, options) {
    const opts = options || {};
    const tag = opts.tag || "h2";
    const baseClass = opts.className || "split-heading";
    const accentOn = opts.accentOn === "line1" ? 1 : opts.accentOn === "none" ? 0 : 2;
    const line1Class =
      accentOn === 1
        ? "split-heading__line split-heading__line--accent"
        : "split-heading__line split-heading__line--light";
    const line2Class =
      accentOn === 2
        ? "split-heading__line split-heading__line--accent"
        : "split-heading__line split-heading__line--light";
    const line2Html = lines.line2
      ? `<span class="${line2Class}">${esc(lines.line2)}</span>`
      : "";
    return `<${tag} class="${baseClass}">
      <span class="${line1Class}">${esc(lines.line1)}</span>
      ${line2Html}
    </${tag}>`;
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
        const href = `blog.html?tag=${encodeURIComponent(t.slug)}`;
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

  function applySiteMeta(site, page) {
    if (page === "article") return;
    const desc = site.metaDescription;
    if (!desc) return;
    upsertMeta("description", desc);
    upsertMeta("og:description", desc, true);
    const title = document.title || site.logo || "The Mumine";
    upsertMeta("og:title", title, true);
    upsertMeta("og:type", "website", true);
    upsertMeta("og:url", location.href, true);
    const logo = site.logoImage;
    if (logo) upsertMeta("og:image", new URL(logo, location.origin).href, true);
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
    if (fonts?.logoSerif) r.style.setProperty("--font-logo-serif", `"${fonts.logoSerif}", Georgia, serif`);
    if (fonts?.logoScript) r.style.setProperty("--font-logo-script", `"${fonts.logoScript}", cursive`);
  }

  function resolveLogoType(site) {
    const type = site?.logoType;
    if (type === "composite" || type === "single" || type === "text") return type;
    if (site?.logoIcon) return "composite";
    if (site?.logoImage || site?.logoWordmark) return "single";
    return "text";
  }

  function renderHeader(site, activePage) {
    const nav = site.nav || [];
    const contact = site.contactButton || { label: "CONTACT", href: "index.html#contact" };
    const logoType = resolveLogoType(site);
    const logoIcon = site.logoIcon || "";
    const logoWordmark = site.logoWordmark || "";
    const logoImage = site.logoImage || site.logoWordmark || "assets/logo-footer.png";
    const logoAlt = site.logo || "The Mumine";

    function navLink(item, className) {
      const active = item.page === activePage ? " is-active" : "";
      return `<a href="${esc(item.href)}" class="${className}${active}" data-page="${esc(item.page)}">${esc(item.label)}</a>`;
    }

    const desktopNav = nav.map((item) => navLink(item, "")).join("");
    const mobileNav =
      nav.map((item) => navLink(item, "")).join("") +
      `<a href="${esc(contact.href)}" class="header-cta header-cta--mobile">${esc(contact.label)}</a>`;

    const brand =
      logoType === "composite" && logoIcon && logoWordmark
        ? `<a href="index.html" class="brand brand--composite" aria-label="${esc(logoAlt)}">
          <img class="brand__icon" src="${esc(logoIcon)}" alt="" width="80" height="115">
          <img class="brand__wordmark" src="${esc(logoWordmark)}" alt="${esc(logoAlt)}" width="131" height="48">
        </a>`
        : logoType !== "text" && logoImage
          ? `<a href="index.html" class="brand"><img class="brand__img" src="${esc(logoImage)}" alt="${esc(logoAlt)}" width="131" height="48"></a>`
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

  function experienceTitleLines(exp) {
    return splitTitleLines(exp, "Built on Experience");
  }

  function experienceItemDetails(item) {
    if (item.details) return item.details;
    return item.text || "";
  }

  function renderExperience(exp) {
    const lines = experienceTitleLines(exp);
    const items = (exp.items || [])
      .map(
        (e) => `
        <li class="experience-item">
          <span class="experience-item__marker" aria-hidden="true"></span>
          <span class="experience-item__num">${esc(e.num)}</span>
          <div class="experience-item__body">
            <h3 class="experience-item__title">${esc(e.title)}</h3>
            <p class="experience-item__details">${formatText(experienceItemDetails(e))}</p>
          </div>
        </li>`
      )
      .join("");
    const visual = exp.image
      ? `<div class="experience-visual" aria-hidden="true">
          <img src="${esc(exp.image)}" alt="${esc(exp.imageAlt || "")}" width="560" height="800">
        </div>`
      : "";

    return `
      <section class="experience-section">
        <div class="container experience-section__inner">
          <div class="experience-content">
            ${renderSplitHeading(lines, { className: "split-heading split-heading--section", accentOn: "line2" })}
            <ol class="experience-timeline">${items}</ol>
          </div>
          ${visual}
        </div>
      </section>`;
  }

  function renderContact(c) {
    const ph = c.placeholders || {};
    const formName = c.formName || "contact";
    const social = (c.social || [])
      .filter((s) => s && s.label)
      .map((s) => {
        const label = esc(s.label);
        if (s.href && s.href !== "#") {
          return `<a href="${esc(s.href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
        }
        return `<span>${label}</span>`;
      })
      .join("");
    const addressLines = (c.addressLines || [])
      .map((line) => `<p>${esc(line)}</p>`)
      .join("");
    const mail = c.email ? `<p class="contact-info__mail"><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>` : "";

    return `
      <section class="contact-section" id="contact">
        <div class="container contact-section__grid">
          <div class="contact-info">
            ${renderSplitHeading(
              { line1: c.titleLine1 || "Get in", line2: c.titleLine2 || "touch" },
              { className: "split-heading split-heading--section contact-info__title", accentOn: "line2" }
            )}
            <hr class="contact-info__rule" aria-hidden="true">
            <p class="contact-info__region">${esc(c.regionLabel)}</p>
            <div class="contact-info__address">
              <p class="contact-info__city">${esc(c.locationTitle)}</p>
              ${addressLines}
              ${mail}
            </div>
            <nav class="contact-social" aria-label="Social links">${social}</nav>
          </div>
          <div class="contact-form-col">
            <h3 class="contact-form__heading">${esc(c.formHeading)}</h3>
            <form
              class="contact-form"
              name="${esc(formName)}"
              method="POST"
              data-netlify="true"
              netlify-honeypot="bot-field"
              action="${esc(c.formAction || "/index.html?contact=success#contact")}"
              data-success="${esc(c.successMessage)}"
              data-redirect-ms="${esc(String(c.redirectDelayMs ?? 3000))}"
              data-redirect-hint="${esc(c.redirectHint || "Ana sayfaya yönlendiriliyorsunuz…")}"
            >
              <input type="hidden" name="form-name" value="${esc(formName)}">
              <p class="contact-form__hp" hidden>
                <label>Don't fill this out: <input name="bot-field"></label>
              </p>
              <div class="contact-form__box">
                <div class="contact-form__row contact-form__row--split">
                  <input type="text" name="firstName" placeholder="${escAttr(ph.firstName || "First name")}" required autocomplete="given-name">
                  <input type="text" name="lastName" placeholder="${escAttr(ph.lastName || "Last name")}" required autocomplete="family-name">
                </div>
                <div class="contact-form__row">
                  <input type="email" name="email" placeholder="${escAttr(ph.email || "Email address")}" required autocomplete="email">
                </div>
                <div class="contact-form__row">
                  <input type="text" name="organization" placeholder="${escAttr(ph.organization || "Organization (optional)")}" autocomplete="organization">
                </div>
                <div class="contact-form__message">
                  <label for="contact-message">${esc(c.messageLabel || "Your objective")}</label>
                  <textarea id="contact-message" name="message" required></textarea>
                </div>
              </div>
              <div class="contact-form__actions">
                <button type="submit" class="contact-form__submit">
                  ${esc(c.submitText || "Transmit inquiry")} <span aria-hidden="true">→</span>
                </button>
              </div>
              <p class="contact-form__notice" role="status" hidden data-contact-success></p>
            </form>
          </div>
        </div>
      </section>`;
  }

  function escAttr(s) {
    return esc(s).replace(/"/g, "&quot;");
  }

  function renderFooter(site) {
    const logoSrc = site.footerLogoImage || site.logoImage || "assets/logo-footer.png";
    const credit = site.footerDesignCredit || "";
    const copy = site.footerCopyright || site.footer || "";
    return `
      <div class="container footer-inner">
        <a href="index.html" class="footer-brand">
          <img src="${esc(logoSrc)}" alt="${esc(site.logo || "The Mumine")}" width="131" height="48">
        </a>
        <p class="footer-credit">${esc(credit)}</p>
        <p class="footer-copy">${esc(copy)}</p>
      </div>`;
  }

  function renderCreativeBento(section, feat, projects, site) {
    const b = section.bento || {};
    const slug = b.projectSlug || feat.projectSlug || projects[0]?.slug || "";
    const project = (projects || []).find((p) => p.slug === slug) || projects[0] || {};
    const href = `project.html?slug=${encodeURIComponent(slug)}`;
    const heroImage = b.heroImage || feat.image || project.heroImage || project.cardImage || "";
    const heroAlt = b.heroImageAlt || project.cardTitle || b.projectTitle || "";
    const badge = b.badge || project.homeBadge || "Latest Project";
    const projectTitle = b.projectTitle || project.cardTitle || "";
    const sealImage = b.sealImage || site?.logoImage || "";
    const tags = (b.tags || [])
      .map((t) => `<span class="creative-bento__tag">${esc(t)}</span>`)
      .join("");
    const breakdownItems = (b.breakdownItems || [])
      .map((item) => `<li>${esc(item)}</li>`)
      .join("");

    return `
      <div class="creative-bento">
        <div class="creative-bento__row creative-bento__row--top">
          <a href="${href}" class="creative-bento__cell creative-bento__cell--hero">
            <img src="${esc(heroImage)}" alt="${esc(heroAlt)}" width="780" height="420" loading="lazy">
            <span class="creative-bento__badge">${esc(badge)}</span>
            <span class="creative-bento__hero-title">${esc(projectTitle)}</span>
            <span class="creative-bento__ext" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.5 13.5L13.5 4.5M13.5 4.5H7.5M13.5 4.5V10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </a>
          <div class="creative-bento__cell creative-bento__cell--info">
            <div class="creative-bento__genre-wrap">
              <p class="creative-bento__genre-label">${esc(b.genreLabel || "GENRE")}</p>
              <p class="creative-bento__genre-value">${esc(b.genre || "")}</p>
            </div>
            <div class="creative-bento__field">
              <span class="creative-bento__label">${esc(b.loglineLabel || "LOGLINE")}</span>
              <p class="creative-bento__logline">${formatText(b.logline || "")}</p>
            </div>
          </div>
        </div>
        <div class="creative-bento__row creative-bento__row--bottom">
          <div class="creative-bento__cell creative-bento__cell--seal" aria-hidden="true">
            ${sealImage ? `<img src="${esc(sealImage)}" alt="" class="creative-bento__seal-panel" width="360" height="320" loading="lazy">` : `<div class="creative-bento__pattern"></div>`}
          </div>
          <div class="creative-bento__cell creative-bento__cell--breakdown">
            ${tags ? `<div class="creative-bento__tags">${tags}</div>` : ""}
            <h3 class="creative-bento__breakdown-title">${esc(b.breakdownTitle || "PROJECT BREAKDOWN")}</h3>
            <ul class="creative-bento__breakdown-list">${breakdownItems}</ul>
          </div>
        </div>
      </div>`;
  }

  function renderCreativeProjectCard(item, project) {
    const slug = item.projectSlug || project?.slug || "";
    const image = item.image || project?.cardImage || "";
    const badge = item.badge || project?.homeBadge || "";
    const title = item.title || project?.cardTitle || "";
    const desc =
      item.description ||
      project?.homeDescription ||
      (project?.paragraphs && project.paragraphs[0]) ||
      "";
    const linkText = item.linkText || "Learn more →";

    return `
      <article class="creative-project-card">
        <div class="creative-project-card__media">
          <img src="${esc(image)}" alt="" width="480" height="360">
          ${badge ? `<span class="creative-project-card__badge">${esc(badge)}</span>` : ""}
        </div>
        <div class="creative-project-card__body">
          <h3 class="creative-project-card__title">${esc(title)}</h3>
          ${desc ? `<p class="creative-project-card__text">${formatText(desc)}</p>` : ""}
          <a href="project.html?slug=${esc(slug)}" class="link-arrow">${esc(linkText)}</a>
        </div>
      </article>`;
  }

  function renderCreativeProjects(h, projects, site) {
    const section = h.creativeProjects || {};
    const feat = h.featured || {};
    const lines = splitTitleLines(
      section.titleLine1 || section.titleLine2 ? section : feat,
      "Creative Projects"
    );
    const useBento =
      section.bento &&
      (section.bento.projectSlug ||
        section.bento.heroImage ||
        section.bento.projectTitle ||
        (section.bento.breakdownItems && section.bento.breakdownItems.length));
    const body = useBento
      ? renderCreativeBento(section, feat, projects, site)
      : (() => {
          let items = section.items;
          if (!items || !items.length) {
            items = (projects || []).slice(0, 2).map((p) => ({
              projectSlug: p.slug,
              image: p.cardImage,
              title: p.cardTitle,
              description: p.homeDescription || p.paragraphs?.[0] || "",
              badge: p.homeBadge || "",
              linkText: "Learn more →",
            }));
          }
          return `<div class="creative-projects-list">${items
            .map((item) => {
              const p = (projects || []).find((x) => x.slug === item.projectSlug);
              return renderCreativeProjectCard(item, p || item);
            })
            .join("")}</div>`;
        })();

    return `
      <section class="home-section home-section--creative" id="projects">
        <div class="container">
          ${renderSplitHeading(lines, { className: "split-heading split-heading--section", accentOn: "line2" })}
          ${body}
        </div>
      </section>`;
  }

  function renderHomeWitnessDesk(section, articles) {
    const witLines = splitTitleLines(section || {}, "The Witness Desk");
    const witIntro = section?.intro
      ? `<p class="witness-intro">${esc(section.intro)}</p>`
      : "";
    const linkText = section?.cardLinkText || "DEEP DIVE →";
    const slugs = section?.cardSlugs || ["one-fire", "layers-of-witness", "one-fire", "layers-of-witness"];
    const catalog = articles || [];
    const cards = slugs
      .map((slug) => catalog.find((a) => a.slug === slug))
      .filter(Boolean)
      .map((a) => articleCard(a, linkText, { textOnly: true, witnessDesk: true }))
      .join("");

    return `
      <section class="home-section home-section--witness">
        <div class="container">
          <div class="witness-head">
            ${renderSplitHeading(witLines, { className: "split-heading split-heading--section", accentOn: "line2" })}
            ${witIntro}
          </div>
          <div class="witness-desk-grid blog-grid">${cards}</div>
        </div>
      </section>`;
  }

  function renderHome(h, projects, site, articles) {
    const expSection = renderExperience(h.experience || {});
    const c = h.contact || {};
    const hero = h.hero || {};
    const heroLines = heroTitleLines(hero);
    const heroLead = hero.lead ? `<p class="hero-lead">${formatText(hero.lead)}</p>` : "";

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
      ${renderCreativeProjects(h, projects, site)}
      ${renderHomeWitnessDesk(h.witness || {}, articles)}
      ${expSection}
      ${renderContact(c)}`;
  }

  function renderWorkCardTags(tags) {
    const list = normalizeTags(tags || []);
    if (!list.length) return "";
    const items = list.map((t) => `<li class="work-card__tag">${esc(t.label)}</li>`).join("");
    return `<ul class="work-card__tags" aria-label="Tags">${items}</ul>`;
  }

  function projectCard(p, ctaText) {
    const desc = p.cardExcerpt || (p.paragraphs && p.paragraphs[0]) || "";
    const href = `project.html?slug=${encodeURIComponent(p.slug)}`;
    const tags = renderWorkCardTags(p.cardTags || p.tags);
    const cta = ctaText || "Review the project";
    return `
      <article class="work-card">
        <a class="work-card__media" href="${href}">
          <img class="work-card__image" src="${esc(p.cardImage)}" alt="" width="550" height="413" loading="lazy">
        </a>
        <div class="work-card__body">
          ${tags}
          <h2 class="work-card__title"><a href="${href}">${esc(p.cardTitle)}</a></h2>
          ${desc ? `<p class="work-card__desc">${formatText(desc)}</p>` : ""}
          <a class="work-card__cta" href="${href}">
            <span>${esc(cta).toUpperCase()}</span>
            <span class="work-card__cta-icon" aria-hidden="true">→</span>
          </a>
        </div>
      </article>`;
  }

  function articleCardExcerpt(article, options) {
    const opts = options || {};
    if (opts.witnessDesk && article.witnessExcerpt) return article.witnessExcerpt;
    if (article.cardExcerpt) return article.cardExcerpt;
    return articleExcerpt(article);
  }

  function renderBlogCardTags(tags, tagPage) {
    const list = normalizeTags(tags);
    if (!list.length) return "";
    const base = tagPage || "blog.html";
    const items = list
      .map((t) => {
        const href = `${base}?tag=${encodeURIComponent(t.slug)}`;
        return `<li class="blog-tag"><a href="${href}" rel="tag">${esc(t.label)}</a></li>`;
      })
      .join("");
    return `<ul class="blog-card__tags" aria-label="Etiketler">${items}</ul>`;
  }

  function renderArchiveCardTags(tags) {
    const list = normalizeTags(tags);
    if (!list.length) return "";
    const items = list.map((t) => `<li class="blog-card__tag">${esc(t.label)}</li>`).join("");
    return `<ul class="blog-card__tags" aria-label="Tags">${items}</ul>`;
  }

  function articleArchiveCard(a, ctaText) {
    const excerpt = articleCardExcerpt(a);
    const href = `article.html?slug=${encodeURIComponent(a.slug)}`;
    const tags = renderArchiveCardTags(a.tags);
    const title = a.cardTitle || a.title || "";
    const cta = ctaText || "Review the blog";
    return `
      <article class="blog-card blog-card--archive">
        <a class="blog-card__media" href="${href}">
          <img class="blog-card__image" src="${esc(a.cardImage)}" alt="" width="550" height="413" loading="lazy">
        </a>
        <div class="blog-card__body">
          ${tags}
          <h2 class="blog-card__title"><a href="${href}">${esc(title)}</a></h2>
          ${excerpt ? `<p class="blog-card__excerpt">${formatText(excerpt)}</p>` : ""}
          <a class="blog-card__cta" href="${href}">
            <span>${esc(cta).toUpperCase()}</span>
            <span class="blog-card__cta-icon" aria-hidden="true">→</span>
          </a>
        </div>
      </article>`;
  }

  function renderArticleCardTitle(a, href, options) {
    const opts = options || {};
    if (opts.witnessDesk && a.witnessTitle) {
      return `<h2 class="blog-card__title"><a href="${href}">${esc(a.witnessTitle)}</a></h2>`;
    }
    const l1 = a.cardTitleLine1;
    const l2 = a.cardTitleLine2;
    if (l1 || l2) {
      const line1 = l1 ? `<span class="blog-card__title-line">${esc(l1)}</span>` : "";
      const line2 = l2 ? `<span class="blog-card__title-line">${esc(l2)}</span>` : "";
      return `<h2 class="blog-card__title"><a href="${href}">${line1}${line2}</a></h2>`;
    }
    const title = a.cardTitle || a.title || "";
    const parts = String(title).split("\n");
    if (parts.length > 1) {
      return `<h2 class="blog-card__title"><a href="${href}">${parts
        .map((p) => `<span class="blog-card__title-line">${esc(p.trim())}</span>`)
        .join("")}</a></h2>`;
    }
    return `<h2 class="blog-card__title"><a href="${href}">${esc(title)}</a></h2>`;
  }

  function articleCard(a, ctaText, options) {
    const opts = options || {};
    const tags = opts.textOnly ? "" : renderBlogCardTags(a.tags);
    const excerpt = articleCardExcerpt(a, opts);
    const cta = ctaText || "DEEP DIVE →";
    const href = `article.html?slug=${encodeURIComponent(a.slug)}`;
    const ctaHtml = opts.textOnly
      ? `<a class="blog-card__cta" href="${href}"><span>DEEP DIVE</span><span class="blog-card__cta-icon" aria-hidden="true">→</span></a>`
      : `<a class="blog-card__cta" href="${href}">${esc(cta)}</a>`;
    const cardClass = opts.textOnly ? "blog-card blog-card--text" : "blog-card";
    const media = opts.textOnly
      ? ""
      : `
        <a class="blog-card__media" href="${href}">
          <img class="blog-card__image" src="${esc(a.cardImage)}" alt="" width="800" height="500" loading="lazy">
        </a>`;

    return `
      <article class="${cardClass}">
        ${media}
        <div class="blog-card__body">
          ${tags}
          ${renderArticleCardTitle(a, href, opts)}
          ${excerpt ? `<p class="blog-card__excerpt">${formatText(excerpt)}</p>` : ""}
          ${ctaHtml}
        </div>
      </article>`;
  }

  function thinkingTitleLines(t) {
    return splitTitleLines(t, "The Witness Desk");
  }

  function blogTitleLines(b) {
    return splitTitleLines(b, "What I'm Thinking");
  }

  function renderBlog(b, articles, allArticles) {
    const tagSlug = getTagFilter();
    let list = articles || [];
    const catalog = allArticles || articles || [];
    const ctaText = b.cardLinkText || "Review the blog";

    if (!tagSlug && Array.isArray(b.cardSlugs) && b.cardSlugs.length) {
      list = b.cardSlugs
        .map((slug) => catalog.find((a) => a.slug === slug))
        .filter(Boolean);
    }

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
        <section class="blog-hero blog-hero--filter">
          <div class="container">
            <p class="blog-back"><a href="blog.html">← All posts</a></p>
            <h1 class="blog-hero__title blog-hero__title--filter">${esc(label)}</h1>
          </div>
        </section>`;
    } else {
      const lines = blogTitleLines(b);
      const lead = b.lead ? `<p class="blog-hero__lead hero-lead">${formatText(b.lead)}</p>` : "";
      heroHtml = `
        <section class="blog-hero">
          <div class="container">
            ${renderSplitHeading(lines, { tag: "h1", className: "split-heading split-heading--page", accentOn: "line2" })}
            ${lead}
          </div>
        </section>`;
    }

    const cards = list.length
      ? list.map((a) => articleArchiveCard(a, ctaText)).join("")
      : `<p class="blog-grid__empty">No posts with this tag yet.</p>`;
    const blogInitial = parseInt(b.initialVisible || "4", 10);
    const loadMore =
      !tagSlug && b.showLoadMore !== false && list.length > blogInitial
        ? `<div class="blog-load-more">
            <button type="button" class="blog-load-more__btn" data-load-more data-initial="${blogInitial}">
              ${esc(b.loadMoreText || "Load more archive").toUpperCase()}
              <span class="blog-load-more__icon" aria-hidden="true">↓</span>
            </button>
          </div>`
        : "";

    return `
      ${heroHtml}
      <section class="blog-archive">
        <div class="container">
          <div class="blog-grid blog-grid--archive">${cards}</div>
          ${loadMore}
        </div>
      </section>`;
  }

  function renderWorks(w, projects) {
    const lines = splitTitleLines(w, "Selected Works");
    const catalog = projects || [];
    let list = catalog;
    if (Array.isArray(w.projectSlugs) && w.projectSlugs.length) {
      list = w.projectSlugs
        .map((slug) => catalog.find((p) => p.slug === slug))
        .filter(Boolean);
    }
    const lead = w.lead ? `<p class="works-hero__lead hero-lead">${formatText(w.lead)}</p>` : "";
    const ctaText = w.cardLinkText || "Review the project";
    const cards = list.map((p) => projectCard(p, ctaText)).join("");
    const worksInitial = parseInt(w.initialVisible || "4", 10);
    const loadMore =
      w.showLoadMore !== false && list.length > worksInitial
        ? `<div class="works-load-more">
            <button type="button" class="works-load-more__btn" data-load-more data-initial="${worksInitial}">
              ${esc(w.loadMoreText || "Load more archive").toUpperCase()}
              <span class="works-load-more__icon" aria-hidden="true">↓</span>
            </button>
          </div>`
        : "";
    return `
      <section class="works-hero">
        <div class="container">
          ${renderSplitHeading(lines, { tag: "h1", className: "split-heading split-heading--page", accentOn: "line2" })}
          ${lead}
        </div>
      </section>
      <section class="works-archive">
        <div class="container">
          <div class="works-grid">${cards}</div>
          ${loadMore}
        </div>
      </section>`;
  }

  function renderThinking(t, articles, allArticles) {
    const tagSlug = getTagFilter();
    let list = articles || [];
    const ctaText = t.cardLinkText || "DEEP DIVE →";
    const textOnlyCards = t.textOnlyCards !== false;
    let heroHtml = "";
    const catalog = allArticles || articles || [];

    if (!tagSlug && Array.isArray(t.cardSlugs) && t.cardSlugs.length) {
      list = t.cardSlugs
        .map((slug) => catalog.find((a) => a.slug === slug))
        .filter(Boolean);
    }

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
            <p class="thinking-back"><a href="blog.html">← All posts</a></p>
            <h1 class="thinking-hero__title thinking-hero__title--filter">${esc(label)}</h1>
          </div>
        </section>`;
    } else {
      const lines = thinkingTitleLines(t);
      heroHtml = `
        <section class="thinking-hero">
          <div class="container">
            ${renderSplitHeading(lines, {
              tag: "h1",
              className: "split-heading split-heading--page",
              accentOn: "line2",
            })}
            ${t.lead ? `<p class="thinking-hero__lead">${esc(t.lead)}</p>` : ""}
          </div>
        </section>`;
    }

    const cards = list.length
      ? list.map((a) => articleCard(a, ctaText, { textOnly: textOnlyCards && !tagSlug })).join("")
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

  function renderProjectMissionPanel(mission) {
    const paras = (mission.paragraphs || [])
      .map((x) => `<p>${formatText(x)}</p>`)
      .join("");
    return `
      <p class="project-inside__mission-label">${esc(mission.label || "THE MISSION")}</p>
      <p class="project-inside__mission-quote">${formatText(mission.quote || "")}</p>
      <div class="project-inside__mission-copy">${paras}</div>`;
  }

  function renderProjectInside(p) {
    const mission = p.mission || {};
    const missionImage = mission.image || p.sideImage || p.heroImage;
    const play = renderProjectPlayButton(p, "project-inside__play");
    const titleHtml = (() => {
      if (p.titleLine1 && p.titleLine2) {
        const l1 = esc(String(p.titleLine1).toUpperCase());
        const l2raw = String(p.titleLine2).toUpperCase();
        const accentWord = p.titleAccent ? String(p.titleAccent).toUpperCase() : "";
        if (accentWord && l2raw.includes(accentWord)) {
          const idx = l2raw.lastIndexOf(accentWord);
          const prefix = esc(l2raw.slice(0, idx));
          const accent = esc(l2raw.slice(idx));
          return `<span class="project-inside__page-title-line">${l1}</span><span class="project-inside__page-title-line">${prefix}<span class="project-inside__page-title-accent">${accent}</span></span>`;
        }
        return `<span class="project-inside__page-title-line">${l1}</span><span class="project-inside__page-title-line">${esc(l2raw)}</span>`;
      }
      const displayTitle = p.displayTitle || (p.title || "").toUpperCase();
      return esc(displayTitle);
    })();
    const projectDate = p.projectDate || "";
    const storyIntro = p.storyEngineIntro || "";
    const articles = (p.storyArticles || [])
      .map(
        (a) => `
        <article class="project-inside__article">
          <h3 class="project-inside__article-title">${esc(a.heading)}</h3>
          <div class="project-inside__article-body">
            ${(a.paragraphs || []).map((x) => (x ? `<p>${formatText(x)}</p>` : "")).join("")}
          </div>
        </article>`
      )
      .join("");
    const cta = p.materialsCta || {};
    const materialsBtn = cta.text
      ? `<a class="project-inside__materials-btn" href="${esc(cta.href || "#")}">
          <span>${esc(cta.text).toUpperCase()}</span>
          <span class="project-inside__materials-icon" aria-hidden="true"></span>
        </a>`
      : "";
    const closingImage = p.closingImage || p.heroImage;

    return `
      <div class="project-inside">
        <section class="project-inside__hero" aria-label="Project video">
          <div class="project-inside__hero-frame">
            <img
              class="project-inside__hero-image"
              src="${esc(p.heroImage)}"
              alt="${esc(p.sideImageAlt || p.cardTitle || "")}"
              width="1280"
              height="720"
            >
            ${p.heroImageOverlay ? `<img class="project-inside__hero-overlay" src="${esc(p.heroImageOverlay)}" alt="" width="1280" height="720">` : ""}
            ${play}
          </div>
        </section>

        <div class="project-inside__main">
          <header class="project-inside__title-block">
            ${projectDate ? `<p class="project-inside__date">${esc(projectDate)}</p>` : ""}
            <h1 class="project-inside__page-title">${titleHtml}</h1>
          </header>

          <section class="project-inside__brief project-inside__brief--left" aria-labelledby="mission-left">
            <div class="project-inside__brief-stage">
              <div class="project-inside__brief-media" aria-hidden="true">
                <img src="${esc(missionImage)}" alt="" width="727" height="1279" loading="lazy">
              </div>
              <div class="project-inside__brief-panel" id="mission-left">
                ${renderProjectMissionPanel(mission)}
              </div>
            </div>
          </section>

          <section class="project-inside__story" aria-labelledby="story-engine-title">
            <header class="project-inside__story-head">
              <h2 class="project-inside__story-title" id="story-engine-title">STORY ENGINE</h2>
              <span class="project-inside__story-rule" aria-hidden="true"></span>
              ${storyIntro ? `<p class="project-inside__story-intro">${formatText(storyIntro)}</p>` : ""}
            </header>
            ${articles ? `<div class="project-inside__articles">${articles}</div>` : ""}
          </section>

          <section class="project-inside__brief project-inside__brief--right" id="materials" aria-labelledby="mission-right">
            <div class="project-inside__brief-stage project-inside__brief-stage--split">
              <div class="project-inside__brief-media project-inside__brief-media--split" aria-hidden="true">
                <img src="${esc(missionImage)}" alt="" width="727" height="1279" loading="lazy">
              </div>
              <div class="project-inside__brief-panel project-inside__brief-panel--right" id="mission-right">
                <div class="project-inside__brief-panel-inner">
                  ${renderProjectMissionPanel(mission)}
                  ${materialsBtn}
                </div>
              </div>
            </div>
          </section>

          ${
            closingImage
              ? `<section class="project-inside__closing" aria-hidden="true">
                  <img
                    class="project-inside__closing-image"
                    src="${esc(closingImage)}"
                    alt=""
                    width="1280"
                    height="724"
                    loading="lazy"
                  >
                </section>`
              : ""
          }
        </div>
      </div>`;
  }

  function renderProjectLegacy(p) {
    const paras = (p.paragraphs || []).map((x) => `<p>${formatText(x)}</p>`).join("");
    const story = (p.storySections || [])
      .map(
        (s) =>
          `<article class="story-block__item">
            <h3 class="story-block__heading">${esc(s.heading)}</h3>
            ${(s.paragraphs || []).map((x) => `<p>${formatText(x)}</p>`).join("")}
          </article>`
      )
      .join("");
    const gallery = (p.gallery || [])
      .map(
        (src) =>
          `<figure class="project-gallery__figure">
            <img src="${esc(src)}" alt="" width="1152" height="713" loading="lazy">
          </figure>`
      )
      .join("");
    const play = renderProjectPlayButton(p, "project-hero__play");
    const tags = renderWorkCardTags(p.cardTags || p.tags);
    const lead = p.cardExcerpt
      ? `<p class="project-header__lead hero-lead">${esc(p.cardExcerpt)}</p>`
      : "";
    const meta = p.meta ? `<p class="project-header__meta">${esc(p.meta)}</p>` : "";

    const storyTitleLines = splitTitleLines(
      {
        titleLine1: p.storyTitleLine1 || "Story",
        titleLine2: p.storyTitleLine2 || p.storyTitle?.replace(/^Story\s*/i, "") || "Engine",
      },
      p.storyTitle || "Story Engine"
    );

    return `
      <section class="project-hero">
        <img class="project-hero__image" src="${esc(p.heroImage)}" alt="${esc(p.sideImageAlt || p.cardTitle || "")}" width="963" height="596">
        ${play}
      </section>
      <header class="container project-header">
        <p class="project-back"><a href="works.html">← All projects</a></p>
        ${tags}
        ${renderSplitHeading(
          splitTitleLines({ titleLine1: p.titleLine1 || "Project:", titleLine2: p.titleLine2 || p.title }, p.title),
          { tag: "h1", className: "split-heading split-heading--project", accentOn: "line2" }
        )}
        ${meta}
        ${lead}
      </header>
      <section class="project-intro">
        <div class="container project-intro__grid">
          <div class="project-intro__copy prose">${paras}</div>
          <figure class="project-intro__figure">
            <img src="${esc(p.sideImage)}" alt="${esc(p.sideImageAlt || "")}" width="550" height="688" loading="lazy">
          </figure>
        </div>
      </section>
      <section class="story-section">
        <div class="container">
          <div class="story-section__head">
            ${renderSplitHeading(storyTitleLines, {
              tag: "h2",
              className: "split-heading split-heading--section story-section__title",
              accentOn: "line2",
            })}
            <span class="story-section__rule" aria-hidden="true"></span>
          </div>
          <div class="story-block">${story}</div>
        </div>
      </section>
      ${gallery ? `<section class="project-gallery"><div class="container project-gallery__stack">${gallery}</div></section>` : ""}`;
  }

  function renderProject(p) {
    if (p.mission || (p.storyArticles && p.storyArticles.length)) {
      return renderProjectInside(p);
    }
    return renderProjectLegacy(p);
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
        if (b.line1 || b.line2) {
          return `<p class="article-end">
            <span class="article-end__line article-end__line--light">${esc(b.line1 || "End of")}</span>
            <span class="article-end__line article-end__line--accent">${esc(b.line2 || b.text || "")}</span>
          </p>`;
        }
        return `<p class="article-end">${esc(b.text)}</p>`;
      default:
        return "";
    }
  }

  function renderArticleInsideProse(paragraphs, emphasis) {
    const paras = (paragraphs || []).map((x) => `<p>${formatText(x)}</p>`).join("");
    const emph = emphasis ? `<p class="article-inside__emphasis">${formatText(emphasis)}</p>` : "";
    return `<div class="article-inside__prose-copy">${paras}${emph}</div>`;
  }

  function renderArticleInsideSection(s) {
    switch (s.type) {
      case "prose":
        return `<section class="article-inside__section article-inside__section--prose">${renderArticleInsideProse(
          s.paragraphs,
          s.emphasis
        )}</section>`;
      case "marker":
        return `<div class="article-inside__marker-row">
          <span class="article-inside__marker">${esc(s.value)}</span>
        </div>`;
      case "quote-section":
        return `<section class="article-inside__quote-block">
          <blockquote class="article-inside__quote">${esc(s.quote)}</blockquote>
          ${renderArticleInsideProse(s.paragraphs, s.emphasis)}
        </section>`;
      case "image":
        return `<figure class="article-inside__photo">
          <img src="${esc(s.src)}" alt="${esc(s.alt || "")}" width="1066" height="603" loading="lazy">
        </figure>`;
      case "closing":
        return `<section class="article-inside__closing">
          <h2 class="article-inside__closing-title">${esc(s.title)}</h2>
          <div class="article-inside__closing-body">${renderArticleInsideProse(s.paragraphs)}</div>
        </section>`;
      default:
        return "";
    }
  }

  function renderArticleInside(a) {
    const displayTitle =
      a.displayTitle ||
      [a.titleLine1, a.titleLine2].filter(Boolean).join(" ").toUpperCase() ||
      (a.title || "").toUpperCase();
    const subtitle = a.subtitle || a.cardExcerpt || "";
    const sections = (a.insideSections || []).map(renderArticleInsideSection).join("");
    const closing = a.closingSection
      ? renderArticleInsideSection({ type: "closing", ...a.closingSection })
      : "";

    return `
      <article class="article-inside">
        <div class="article-inside__intro">
          <header class="article-inside__head">
            <h1 class="article-inside__title">${esc(displayTitle)}</h1>
            ${subtitle ? `<p class="article-inside__subtitle">${formatText(subtitle)}</p>` : ""}
            <span class="article-inside__divider" aria-hidden="true"></span>
          </header>
          <div class="article-inside__content">${sections}</div>
        </div>
        ${closing ? `<div class="article-inside__outro">${closing}</div>` : ""}
      </article>`;
  }

  function renderArticleLegacy(a) {
    const body = (a.blocks || []).map(renderArticleBlock).join("");
    const tags = renderTagList(a.tags);
    const metaLine = a.meta ? `<p class="article-meta-line">${esc(a.meta)}</p>` : "";
    const titleHtml =
      a.titleLine1 || a.titleLine2
        ? renderSplitHeading(
            { line1: a.titleLine1 || a.title, line2: a.titleLine2 || "" },
            { tag: "h1", className: "split-heading split-heading--article", accentOn: "line2" }
          )
        : `<h1>${esc(a.title)}</h1>`;
    return `
      <header class="container article-header">
        ${tags}
        ${titleHtml}
        ${metaLine}
      </header>
      <article class="container article-body">${body}</article>`;
  }

  function renderArticle(a) {
    if (a.insideSections && a.insideSections.length) {
      return renderArticleInside(a);
    }
    return renderArticleLegacy(a);
  }

  function renderAboutImage(image, className) {
    if (!image?.src) {
      return `<div class="${className} about-bg about-bg--empty" aria-hidden="true"></div>`;
    }
    const pos = image.position || "center top";
    const src = String(image.src).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    return `<div class="about-bg ${className}" style="background-image:url('${src}');background-position:${esc(pos)};" role="img" aria-label="${esc(image.alt || "")}"></div>`;
  }

  function renderAbout(ab) {
    const hero = ab.hero || {};
    const story = ab.story || {};
    const skills = ab.skills || {};
    const heroBioInner = hero.bio
      ? formatText(hero.bio)
      : (hero.paragraphs || []).map((p) => `<p>${formatText(p)}</p>`).join("");
    const storyBlocks = (story.blocks || [])
      .map(
        (b) => `
        <article class="about-story-block">
          <p class="about-story-label"><span class="about-story-num">${esc(b.num)}</span> / <span class="about-story-tag">${esc(b.label)}</span></p>
          <h3 class="about-story-heading">${formatText(b.heading || b.quote || "")}</h3>
          <p class="about-story-text">${formatText(b.text)}</p>
        </article>`
      )
      .join("");
    const skillCards = (skills.cards || [])
      .map(
        (c) => `
        <div class="about-skill-card">
          <span class="about-skill-card__num">${esc(c.num)}</span>
          <h3 class="about-skill-card__title">${esc(c.title)}</h3>
          ${c.body ? `<p class="about-skill-card__body">${formatText(c.body)}</p>` : `<ul class="about-skill-card__list">${(c.items || []).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`}
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
            <div class="about-hero__bio">${heroBioInner}</div>
          </div>
          ${renderAboutImage(hero.image, "about-hero__media")}
        </div>
      </section>

      <section class="about-story">
        <div class="container about-story__grid">
          ${renderAboutImage(story.image, "about-story__media")}
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
    if (page === "blog" && titles.blog) document.title = titles.blog;
    if (page === "thinking" && titles.thinking) document.title = titles.thinking;
    if (page === "about" && titles.about) document.title = titles.about;
    applySiteMeta(site, page);

    const headerEl = document.getElementById("site-header");
    const mainEl = document.getElementById("page-root");
    const footerEl = document.getElementById("site-footer");

    let activePage = page;
    if (page === "project") activePage = "works";
    if (page === "article") activePage = "blog";

    if (headerEl) headerEl.innerHTML = renderHeader(site, activePage);
    if (footerEl) footerEl.innerHTML = renderFooter(site);

    if (!mainEl) return;

    if (page === "home") {
      mainEl.innerHTML = renderHome(data.home || {}, data.projects || [], site, data.articles || []);
    } else if (page === "works") {
      mainEl.innerHTML = renderWorks(data.works || {}, data.projects || []);
    } else if (page === "blog") {
      mainEl.innerHTML = renderBlog(data.blog || {}, data.articles || [], data.articles || []);
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
        mainEl.innerHTML = `<div class="container page-hero"><h1>Project not found</h1><p><a href="works.html">← All projects</a></p></div>`;
      } else {
        document.title = p.title + " — The Mumine";
        mainEl.innerHTML = renderProject(p);
      }
    } else if (page === "article") {
      const slug = getSlug();
      const a = (data.articles || []).find((x) => x.slug === slug);
      if (!a) {
        mainEl.innerHTML = `<div class="container page-hero"><h1>Article not found</h1><p><a href="blog.html">← All posts</a></p></div>`;
      } else {
        applyArticleSeo(a, site);
        mainEl.innerHTML = renderArticle(a);
      }
    }

    if (window.initSiteUI) window.initSiteUI();
    if (page === "works" || page === "blog" || page === "thinking") initArchiveLoadMore();
  }

  function initArchiveLoadMore() {
    const btn = document.querySelector("[data-load-more]");
    if (!btn) return;
    const section = btn.closest("section");
    const grid = section?.querySelector(".blog-grid, .works-grid");
    if (!grid) return;
    const cardSelector = grid.classList.contains("works-grid") ? ".work-card" : ".blog-card";
    const initial = parseInt(btn.dataset.initial || "4", 10);
    const cards = [...grid.querySelectorAll(cardSelector)];
    if (cards.length <= initial) {
      btn.parentElement?.remove();
      return;
    }
    cards.forEach((card, i) => {
      if (i >= initial) card.classList.add("archive-card--hidden");
    });
    btn.addEventListener("click", () => {
      cards.forEach((card) => card.classList.remove("archive-card--hidden"));
      btn.parentElement?.remove();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
