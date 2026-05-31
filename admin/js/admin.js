(function () {
  const FN = "/.netlify/functions";
  let content = {};
  let section = "site";
  let openCards = new Set();

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  function fn(name) {
    return `${FN}/${name}`;
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

  async function parseResponse(res) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { ok: false, error: text || res.statusText || "Sunucu hatası" };
    }
  }

  async function apiGet(name) {
    const res = await fetch(fn(name), { credentials: "same-origin" });
    return parseResponse(res);
  }

  async function apiPost(name, body) {
    const res = await fetch(fn(name), {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return parseResponse(res);
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
    if (
      /^https?:\/\//i.test(url) ||
      url.startsWith("/.netlify/") ||
      url.startsWith("data:") ||
      url.includes("raw.githubusercontent.com")
    ) {
      return url;
    }
    return "../" + url.replace(/^\//, "");
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Dosya okunamadı"));
      reader.readAsDataURL(file);
    });
  }

  function imageField(label, path, value) {
    const id = "img-" + path.replace(/[^a-z0-9]/gi, "-");
    const preview = value ? `<div class="preview"><img src="${escAttr(imgSrc(value))}" alt="" onerror="this.style.display='none'"></div>` : "";
    return `<div class="field image-field">
      <label>${label}</label>
      <input type="url" id="${id}" data-path="${path}" value="${escAttr(value || "")}" placeholder="URL veya Yükle ile görsel ekleyin">
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

  function slugifyTag(text) {
    return String(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function tagsToText(tags) {
    return (tags || [])
      .map((t) => {
        if (typeof t === "string") return t;
        if (!t || !t.label) return "";
        if (t.slug && t.slug !== slugifyTag(t.label)) return `${t.label}|${t.slug}`;
        return t.label;
      })
      .filter(Boolean)
      .join("\n");
  }

  function parseTagsText(str) {
    return String(str || "")
      .split("\n")
      .map((line) => {
        line = line.trim();
        if (!line) return null;
        if (line.includes("|")) {
          const parts = line.split("|");
          const label = parts[0].trim();
          const slug = (parts[1] || "").trim() || slugifyTag(label);
          return { label, slug: slugifyTag(slug) };
        }
        return { label: line, slug: slugifyTag(line) };
      })
      .filter(Boolean);
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
        try {
          const dataUrl = await readFileAsDataUrl(file);
          const json = await apiPost("upload", { dataUrl, filename: file.name });
          if (!json.ok) throw new Error(json.error || "Yükleme başarısız");
          const storedUrl = json.url || json.path;
          deepSet(content, path, storedUrl);
          const urlInput = root.querySelector(`[data-path="${path}"]`);
          if (urlInput) {
            urlInput.value = storedUrl;
            urlInput.dispatchEvent(new Event("input"));
          }
          if (json.previewUrl) {
            const wrap = input.closest(".image-field");
            let prev = wrap?.querySelector(".preview");
            if (!prev && wrap) {
              prev = document.createElement("div");
              prev.className = "preview";
              wrap.insertBefore(prev, wrap.querySelector(".image-actions"));
            }
            if (prev) prev.innerHTML = `<img src="${escAttr(json.previewUrl)}" alt="">`;
          }
          toast(json.message || "Görsel yüklendi");
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

    const contact = s.contactButton || {};

    return `
      <div class="panel"><h3>Genel</h3>
        ${field("Logo metni (alt)", "site.logo", s.logo)}
        ${imageField("Logo görseli", "site.logoImage", s.logoImage)}
        ${field("Footer metni (yedek)", "site.footer", s.footer)}
        ${field("Footer tasarım", "site.footerDesignCredit", s.footerDesignCredit)}
        ${field("Footer telif", "site.footerCopyright", s.footerCopyright)}
        ${field("Meta açıklama", "site.metaDescription", s.metaDescription, "textarea")}
      </div>
      <div class="panel"><h3>Menü (VISION, PROJECT…)</h3>${navHtml}
        <button type="button" class="btn btn-secondary btn-sm" id="add-nav">+ Menü öğesi</button>
        <p class="hint">Sayfa kodları: home, works, thinking, about</p>
      </div>
      <div class="panel"><h3>Contact butonu</h3>
        ${field("Buton metni", "site.contactButton.label", contact.label)}
        ${field("Buton linki", "site.contactButton.href", contact.href)}
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
        ${field("Başlık satır 1 (beyaz)", "home.hero.titleLine1", hero.titleLine1)}
        ${field("Başlık satır 2 (kırmızı)", "home.hero.titleLine2", hero.titleLine2)}
        ${field("Alt metin (kırmızı çizgili)", "home.hero.lead", hero.lead, "textarea")}
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

        const seo = a.seo || {};
        const tagsText = a._tags ?? tagsToText(a.tags);

        return itemCard(
          a.cardTitle || a.slug,
          i,
          field("Slug (URL)", `articles.${i}.slug`, a.slug, "text", "SEO: article.html?slug=...") +
            field("Kart başlığı", `articles.${i}.cardTitle`, a.cardTitle) +
            field("Kart meta (tarih / tür)", `articles.${i}.meta`, a.meta) +
            imageField("Kart görseli", `articles.${i}.cardImage`, a.cardImage) +
            field("Makale başlığı", `articles.${i}.title`, a.title) +
            field(
              "Etiketler (SEO)",
              `articles.${i}._tags`,
              tagsText,
              "textarea",
              "Her satır bir etiket. Özel URL için: Görsel Araştırma|visual-research"
            ) +
            field("SEO başlık (opsiyonel)", `articles.${i}.seo.title`, seo.title) +
            field("SEO açıklama", `articles.${i}.seo.description`, seo.description, "textarea") +
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
    const hero = ab.hero || {};
    const story = ab.story || {};
    const skills = ab.skills || {};
    const heroParas = (hero._paragraphs ?? (hero.paragraphs || []).join("\n\n"));

    const storyBlocks = (story.blocks || [])
      .map((b, i) =>
        itemCard(
          `${b.num} ${b.label}`,
          i,
          field("Numara", `about.story.blocks.${i}.num`, b.num) +
            field("Etiket (ORIGINS…)", `about.story.blocks.${i}.label`, b.label) +
            field("Alıntı", `about.story.blocks.${i}.quote`, b.quote, "textarea") +
            field("Metin", `about.story.blocks.${i}.text`, b.text, "textarea"),
          "story-" + i
        )
      )
      .join("");

    const skillCards = (skills.cards || [])
      .map((c, i) => {
        const items = (c._items ?? (c.items || []).join("\n"));
        return itemCard(
          c.title || "Kart",
          i,
          field("Numara", `about.skills.cards.${i}.num`, c.num) +
            field("Başlık", `about.skills.cards.${i}.title`, c.title) +
            field("Maddeler (her satır bir madde)", `about.skills.cards.${i}._items`, items, "textarea"),
          "skill-" + i
        );
      })
      .join("");

    return `
      <div class="panel"><h3>Hero (MUMINE SERAP / KIZILIRMAK)</h3>
        ${field("İsim satırı 1", "about.hero.nameLine1", hero.nameLine1)}
        ${field("İsim satırı 2 (kırmızı)", "about.hero.nameLine2", hero.nameLine2)}
        ${field("Paragraflar", "about.hero._paragraphs", heroParas, "textarea")}
        ${imageField("Sağ portre", "about.hero.image.src", hero.image?.src)}
        ${field("Portre alt metni", "about.hero.image.alt", hero.image?.alt)}
      </div>
      <div class="panel"><h3>Hikâye bölümü (sol görsel + 01/02/03)</h3>
        ${imageField("Sol portre", "about.story.image.src", story.image?.src)}
        ${field("Sol portre alt", "about.story.image.alt", story.image?.alt)}
        ${storyBlocks}
        <button type="button" class="btn btn-secondary btn-sm" id="add-story-block">+ Blok ekle</button>
      </div>
      <div class="panel"><h3>Skill Set</h3>
        <div class="field-row">
          ${field("Başlık beyaz", "about.skills.titlePart1", skills.titlePart1)}
          ${field("Başlık kırmızı", "about.skills.titlePart2", skills.titlePart2)}
        </div>
        ${skillCards}
        <button type="button" class="btn btn-secondary btn-sm" id="add-skill-card">+ Kart ekle</button>
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
    if (content.about?.hero?._paragraphs != null) {
      content.about.hero.paragraphs = content.about.hero._paragraphs
        .split(/\n\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
      delete content.about.hero._paragraphs;
    }
    (content.about?.skills?.cards || []).forEach((col) => {
      if (col._items != null) {
        col.items = col._items.split("\n").map((s) => s.trim()).filter(Boolean);
        delete col._items;
      }
    });
    (content.articles || []).forEach((a) => {
      if (a._tags != null) {
        a.tags = parseTagsText(a._tags);
        delete a._tags;
      }
      if (!a.seo) a.seo = {};
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
        tags: [],
        seo: { title: "", description: "" },
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

    $("#add-story-block", root)?.addEventListener("click", () => {
      collectFromDom();
      content.about.story = content.about.story || { blocks: [] };
      content.about.story.blocks = content.about.story.blocks || [];
      content.about.story.blocks.push({
        num: "04",
        label: "NEW",
        quote: "",
        text: "",
      });
      render();
    });

    $("#add-skill-card", root)?.addEventListener("click", () => {
      collectFromDom();
      content.about.skills = content.about.skills || { cards: [] };
      content.about.skills.cards = content.about.skills.cards || [];
      content.about.skills.cards.push({ num: "04", title: "NEW SKILL", items: [] });
      render();
    });
  }

  async function loadContent() {
    try {
      const json = await apiGet("content");
      if (json.ok && json.data) content = json.data;
      else throw new Error("no api");
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
    if (content.about?.hero?.paragraphs) {
      content.about.hero._paragraphs = content.about.hero.paragraphs.join("\n\n");
    }
    (content.about?.skills?.cards || []).forEach((c) => {
      if (c.items) c._items = c.items.join("\n");
    });
    (content.articles || []).forEach((a) => {
      if (a.tags) a._tags = tagsToText(a.tags);
      (a.blocks || []).forEach((b) => {
        if (b.items) b._items = b.items.join("\n");
      });
    });
  }

  async function save() {
    collectFromDom();
    const json = await apiPost("content", { data: content });
    if (!json.ok) {
      toast(json.error || "Kayıt hatası", true);
      return;
    }
    toast(json.message || "Tüm değişiklikler kaydedildi");
    await loadContent();
    render();
  }

  function showApp(show) {
    $("#login-screen").style.display = show ? "none" : "flex";
    $("#admin-app").classList.toggle("is-active", show);
  }

  async function checkAuth() {
    const json = await apiGet("auth-check");
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
    const json = await apiPost("login", { username, password });
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
    await apiPost("logout", {});
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
