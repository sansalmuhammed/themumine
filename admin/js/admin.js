(function () {
  const IS_LOCAL = /^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
  const IS_NETLIFY = !IS_LOCAL;
  const API = "../api";
  let content = {};
  let section = "site";
  let openCards = new Set();

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  function resolveUrl(path) {
    if (!IS_NETLIFY) return API + path;
    if (path.includes("auth.php?action=check")) return "/.netlify/functions/auth-check";
    if (path.includes("auth.php?action=login")) return "/.netlify/functions/login";
    if (path.includes("auth.php?action=logout")) return "/.netlify/functions/logout";
    if (path === "/content.php") return "/.netlify/functions/content";
    return API + path;
  }

  const titles = {
    site: "Site & Tema",
    home: "Ana Sayfa",
    works: "Selected Works",
    projects: "Projeler",
    thinking: "Yazılar Listesi",
    articles: "Makaleler",
    about: "Hakkımda",
  };

  async function api(path, opts = {}) {
    const res = await fetch(resolveUrl(path), {
      credentials: "same-origin",
      ...opts,
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    });
    return res.json();
  }

  function toast(msg, isError) {
    const el = $("#toast");
    el.textContent = msg;
    el.className = "toast is-visible" + (isError ? " error" : "");
    setTimeout(() => el.classList.remove("is-visible"), 2800);
  }

  function deepGet(obj, path) {
    return path.split(".").reduce((o, k) => (o != null ? o[k] : undefined), obj);
  }

  function deepSet(obj, path, val) {
    const keys = path.split(".");
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (cur[keys[i]] == null) cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = val;
  }

  function field(label, path, value, type = "text", hint = "") {
    const id = "f-" + path.replace(/[^a-z0-9]/gi, "-");
    if (type === "textarea") {
      return `<div class="field"><label for="${id}">${label}</label><textarea id="${id}" data-path="${path}">${esc(value)}</textarea>${hint ? `<p class="hint">${hint}</p>` : ""}</div>`;
    }
    if (type === "checkbox") {
      const checked = value ? " checked" : "";
      return `<div class="field checkbox-field"><input type="checkbox" id="${id}" data-path="${path}"${checked}><label for="${id}">${label}</label></div>`;
    }
    return `<div class="field"><label for="${id}">${label}</label><input type="${type}" id="${id}" data-path="${path}" value="${escAttr(value)}">${hint ? `<p class="hint">${hint}</p>` : ""}</div>`;
  }

  function imgSrc(url) {
    if (!url) return "";
    return /^https?:\/\//i.test(url) ? url : "../" + url.replace(/^\//, "");
  }

  function imageField(label, path, value) {
    const id = "img-" + path.replace(/[^a-z0-9]/gi, "-");
    const preview = value ? `<div class="preview"><img src="${escAttr(imgSrc(value))}" alt="" onerror="this.style.display='none'"></div>` : "";
    return `<div class="field image-field">
      <label>${label}</label>
      <input type="url" id="${id}" data-path="${path}" value="${escAttr(value || "")}" placeholder="URL veya assets/uploads/...">
      ${preview}
      <div class="image-actions">
        <label class="btn btn-secondary btn-sm"><input type="file" accept="image/*" data-upload="${path}" hidden> Yükle</label>
      </div>
    </div>`;
  }

  function esc(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escAttr(s) {
    return esc(s).replace(/"/g, "&quot;");
  }

  function bindFields(root) {
    root.querySelectorAll("[data-path]").forEach((el) => {
      const ev = el.type === "checkbox" ? "change" : "input";
      el.addEventListener(ev, () => {
        let val = el.type === "checkbox" ? el.checked : el.value;
        if (el.dataset.arrayIndex != null) {
          const arrPath = el.dataset.arrayPath;
          const idx = parseInt(el.dataset.arrayIndex, 10);
          const key = el.dataset.arrayKey;
          const arr = deepGet(content, arrPath) || [];
          if (!arr[idx]) arr[idx] = {};
          if (key) arr[idx][key] = val;
          else arr[idx] = val;
          deepSet(content, arrPath, arr);
        } else {
          deepSet(content, el.dataset.path, val);
        }
        if (el.closest(".image-field")) {
          const wrap = el.closest(".image-field");
          let prev = wrap.querySelector(".preview");
          if (!prev) {
            prev = document.createElement("div");
            prev.className = "preview";
            wrap.insertBefore(prev, wrap.querySelector(".image-actions"));
          }
          prev.innerHTML = val ? `<img src="${escAttr(imgSrc(val))}" alt="">` : "";
        }
      });
    });

    root.querySelectorAll("[data-upload]").forEach((input) => {
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;
        const path = input.dataset.upload;
        const fd = new FormData();
        fd.append("file", file);
        try {
          const res = await fetch(API + "/upload.php", { method: "POST", body: fd, credentials: "same-origin" });
          const json = await res.json();
          if (!json.ok) throw new Error(json.error);
          deepSet(content, path, json.url);
          const urlInput = root.querySelector(`[data-path="${path}"]`);
          if (urlInput) {
            urlInput.value = json.url;
            urlInput.dispatchEvent(new Event("input"));
          }
          toast("Görsel yüklendi");
        } catch (e) {
          toast(e.message || "Yükleme hatası", true);
        }
        input.value = "";
      });
    });
  }

  function itemCard(title, index, bodyHtml, cardId) {
    const open = openCards.has(cardId) ? " is-open" : "";
    return `<div class="item-card${open}" data-card="${cardId}">
      <div class="item-card-header" data-toggle="${cardId}"><strong>${esc(title)}</strong><span>▼</span></div>
      <div class="item-card-body">${bodyHtml}</div>
    </div>`;
  }

  function bindCards(root) {
    root.querySelectorAll("[data-toggle]").forEach((h) => {
      h.addEventListener("click", () => {
        const id = h.dataset.toggle;
        const card = h.closest(".item-card");
        card.classList.toggle("is-open");
        if (card.classList.contains("is-open")) openCards.add(id);
        else openCards.delete(id);
      });
    });
  }

  function renderSite() {
    const s = content.site || {};
    const t = s.theme || {};
    const f = s.fonts || {};
    const pt = s.pageTitles || {};
    const nav = s.nav || [];

    let navHtml = nav
      .map(
        (n, i) => `
      <div class="field-row">
        ${field("Menü metni", `site.nav.${i}.label`, n.label)}
        ${field("Link", `site.nav.${i}.href`, n.href)}
      </div>
      ${field("Sayfa kodu (home, works…)", `site.nav.${i}.page`, n.page)}`
      )
      .join("");

    return `
      <div class="panel"><h3>Genel</h3>
        ${field("Logo metni", "site.logo", s.logo)}
        ${field("Footer metni", "site.footer", s.footer)}
        ${field("Meta açıklama", "site.metaDescription", s.metaDescription, "textarea")}
      </div>
      <div class="panel"><h3>Menü</h3>${navHtml}
        <button type="button" class="btn btn-secondary btn-sm" id="add-nav">+ Menü öğesi</button>
      </div>
      <div class="panel"><h3>Tema renkleri</h3>
        <div class="field-row">
          ${field("Arka plan", "site.theme.bg", t.bg, "color")}
          ${field("Metin", "site.theme.text", t.text, "color")}
        </div>
        <div class="field-row">
          ${field("Soluk metin", "site.theme.textMuted", t.textMuted, "color")}
          ${field("Vurgu (kırmızı)", "site.theme.accent", t.accent, "color")}
        </div>
        <div class="field-row">
          ${field("Vurgu hover", "site.theme.accentHover", t.accentHover, "color")}
          ${field("Kenarlık", "site.theme.border", t.border, "color")}
        </div>
      </div>
      <div class="panel"><h3>Fontlar</h3>
        ${field("Gövde fontu", "site.fonts.body", f.body)}
        ${field("Başlık fontu", "site.fonts.display", f.display)}
      </div>
      <div class="panel"><h3>Sayfa başlıkları (tarayıcı sekmesi)</h3>
        ${field("Ana sayfa", "site.pageTitles.home", pt.home)}
        ${field("Works", "site.pageTitles.works", pt.works)}
        ${field("Thinking", "site.pageTitles.thinking", pt.thinking)}
        ${field("About", "site.pageTitles.about", pt.about)}
      </div>`;
  }

  function renderHome() {
    const h = content.home || {};
    const hero = h.hero || {};
    const feat = h.featured || {};
    const wit = h.witness || {};
    const exp = h.experience || {};
    const c = h.contact || {};
    const labels = c.labels || {};
    const slugs = (content.projects || []).map((p) => p.slug).join(", ");

    let witnessHtml = (wit.items || [])
      .map(
        (w, i) =>
          itemCard(
            w.title || "Bölüm " + (i + 1),
            i,
            field("Başlık", `home.witness.items.${i}.title`, w.title) +
              field("Metin", `home.witness.items.${i}.text`, w.text, "textarea"),
            "wit-" + i
          )
      )
      .join("");

    let expHtml = (exp.items || [])
      .map(
        (e, i) =>
          itemCard(
            e.num + " " + (e.title || ""),
            i,
            field("Numara", `home.experience.items.${i}.num`, e.num) +
              field("Başlık", `home.experience.items.${i}.title`, e.title) +
              field("Açıklama", `home.experience.items.${i}.text`, e.text, "textarea"),
            "exp-" + i
          )
      )
      .join("");

    const featParas = feat._paragraphs ?? (feat.paragraphs || []).join("\n\n");

    return `
      <div class="panel"><h3>Hero</h3>
        ${field("Başlık", "home.hero.title", hero.title)}
        ${imageField("Arka plan görseli", "home.hero.image", hero.image)}
        ${field("Görsel alt metni", "home.hero.imageAlt", hero.imageAlt)}
      </div>
      <div class="panel"><h3>Creative Projects (öne çıkan)</h3>
        ${field("Bölüm başlığı", "home.featured.sectionTitle", feat.sectionTitle)}
        ${imageField("Görsel", "home.featured.image", feat.image)}
        ${field("Görsel alt", "home.featured.imageAlt", feat.imageAlt)}
        ${field("Paragraflar (boş satırla ayırın)", "home.featured._paragraphs", featParas, "textarea")}
        ${field("Link metni", "home.featured.linkText", feat.linkText)}
        ${field("Bağlı proje slug", "home.featured.projectSlug", feat.projectSlug, "text", "Mevcut: " + slugs)}
      </div>
      <div class="panel"><h3>The Witness Book</h3>
        ${field("Bölüm başlığı", "home.witness.sectionTitle", wit.sectionTitle)}
        ${witnessHtml}
        <button type="button" class="btn btn-secondary btn-sm" id="add-witness">+ Bölüm ekle</button>
      </div>
      <div class="panel"><h3>Built On Experience</h3>
        ${field("Bölüm başlığı", "home.experience.sectionTitle", exp.sectionTitle)}
        ${expHtml}
        <button type="button" class="btn btn-secondary btn-sm" id="add-experience">+ Madde ekle</button>
      </div>
      <div class="panel"><h3>İletişim formu</h3>
        ${field("Bölüm başlığı", "home.contact.sectionTitle", c.sectionTitle)}
        ${field("İsim etiketi", "home.contact.labels.name", labels.name)}
        ${field("E-posta etiketi", "home.contact.labels.email", labels.email)}
        ${field("Mesaj etiketi", "home.contact.labels.message", labels.message)}
        ${field("Gönder butonu", "home.contact.submitText", c.submitText)}
        ${field("Form action URL (boş = demo)", "home.contact.formAction", c.formAction, "url")}
        ${field("Başarı mesajı", "home.contact.successMessage", c.successMessage)}
      </div>`;
  }

  function renderWorks() {
    const w = content.works || {};
    return `<div class="panel">${field("Sayfa başlığı", "works.title", w.title)}</div>
      <p class="hint">Proje kartları «Projeler» bölümünden düzenlenir.</p>`;
  }

  function renderThinking() {
    const t = content.thinking || {};
    return `<div class="panel">${field("Sayfa başlığı", "thinking.title", t.title)}</div>
      <p class="hint">Makale kartları «Makaleler» bölümünden düzenlenir.</p>`;
  }

  function renderProjects() {
    return (content.projects || [])
      .map((p, i) => {
        const paras = (p.paragraphs || []).join("\n\n");
        const gallery = (p.gallery || []).join("\n");
        let storyHtml = (p.storySections || [])
          .map(
            (s, si) =>
              itemCard(
                s.heading || "Bölüm",
                si,
                field("Alt başlık", `projects.${i}.storySections.${si}.heading`, s.heading) +
                  field("Paragraflar", `projects.${i}.storySections.${si}._p`, (s.paragraphs || []).join("\n\n"), "textarea"),
                `proj-${i}-story-${si}`
              )
          )
          .join("");

        return itemCard(
          p.cardTitle || p.slug,
          i,
          field("Slug (URL)", `projects.${i}.slug`, p.slug, "text", "project.html?slug=...") +
            field("Kart başlığı", `projects.${i}.cardTitle`, p.cardTitle) +
            field("Kart alt metin", `projects.${i}.meta`, p.meta) +
            imageField("Kart görseli", `projects.${i}.cardImage`, p.cardImage) +
            imageField("Hero görseli", `projects.${i}.heroImage`, p.heroImage) +
            field("Video play ikonu", `projects.${i}.showPlayButton`, p.showPlayButton, "checkbox") +
            field("Detay başlığı", `projects.${i}.title`, p.title) +
            field("Paragraflar", `projects.${i}._paragraphs`, paras, "textarea") +
            imageField("Yan görsel", `projects.${i}.sideImage`, p.sideImage) +
            field("Yan görsel alt", `projects.${i}.sideImageAlt`, p.sideImageAlt) +
            field("Story bölüm başlığı", `projects.${i}.storyTitle`, p.storyTitle) +
            storyHtml +
            `<button type="button" class="btn btn-secondary btn-sm" data-add-story="${i}">+ Story bölümü</button>` +
            field("Galeri (her satıra bir URL)", `projects.${i}._gallery`, gallery, "textarea") +
            `<button type="button" class="btn btn-danger btn-sm" data-del-project="${i}" style="margin-top:1rem">Projeyi sil</button>`,
          "proj-" + i
        );
      })
      .join("") + `<button type="button" class="btn btn-secondary" id="add-project">+ Yeni proje</button>`;
  }

  function renderArticles() {
    return (content.articles || [])
      .map((a, i) => {
        let blocksHtml = (a.blocks || [])
          .map((b, bi) => {
            let fields = field("Tür", `articles.${i}.blocks.${bi}.type`, b.type) +
              `<option value="">—</option>`;
            const types = ["paragraph", "heading", "list", "image", "end"];
            const typeSelect = `<div class="field"><label>Blok türü</label><select data-block-type data-article="${i}" data-block="${bi}">
              ${types.map((t) => `<option value="${t}"${b.type === t ? " selected" : ""}>${t}</option>`).join("")}
            </select></div>`;

            let inner = "";
            if (b.type === "paragraph" || b.type === "end") inner = field("Metin", `articles.${i}.blocks.${bi}.text`, b.text, "textarea");
            if (b.type === "heading") inner = field("Başlık", `articles.${i}.blocks.${bi}.text`, b.text);
            if (b.type === "list") inner = field("Maddeler (her satır bir madde)", `articles.${i}.blocks.${bi}._items`, (b.items || []).join("\n"), "textarea");
            if (b.type === "image") inner = imageField("Görsel", `articles.${i}.blocks.${bi}.src`, b.src) + field("Alt", `articles.${i}.blocks.${bi}.alt`, b.alt);

            return itemCard(
              (b.type || "blok") + " #" + (bi + 1),
              bi,
              typeSelect + inner +
                `<button type="button" class="btn btn-danger btn-sm" data-del-block="${i}:${bi}">Bloğu sil</button>`,
              `art-${i}-b-${bi}`
            );
          })
          .join("");

        return itemCard(
          a.cardTitle || a.slug,
          i,
          field("Slug", `articles.${i}.slug`, a.slug) +
            field("Kart başlığı", `articles.${i}.cardTitle`, a.cardTitle) +
            field("Kart meta", `articles.${i}.meta`, a.meta) +
            imageField("Kart görseli", `articles.${i}.cardImage`, a.cardImage) +
            field("Makale başlığı", `articles.${i}.title`, a.title) +
            blocksHtml +
            `<button type="button" class="btn btn-secondary btn-sm" data-add-block="${i}">+ Blok ekle</button>` +
            `<button type="button" class="btn btn-danger btn-sm" data-del-article="${i}" style="margin-top:1rem">Makaleyi sil</button>`,
          "art-" + i
        );
      })
      .join("") + `<button type="button" class="btn btn-secondary" id="add-article">+ Yeni makale</button>`;
  }

  function renderAbout() {
    const ab = content.about || {};
    const bio = (ab.bio || []).join("\n\n");
    let portraits = (ab.portraits || [])
      .map(
        (ph, i) =>
          itemCard("Portre " + (i + 1), i, imageField("Görsel", `about.portraits.${i}.src`, ph.src) + field("Alt", `about.portraits.${i}.alt`, ph.alt), "port-" + i)
      )
      .join("");

    let skills = (ab.skills || [])
      .map((col, i) => {
        const items = (col.items || []).join("\n");
        return itemCard(col.title || "Sütun", i, field("Sütun başlığı", `about.skills.${i}.title`, col.title) + field("Maddeler", `about.skills.${i}._items`, items, "textarea"), "skill-" + i);
      })
      .join("");

    return `
      <div class="panel">
        ${field("Sayfa başlığı", "about.title", ab.title)}
        ${field("Biyografi (paragrafları boş satırla ayırın)", "about._bio", bio, "textarea")}
      </div>
      <div class="panel"><h3>Portreler</h3>${portraits}
        <button type="button" class="btn btn-secondary btn-sm" id="add-portrait">+ Portre</button>
      </div>
      <div class="panel"><h3>Skills</h3>
        ${field("Bölüm başlığı", "about.skillsTitle", ab.skillsTitle)}
        ${skills}
        <button type="button" class="btn btn-secondary btn-sm" id="add-skill-col">+ Sütun</button>
      </div>`;
  }

  function syncSpecialFields() {
    const feat = content.home?.featured;
    if (feat && feat._paragraphs != null) {
      feat.paragraphs = feat._paragraphs.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
      delete feat._paragraphs;
    }
    (content.projects || []).forEach((p) => {
      if (p._paragraphs != null) {
        p.paragraphs = p._paragraphs.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
        delete p._paragraphs;
      }
      if (p._gallery != null) {
        p.gallery = p._gallery.split("\n").map((s) => s.trim()).filter(Boolean);
        delete p._gallery;
      }
      (p.storySections || []).forEach((s) => {
        if (s._p != null) {
          s.paragraphs = s._p.split(/\n\n+/).map((x) => x.trim()).filter(Boolean);
          delete s._p;
        }
      });
    });
    if (content.about?._bio != null) {
      content.about.bio = content.about._bio.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
      delete content.about._bio;
    }
    (content.about?.skills || []).forEach((col) => {
      if (col._items != null) {
        col.items = col._items.split("\n").map((s) => s.trim()).filter(Boolean);
        delete col._items;
      }
    });
    (content.articles || []).forEach((a) => {
      (a.blocks || []).forEach((b) => {
        if (b._items != null) {
          b.items = b._items.split("\n").map((s) => s.trim()).filter(Boolean);
          delete b._items;
        }
      });
    });
  }

  function collectFromDom() {
    $$("[data-path]", $("#admin-content")).forEach((el) => {
      let val = el.type === "checkbox" ? el.checked : el.value;
      deepSet(content, el.dataset.path, val);
    });
    syncSpecialFields();
  }

  function render() {
    const root = $("#admin-content");
    $("#section-title").textContent = titles[section] || section;

    let html = "";
    if (section === "site") html = renderSite();
    else if (section === "home") html = renderHome();
    else if (section === "works") html = renderWorks();
    else if (section === "thinking") html = renderThinking();
    else if (section === "projects") html = renderProjects();
    else if (section === "articles") html = renderArticles();
    else if (section === "about") html = renderAbout();

    root.innerHTML = html;
    bindFields(root);
    bindCards(root);
    bindActions(root);
  }

  function bindActions(root) {
    $("#add-nav", root)?.addEventListener("click", () => {
      content.site.nav = content.site.nav || [];
      content.site.nav.push({ label: "Yeni", href: "#", page: "home" });
      render();
    });

    $("#add-witness", root)?.addEventListener("click", () => {
      content.home.witness.items = content.home.witness.items || [];
      content.home.witness.items.push({ title: "Yeni bölüm", text: "" });
      render();
    });

    $("#add-experience", root)?.addEventListener("click", () => {
      content.home.experience.items = content.home.experience.items || [];
      const n = String(content.home.experience.items.length + 1).padStart(2, "0");
      content.home.experience.items.push({ num: n, title: "Yeni", text: "" });
      render();
    });

    $("#add-project", root)?.addEventListener("click", () => {
      content.projects = content.projects || [];
      content.projects.push({
        slug: "yeni-proje-" + Date.now(),
        cardTitle: "Yeni Proje",
        meta: "",
        cardImage: "",
        heroImage: "",
        showPlayButton: false,
        title: "Yeni Proje",
        paragraphs: [],
        sideImage: "",
        sideImageAlt: "",
        storyTitle: "Story of Name",
        storySections: [],
        gallery: [],
      });
      render();
    });

    $$("[data-del-project]", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("Projeyi silmek istediğinize emin misiniz?")) return;
        collectFromDom();
        content.projects.splice(parseInt(btn.dataset.delProject, 10), 1);
        render();
      });
    });

    $$("[data-add-story]", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        collectFromDom();
        const i = parseInt(btn.dataset.addStory, 10);
        content.projects[i].storySections = content.projects[i].storySections || [];
        content.projects[i].storySections.push({ heading: "Yeni", paragraphs: [""] });
        render();
      });
    });

    $("#add-article", root)?.addEventListener("click", () => {
      content.articles = content.articles || [];
      content.articles.push({
        slug: "yeni-yazi-" + Date.now(),
        cardTitle: "Yeni Yazı",
        meta: "",
        cardImage: "",
        title: "Yeni Yazı",
        blocks: [{ type: "paragraph", text: "" }, { type: "end", text: "End of the story…" }],
      });
      render();
    });

    $$("[data-del-article]", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("Makaleyi silmek istediğinize emin misiniz?")) return;
        collectFromDom();
        content.articles.splice(parseInt(btn.dataset.delArticle, 10), 1);
        render();
      });
    });

    $$("[data-add-block]", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        collectFromDom();
        const i = parseInt(btn.dataset.addBlock, 10);
        content.articles[i].blocks = content.articles[i].blocks || [];
        content.articles[i].blocks.push({ type: "paragraph", text: "" });
        render();
      });
    });

    $$("[data-del-block]", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        collectFromDom();
        const [ai, bi] = btn.dataset.delBlock.split(":").map(Number);
        content.articles[ai].blocks.splice(bi, 1);
        render();
      });
    });

    $$("[data-block-type]", root).forEach((sel) => {
      sel.addEventListener("change", () => {
        collectFromDom();
        const i = parseInt(sel.dataset.article, 10);
        const bi = parseInt(sel.dataset.block, 10);
        const type = sel.value;
        const block = { type };
        if (type === "list") block.items = [""];
        else if (type === "image") block.src = "";
        else block.text = "";
        content.articles[i].blocks[bi] = block;
        render();
      });
    });

    $("#add-portrait", root)?.addEventListener("click", () => {
      content.about.portraits = content.about.portraits || [];
      content.about.portraits.push({ src: "", alt: "" });
      render();
    });

    $("#add-skill-col", root)?.addEventListener("click", () => {
      content.about.skills = content.about.skills || [];
      content.about.skills.push({ title: "Yeni", items: [] });
      render();
    });
  }

  async function loadContent() {
    try {
      const json = await api("/content.php");
      if (json.ok && json.data) content = json.data;
      else throw new Error("no php");
    } catch {
      const res = await fetch("../data/content.json");
      if (!res.ok) throw new Error("Yüklenemedi");
      content = await res.json();
    }
    if (content.home?.featured?.paragraphs) {
      content.home.featured._paragraphs = content.home.featured.paragraphs.join("\n\n");
    }
    (content.projects || []).forEach((p) => {
      if (p.paragraphs) p._paragraphs = p.paragraphs.join("\n\n");
      if (p.gallery) p._gallery = p.gallery.join("\n");
      (p.storySections || []).forEach((s) => {
        if (s.paragraphs) s._p = s.paragraphs.join("\n\n");
      });
    });
    if (content.about?.bio) content.about._bio = content.about.bio.join("\n\n");
    (content.about?.skills || []).forEach((c) => {
      if (c.items) c._items = c.items.join("\n");
    });
    (content.articles || []).forEach((a) => {
      (a.blocks || []).forEach((b) => {
        if (b.items) b._items = b.items.join("\n");
      });
    });
  }

  async function save() {
    if (IS_NETLIFY) {
      toast(
        "Netlify'da sunucuya kayıt yok. Yerelde WAMP admin ile kaydedin, git push ile yayınlayın.",
        true
      );
      return;
    }
    collectFromDom();
    const json = await api("/content.php", { method: "POST", body: JSON.stringify({ data: content }) });
    if (!json.ok) {
      toast(json.error || "Kayıt hatası", true);
      return;
    }
    toast("Tüm değişiklikler kaydedildi");
    await loadContent();
    render();
  }

  function showApp(show) {
    $("#login-screen").style.display = show ? "none" : "flex";
    $("#admin-app").classList.toggle("is-active", show);
  }

  async function checkAuth() {
    const json = await api("/auth.php?action=check");
    if (json.loggedIn) {
      showApp(true);
      await loadContent();
      render();
    }
  }

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = $("#username").value.trim();
    const password = $("#password").value;
    const json = await api("/auth.php?action=login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (!json.ok) {
      $("#login-error").style.display = "block";
      $("#login-error").textContent = json.error || "Giriş başarısız";
      return;
    }
    showApp(true);
    await loadContent();
    render();
  });

  $("#logout-btn").addEventListener("click", async () => {
    await api("/auth.php?action=logout", { method: "POST" });
    showApp(false);
  });

  $("#save-btn").addEventListener("click", save);

  $$("#admin-nav button").forEach((btn) => {
    btn.addEventListener("click", () => {
      collectFromDom();
      $$("#admin-nav button").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      section = btn.dataset.section;
      render();
    });
  });

  checkAuth();
})();
