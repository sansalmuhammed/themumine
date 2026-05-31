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
    const year = new Date().getFullYear();
    return `<div class="container">© ${year} ${esc(site.footer)}</div>`;
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

    return `
      <section class="hero">
        <img class="hero-bg" src="${esc(h.hero?.image)}" alt="${esc(h.hero?.imageAlt || "")}" width="1600" height="900">
        <div class="hero-overlay" aria-hidden="true"></div>
        <div class="hero-content"><h1>${esc(h.hero?.title)}</h1></div>
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

  function articleCard(a) {
    return `
      <a href="article.html?slug=${esc(a.slug)}" class="card">
        <img class="card-image" src="${esc(a.cardImage)}" alt="" width="800" height="500">
        <h2>${esc(a.cardTitle)}</h2>
        <p class="meta">${esc(a.meta)}</p>
      </a>`;
  }

  function renderWorks(w, projects) {
    const cards = projects.map(projectCard).join("");
    return `
      <div class="container page-hero"><h1>${esc(w.title)}</h1></div>
      <div class="container card-grid">${cards}</div>`;
  }

  function renderThinking(t, articles) {
    const cards = articles.map(articleCard).join("");
    return `
      <div class="container page-hero"><h1>${esc(t.title)}</h1></div>
      <div class="container card-grid">${cards}</div>`;
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
    return `
      <header class="container article-header"><h1>${esc(a.title)}</h1></header>
      <article class="container article-body">${body}</article>`;
  }

  function renderAbout(ab) {
    const bio = (ab.bio || []).map((p) => `<p>${esc(p)}</p>`).join("");
    const portraits = (ab.portraits || [])
      .map((ph) => `<img src="${esc(ph.src)}" alt="${esc(ph.alt || "")}" width="400" height="533">`)
      .join("");
    const skills = (ab.skills || [])
      .map(
        (col) => `
        <div class="skills-col">
          <h3>${esc(col.title)}</h3>
          <ul>${(col.items || []).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
        </div>`
      )
      .join("");

    return `
      <div class="container about-header page-hero"><h1>${esc(ab.title)}</h1></div>
      <div class="container about-grid">
        <div class="bio">${bio}</div>
        <div class="portraits">${portraits}</div>
      </div>
      <section class="section">
        <div class="container">
          <h2 class="section-title">${esc(ab.skillsTitle)}</h2>
          <div class="skills-grid">${skills}</div>
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
      /* yerel önizleme */
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
      mainEl.innerHTML = renderThinking(data.thinking || {}, data.articles || []);
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
        document.title = a.title + " — The Mumine";
        mainEl.innerHTML = renderArticle(a);
      }
    }

    if (window.initSiteUI) window.initSiteUI();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
