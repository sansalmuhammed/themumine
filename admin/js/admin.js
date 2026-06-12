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
    blog: "Blog",
    thinking: "Witness Desk",
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
      const key = keys[i];
      const nextKey = keys[i + 1];
      if (cur[key] == null) {
        cur[key] = /^\d+$/.test(nextKey) ? [] : {};
      }
      cur = cur[key];
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

  function selectField(label, path, value, options, hint = "") {
    const id = "f-" + path.replace(/[^a-z0-9]/gi, "-");
    const opts = options
      .map(([optValue, optLabel]) => `<option value="${escAttr(optValue)}"${value === optValue ? " selected" : ""}>${esc(optLabel)}</option>`)
      .join("");
    return `<div class="field"><label for="${id}">${label}</label><select id="${id}" data-path="${path}">${opts}</select>${hint ? `<p class="hint">${hint}</p>` : ""}</div>`;
  }

  function resolveLogoType(site) {
    const type = site?.logoType;
    if (type === "composite" || type === "single" || type === "text") return type;
    if (site?.logoIcon) return "composite";
    if (site?.logoImage || site?.logoWordmark) return "single";
    return "text";
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

  function linesToText(arr) {
    return (arr || []).join("\n");
  }

  function parseLinesText(str) {
    return String(str || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function bindFields(root) {
    root.querySelectorAll("[data-path]").forEach((el) => {
      const ev = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
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
          const wrap = input.closest(".image-field");
          const urlInput = wrap?.querySelector("[data-path]");
          if (urlInput) {
            urlInput.value = storedUrl;
            urlInput.dispatchEvent(new Event("input"));
          }
          if (json.previewUrl) {
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

  function itemCard(title, index, bodyHtml, cardId, forceOpen) {
    const open = forceOpen || openCards.has(cardId) ? " is-open" : "";
    return `<div class="item-card${open}" data-card="${cardId}">
      <div class="item-card-header" data-toggle="${cardId}"><strong>${esc(title)}</strong><span>▼</span></div>
      <div class="item-card-body">${bodyHtml}</div>
    </div>`;
  }

  function insideSectionEditor(title, bodyHtml, blockId) {
    return `<div class="inside-section-editor" data-inside-block="${blockId}">
      <div class="inside-section-editor__head"><strong>${esc(title)}</strong></div>
      <div class="inside-section-editor__body">${bodyHtml}</div>
    </div>`;
  }

  function adminGroup(title, bodyHtml) {
    return `<div class="admin-group"><h3 class="admin-group__title">${esc(title)}</h3>${bodyHtml}</div>`;
  }

  function paragraphsField(label, path, paragraphs, hint) {
    return field(
      label,
      path,
      (paragraphs || []).join("\n\n"),
      "textarea",
      hint || "Paragraflar arasında boş satır bırakın"
    );
  }

  function syncParagraphsField(obj, key, tempKey) {
    if (obj[tempKey] != null) {
      obj[key] = String(obj[tempKey])
        .split(/\n\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
      delete obj[tempKey];
    }
  }

  function renderProjectInsideFields(p, i) {
    const mission = p.mission || {};
    const cta = p.materialsCta || {};
    const missionParas = mission._paragraphs ?? (mission.paragraphs || []).join("\n\n");

    let storyArticlesHtml = (p.storyArticles || [])
      .map(
        (art, ai) =>
          itemCard(
            art.heading || "Story makalesi " + (ai + 1),
            ai,
            field("Başlık", `projects.${i}.storyArticles.${ai}.heading`, art.heading) +
              paragraphsField("Paragraflar", `projects.${i}.storyArticles.${ai}._p`, art.paragraphs) +
              `<button type="button" class="btn btn-danger btn-sm" data-del-story-article="${i}:${ai}">Makaleyi sil</button>`,
            `proj-${i}-inside-art-${ai}`
          )
      )
      .join("");

    return (
      adminGroup(
        "Detay sayfası (PROJECT INSIDE)",
        field("Görünen başlık", `projects.${i}.displayTitle`, p.displayTitle, "text", "Örn: PROJECT: BUBBLE BUDDIES") +
          field("Tarih", `projects.${i}.projectDate`, p.projectDate, "text", "Örn: 01/JAN/2026") +
          imageField("Hero görseli / video kapağı", `projects.${i}.heroImage`, p.heroImage) +
          field(
            "YouTube video linki",
            `projects.${i}.videoUrl`,
            p.videoUrl,
            "url",
            "Örn: https://www.youtube.com/watch?v=XXXXXXXXXXX veya https://youtu.be/XXXXXXXXXXX"
          ) +
          field("Hero'da play ikonu göster", `projects.${i}.showPlayButton`, p.showPlayButton !== false, "checkbox") +
          imageField("Kapanış görseli", `projects.${i}.closingImage`, p.closingImage) +
          adminGroup(
            "THE MISSION",
            field("Etiket", `projects.${i}.mission.label`, mission.label, "text", "Örn: THE MISSION") +
              field("Alıntı", `projects.${i}.mission.quote`, mission.quote, "textarea") +
              imageField("Mission görseli", `projects.${i}.mission.image`, mission.image) +
              field("Mission paragrafları", `projects.${i}.mission._paragraphs`, missionParas, "textarea")
          ) +
          field("Story Engine giriş", `projects.${i}.storyEngineIntro`, p.storyEngineIntro, "textarea") +
          storyArticlesHtml +
          `<button type="button" class="btn btn-secondary btn-sm" data-add-story-article="${i}">+ Story makalesi</button>` +
          adminGroup(
            "Materyaller butonu",
            field("Buton metni", `projects.${i}.materialsCta.text`, cta.text) +
              field("Buton linki", `projects.${i}.materialsCta.href`, cta.href, "text", "Örn: #materials")
          )
      ) +
      adminGroup(
        "Eski layout (opsiyonel)",
        field("Detay başlık satır 1", `projects.${i}.titleLine1`, p.titleLine1) +
          field("Detay başlık satır 2", `projects.${i}.titleLine2`, p.titleLine2) +
          field("Detay başlığı (yedek)", `projects.${i}.title`, p.title) +
          paragraphsField("Paragraflar", `projects.${i}._paragraphs`, p.paragraphs) +
          imageField("Yan görsel", `projects.${i}.sideImage`, p.sideImage) +
          field("Yan görsel alt", `projects.${i}.sideImageAlt`, p.sideImageAlt) +
          field("Story bölüm başlığı", `projects.${i}.storyTitle`, p.storyTitle) +
          (p.storySections || [])
            .map(
              (s, si) =>
                itemCard(
                  s.heading || "Bölüm",
                  si,
                  field("Alt başlık", `projects.${i}.storySections.${si}.heading`, s.heading) +
                    paragraphsField("Paragraflar", `projects.${i}.storySections.${si}._p`, s.paragraphs),
                  `proj-${i}-story-${si}`
                )
            )
            .join("") +
          `<button type="button" class="btn btn-secondary btn-sm" data-add-story="${i}">+ Story bölümü (eski)</button>` +
          field("Galeri (her satıra bir URL)", `projects.${i}._gallery`, (p.gallery || []).join("\n"), "textarea")
      )
    );
  }

  function renderArticleInsideSectionFields(a, i, s, si) {
    const base = `articles.${i}.insideSections.${si}`;
    const sectionType = s.type || "prose";
    const types = [
      ["prose", "Giriş metni (paragraf + italik vurgu)"],
      ["marker", "Numara kutusu (01, 02…)"],
      ["quote-section", "Bölüm başlığı (48px) + metin"],
      ["image", "Tam genişlik görsel (1066×603)"],
    ];
    const typeSelect = `<div class="field"><label>Bölüm türü</label><select data-inside-type data-article="${i}" data-section="${si}">
      ${types.map(([t, label]) => `<option value="${t}"${sectionType === t ? " selected" : ""}>${label}</option>`).join("")}
    </select></div>`;

    let inner = "";
    if (sectionType === "prose") {
      inner =
        paragraphsField(
          "Paragraflar",
          `${base}._paragraphs`,
          s.paragraphs,
          "Sayfadaki beyaz gövde metni. Paragraflar arasında boş satır bırakın."
        ) +
        field(
          "İtalik vurgu (ortalanmış, opsiyonel)",
          `${base}.emphasis`,
          s.emphasis,
          "textarea",
          "Örn: Same theory. Same bones…"
        );
    } else if (sectionType === "marker") {
      inner = field("Kutu içindeki numara", `${base}.value`, s.value, "text", "Örn: 01 veya 02");
    } else if (sectionType === "quote-section") {
      inner =
        field(
          "Bölüm başlığı (büyük uppercase)",
          `${base}.quote`,
          s.quote,
          "text",
          "Örn: TRAGIC CHARACTER STRUCTURE"
        ) +
        paragraphsField(
          "Paragraflar",
          `${base}._paragraphs`,
          s.paragraphs,
          "Bölüm altındaki beyaz metin. Paragraflar arasında boş satır bırakın."
        ) +
        field(
          "İtalik vurgu (ortalanmış, opsiyonel)",
          `${base}.emphasis`,
          s.emphasis,
          "textarea"
        );
    } else if (sectionType === "image") {
      inner =
        imageField("Görsel URL", `${base}.src`, s.src) +
        field("Alt metin (erişilebilirlik)", `${base}.alt`, s.alt, "text", "Görsel açıklaması");
    } else {
      inner = paragraphsField("Paragraflar", `${base}._paragraphs`, s.paragraphs);
    }

    const label =
      sectionType === "marker"
        ? "Bölüm " + (si + 1) + " — Numara: " + (s.value || "—")
        : sectionType === "image"
          ? "Bölüm " + (si + 1) + " — Görsel"
          : "Bölüm " + (si + 1) + " — " + (s.quote || (s.paragraphs && s.paragraphs[0]?.slice(0, 48)) || "Metin");

    return insideSectionEditor(
      label,
      typeSelect +
        inner +
        `<div class="inside-section-editor__actions">
          <button type="button" class="btn btn-danger btn-sm" data-del-inside-section="${i}:${si}">Bu bölümü sil</button>
        </div>`,
      `art-${i}-inside-${si}`
    );
  }

  function renderArticleInsideFields(a, i) {
    const closing = a.closingSection || {};
    const closingParas = closing._paragraphs ?? (closing.paragraphs || []).join("\n\n");
    const sections = a.insideSections || [];
    const insideHtml = sections.length
      ? sections.map((s, si) => renderArticleInsideSectionFields(a, i, s, si)).join("")
      : `<p class="hint">Henüz içerik bölümü yok. Aşağıdaki butonla metin, görsel veya numara kutusu ekleyin.</p>`;

    return (
      adminGroup(
        "Detay sayfası (BLOG INSIDE)",
        `<p class="hint" style="margin:0 0 1rem">article.html?slug=${esc(a.slug || "")} sayfasındaki sırayla düzenleyin.</p>` +
          field(
            "Ana başlık (72px, uppercase)",
            `articles.${i}.displayTitle`,
            a.displayTitle,
            "textarea",
            "Örn: ONE FIRE IN DIFFERENT COSMOLOGIES"
          ) +
          field(
            "Alt başlık (32px)",
            `articles.${i}.subtitle`,
            a.subtitle,
            "textarea",
            "Örn: The Cosmologies of Medea & Cleopatra…"
          ) +
          `<div class="inside-sections-list">${insideHtml}</div>` +
          `<div class="inside-sections-toolbar">
            <button type="button" class="btn btn-secondary btn-sm" data-add-inside-section="${i}" data-section-type="prose">+ Metin bölümü</button>
            <button type="button" class="btn btn-secondary btn-sm" data-add-inside-section="${i}" data-section-type="quote-section">+ Başlıklı bölüm</button>
            <button type="button" class="btn btn-secondary btn-sm" data-add-inside-section="${i}" data-section-type="image">+ Görsel</button>
            <button type="button" class="btn btn-secondary btn-sm" data-add-inside-section="${i}" data-section-type="marker">+ Numara kutusu</button>
          </div>` +
          adminGroup(
            "Kapanış (END OF THE DAY…)",
            field("Kapanış başlığı", `articles.${i}.closingSection.title`, closing.title, "text", "Örn: END OF THE DAY…") +
              field(
                "Kapanış paragrafları",
                `articles.${i}.closingSection._paragraphs`,
                closingParas,
                "textarea",
                "Sayfanın sonundaki kapanış metni"
              )
          )
      ) +
      adminGroup(
        "Eski layout (bloklar)",
        (a.blocks || [])
          .map((b, bi) => {
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
              typeSelect +
                inner +
                `<button type="button" class="btn btn-danger btn-sm" data-del-block="${i}:${bi}">Bloğu sil</button>`,
              `art-${i}-b-${bi}`
            );
          })
          .join("") + `<button type="button" class="btn btn-secondary btn-sm" data-add-block="${i}">+ Blok ekle</button>`
      )
    );
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
    const logoType = resolveLogoType(s);

    return `
      <div class="panel"><h3>Logo</h3>
        ${selectField(
          "Header logo tipi",
          "site.logoType",
          logoType,
          [
            ["composite", "İkon + yazı (bileşik logo)"],
            ["single", "Tek görsel"],
            ["text", "Metin logo (görsel yok)"],
          ],
          "Sitede header’da hangi logo düzeninin kullanılacağını seçin."
        )}
        ${field("Logo metni (alt / erişilebilirlik)", "site.logo", s.logo)}
        <div data-logo-fields="composite">
          ${imageField("Logo ikonu (sol)", "site.logoIcon", s.logoIcon)}
          ${imageField("Logo yazısı / wordmark (sağ)", "site.logoWordmark", s.logoWordmark)}
        </div>
        <div data-logo-fields="single">
          ${imageField("Header logo görseli", "site.logoImage", s.logoImage)}
        </div>
        ${imageField("Footer logo görseli", "site.footerLogoImage", s.footerLogoImage)}
        <p class="hint">Bileşik logo için ikon ve wordmark yükleyin. Tek görsel modunda yalnızca header logo görseli kullanılır. Footer için ayrı görsel tanımlayabilirsiniz.</p>
      </div>
      <div class="panel"><h3>Genel</h3>
        ${field("Footer metni (yedek)", "site.footer", s.footer)}
        ${field("Footer tasarım", "site.footerDesignCredit", s.footerDesignCredit)}
        ${field("Footer telif", "site.footerCopyright", s.footerCopyright)}
        ${field("Meta açıklama", "site.metaDescription", s.metaDescription, "textarea")}
      </div>
      <div class="panel"><h3>Menü (VISION, PROJECT…)</h3>${navHtml}
        <button type="button" class="btn btn-secondary btn-sm" id="add-nav">+ Menü öğesi</button>
        <p class="hint">Sayfa kodları: home, works, blog, thinking, about</p>
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
        ${field("Gövde fontu (Inter)", "site.fonts.body", f.body)}
        ${field("Logo serif (Playfair)", "site.fonts.logoSerif", f.logoSerif)}
        ${field("Logo script (Great Vibes)", "site.fonts.logoScript", f.logoScript)}
      </div>
      <div class="panel"><h3>Sayfa başlıkları (tarayıcı sekmesi)</h3>
        ${field("Ana sayfa", "site.pageTitles.home", pt.home)}
        ${field("Works", "site.pageTitles.works", pt.works)}
        ${field("Blog", "site.pageTitles.blog", pt.blog)}
        ${field("Witness Desk", "site.pageTitles.thinking", pt.thinking)}
        ${field("About", "site.pageTitles.about", pt.about)}
      </div>`;
  }

  function renderHome() {
    const h = content.home || {};
    const hero = h.hero || {};
    const creative = h.creativeProjects || {};
    const bento = creative.bento || {};
    const wit = h.witness || {};
    const exp = h.experience || {};
    const c = h.contact || {};
    const projectSlugs = (content.projects || []).map((p) => p.slug).join(", ");
    const articleSlugs = (content.articles || []).map((a) => a.slug).join(", ");
    const bentoTags = bento._tags ?? linesToText(bento.tags);
    const breakdownItems = bento._breakdownItems ?? linesToText(bento.breakdownItems);
    const witnessSlugs = wit._cardSlugs ?? linesToText(wit.cardSlugs);

    let expHtml = (exp.items || [])
      .map(
        (e, i) =>
          itemCard(
            e.num + " " + (e.title || ""),
            i,
            field("Numara", `home.experience.items.${i}.num`, e.num) +
              field("Başlık", `home.experience.items.${i}.title`, e.title) +
              field(
                "Detaylar",
                `home.experience.items.${i}.details`,
                e.details ?? e.text ?? "",
                "textarea",
                "Hizmetleri · ile ayırın"
              ),
            "exp-" + i
          )
      )
      .join("");

    return `
      <div class="panel"><h3>Hero</h3>
        ${field("Başlık satır 1 (beyaz)", "home.hero.titleLine1", hero.titleLine1)}
        ${field("Başlık satır 2 (kırmızı)", "home.hero.titleLine2", hero.titleLine2)}
        ${field("Alt metin (kırmızı çizgili)", "home.hero.lead", hero.lead, "textarea")}
        ${imageField("Arka plan görseli", "home.hero.image", hero.image)}
        ${field("Görsel alt metni", "home.hero.imageAlt", hero.imageAlt)}
      </div>
      <div class="panel"><h3>Creative Projects (bento grid)</h3>
        ${field("Bölüm başlığı satır 1 (beyaz)", "home.creativeProjects.titleLine1", creative.titleLine1)}
        ${field("Bölüm başlığı satır 2 (kırmızı)", "home.creativeProjects.titleLine2", creative.titleLine2)}
        ${field("Bağlı proje slug", "home.creativeProjects.bento.projectSlug", bento.projectSlug, "text", "Mevcut: " + projectSlugs)}
        ${imageField("Hero görseli (sol üst)", "home.creativeProjects.bento.heroImage", bento.heroImage)}
        ${field("Hero görsel alt", "home.creativeProjects.bento.heroImageAlt", bento.heroImageAlt)}
        ${field("Rozet metni", "home.creativeProjects.bento.badge", bento.badge, "text", "Örn: Latest Project")}
        ${field("Proje başlığı (kart üstü)", "home.creativeProjects.bento.projectTitle", bento.projectTitle)}
        ${field("Genre etiketi", "home.creativeProjects.bento.genreLabel", bento.genreLabel, "text", "Örn: GENRE")}
        ${field("Genre değeri", "home.creativeProjects.bento.genre", bento.genre)}
        ${field("Logline etiketi", "home.creativeProjects.bento.loglineLabel", bento.loglineLabel, "text", "Örn: LOGLINE")}
        ${field("Logline metni", "home.creativeProjects.bento.logline", bento.logline, "textarea")}
        ${imageField("Mühür paneli (sol alt)", "home.creativeProjects.bento.sealImage", bento.sealImage)}
        ${field("Breakdown etiketleri", "home.creativeProjects.bento._tags", bentoTags, "textarea", "Her satır bir etiket. Örn: CONCEPT")}
        ${field("Breakdown başlığı", "home.creativeProjects.bento.breakdownTitle", bento.breakdownTitle)}
        ${field("Breakdown maddeleri", "home.creativeProjects.bento._breakdownItems", breakdownItems, "textarea", "Her satır bir madde")}
      </div>
      <div class="panel"><h3>The Witness Desk (ana sayfa)</h3>
        ${field("Başlık satır 1 (beyaz)", "home.witness.titleLine1", wit.titleLine1)}
        ${field("Başlık satır 2 (kırmızı)", "home.witness.titleLine2", wit.titleLine2)}
        ${field("Giriş metni", "home.witness.intro", wit.intro, "textarea")}
        ${field("Kart link metni", "home.witness.cardLinkText", wit.cardLinkText, "text", "Örn: DEEP DIVE →")}
        ${field(
          "Kart sırası (slug listesi)",
          "home.witness._cardSlugs",
          witnessSlugs,
          "textarea",
          "Her satır bir makale slug. Mevcut: " + articleSlugs
        )}
      </div>
      <div class="panel"><h3>Built On Experience</h3>
        ${field("Başlık satır 1 (beyaz)", "home.experience.titleLine1", exp.titleLine1)}
        ${field("Başlık satır 2 (kırmızı)", "home.experience.titleLine2", exp.titleLine2)}
        ${imageField("Sağ görsel (çiçek dalı)", "home.experience.image", exp.image)}
        ${field("Görsel alt metni", "home.experience.imageAlt", exp.imageAlt)}
        ${expHtml}
        <button type="button" class="btn btn-secondary btn-sm" id="add-experience">+ Madde ekle</button>
      </div>
      <div class="panel"><h3>İletişim (Get in Touch)</h3>
        ${field("Başlık satır 1 (beyaz)", "home.contact.titleLine1", c.titleLine1)}
        ${field("Başlık satır 2 (kırmızı)", "home.contact.titleLine2", c.titleLine2)}
        ${field("Bölge etiketi (kırmızı)", "home.contact.regionLabel", c.regionLabel)}
        ${field("Şehir başlığı", "home.contact.locationTitle", c.locationTitle)}
        ${field("Adres satırları", "home.contact._addressLines", c._addressLines ?? (c.addressLines || []).join("\n"), "textarea")}
        ${field("E-posta (gösterim)", "home.contact.email", c.email)}
        ${field("LinkedIn URL", "home.contact.social.0.href", c.social?.[0]?.href)}
        ${field("Instagram URL", "home.contact.social.1.href", c.social?.[1]?.href)}
        ${field("YouTube URL", "home.contact.social.2.href", c.social?.[2]?.href)}
        ${field("Substance URL", "home.contact.social.3.href", c.social?.[3]?.href)}
        ${field("Form başlığı", "home.contact.formHeading", c.formHeading)}
        ${field("Ad placeholder", "home.contact.placeholders.firstName", c.placeholders?.firstName)}
        ${field("Soyad placeholder", "home.contact.placeholders.lastName", c.placeholders?.lastName)}
        ${field("E-posta placeholder", "home.contact.placeholders.email", c.placeholders?.email)}
        ${field("Kurum placeholder", "home.contact.placeholders.organization", c.placeholders?.organization)}
        ${field("Mesaj etiketi", "home.contact.messageLabel", c.messageLabel)}
        ${field("Gönder butonu", "home.contact.submitText", c.submitText)}
        ${field("Bildirim e-postası (Netlify panel)", "home.contact.notifyEmail", c.notifyEmail, "text", "Netlify → Forms → Notifications: bu adrese gönderin")}
        ${field("Başarı mesajı", "home.contact.successMessage", c.successMessage)}
        ${field("Yönlendirme gecikmesi (ms)", "home.contact.redirectDelayMs", c.redirectDelayMs ?? 3000)}
        ${field("Yönlendirme metni", "home.contact.redirectHint", c.redirectHint)}
      </div>`;
  }

  function renderWorks() {
    const w = content.works || {};
    const projectSlugs = (content.projects || []).map((p) => p.slug).join(", ");
    const gridSlugs = w._projectSlugs ?? linesToText(w.projectSlugs);
    return `
      <div class="panel"><h3>Selected Works sayfası</h3>
        ${field("Başlık satır 1 (beyaz)", "works.titleLine1", w.titleLine1)}
        ${field("Başlık satır 2 (kırmızı)", "works.titleLine2", w.titleLine2)}
        ${field("Alt metin (kırmızı çizgili)", "works.lead", w.lead, "textarea")}
        ${field("Kart link metni", "works.cardLinkText", w.cardLinkText, "text", "Örn: Review the project")}
        ${field("Load more metni", "works.loadMoreText", w.loadMoreText)}
        ${field(
          "Grid sırası (proje slug listesi)",
          "works._projectSlugs",
          gridSlugs,
          "textarea",
          "Her satır bir proje. Aynı slug tekrarlanabilir. Mevcut: " + projectSlugs
        )}
        ${field("Load more butonunu göster", "works.showLoadMore", w.showLoadMore !== false, "checkbox")}
      </div>
      <p class="hint">Kart görselleri, etiketler ve özet metinler «Projeler» bölümünden düzenlenir.</p>`;
  }

  function renderBlog() {
    const b = content.blog || {};
    const articleSlugs = (content.articles || []).map((a) => a.slug).join(", ");
    const cardSlugs = b._cardSlugs ?? linesToText(b.cardSlugs);
    return `
      <div class="panel"><h3>Blog sayfası (What I'm Thinking)</h3>
        ${field("Başlık satır 1 (beyaz)", "blog.titleLine1", b.titleLine1)}
        ${field("Başlık satır 2 (kırmızı)", "blog.titleLine2", b.titleLine2)}
        ${field("Alt metin (kırmızı çizgili)", "blog.lead", b.lead, "textarea")}
        ${field("Kart link metni", "blog.cardLinkText", b.cardLinkText, "text", "Örn: Review the blog")}
        ${field("Load more metni", "blog.loadMoreText", b.loadMoreText)}
        ${field(
          "Kart sırası (slug listesi)",
          "blog._cardSlugs",
          cardSlugs,
          "textarea",
          "Her satır bir makale slug. Mevcut: " + articleSlugs
        )}
        ${field("Load more butonunu göster", "blog.showLoadMore", b.showLoadMore !== false, "checkbox")}
      </div>
      <p class="hint">Kart görselleri, etiketler ve özet metinler «Makaleler» bölümünden düzenlenir.</p>`;
  }

  function renderThinking() {
    const t = content.thinking || {};
    const articleSlugs = (content.articles || []).map((a) => a.slug).join(", ");
    const cardSlugs = t._cardSlugs ?? linesToText(t.cardSlugs);
    return `
      <div class="panel"><h3>The Witness Desk (ana sayfa bölümü)</h3>
        ${field("Başlık satır 1 (beyaz)", "thinking.titleLine1", t.titleLine1)}
        ${field("Başlık satır 2 (kırmızı)", "thinking.titleLine2", t.titleLine2)}
        ${field("Alt metin", "thinking.lead", t.lead, "textarea")}
        ${field("Kart link metni", "thinking.cardLinkText", t.cardLinkText, "text", "Örn: DEEP DIVE →")}
        ${field(
          "Kart sırası (slug listesi)",
          "thinking._cardSlugs",
          cardSlugs,
          "textarea",
          "Her satır bir makale slug. Mevcut: " + articleSlugs
        )}
        ${field("Sadece metin kartları", "thinking.textOnlyCards", t.textOnlyCards !== false, "checkbox")}
        ${field("Load more metni", "thinking.loadMoreText", t.loadMoreText)}
        ${field("İlk görünen kart sayısı", "thinking.initialVisible", t.initialVisible ?? 4, "text", "Fazlası Load more ile açılır")}
      </div>
      <p class="hint">Makale kartları, görseller ve etiketler «Makaleler» bölümünden düzenlenir.</p>`;
  }

  function renderProjects() {
    return (content.projects || [])
      .map((p, i) => {
        const cardTags = p._cardTags ?? linesToText(p.cardTags);

        return itemCard(
          p.cardTitle || p.slug,
          i,
          adminGroup(
            "Kart & listeler",
            field("Slug (URL)", `projects.${i}.slug`, p.slug, "text", "project.html?slug=...") +
              field("Kart başlığı", `projects.${i}.cardTitle`, p.cardTitle) +
              field(
                "Kart etiketleri (Works sayfası)",
                `projects.${i}._cardTags`,
                cardTags,
                "textarea",
                "Her satır bir etiket. Örn: Fantasy"
              ) +
              field("Kart özet (Works sayfası)", `projects.${i}.cardExcerpt`, p.cardExcerpt, "textarea") +
              field("Kart meta (opsiyonel)", `projects.${i}.meta`, p.meta) +
              imageField("Kart görseli", `projects.${i}.cardImage`, p.cardImage) +
              field("Ana sayfa rozeti", `projects.${i}.homeBadge`, p.homeBadge, "text", "Örn: Latest Project") +
              field("Ana sayfa kısa açıklama", `projects.${i}.homeDescription`, p.homeDescription, "textarea") +
              field("Sayfa başlığı (tarayıcı)", `projects.${i}.title`, p.title)
          ) +
            renderProjectInsideFields(p, i) +
            `<button type="button" class="btn btn-danger btn-sm" data-del-project="${i}" style="margin-top:1rem">Projeyi sil</button>`,
          "proj-" + i
        );
      })
      .join("") + `<button type="button" class="btn btn-secondary" id="add-project">+ Yeni proje</button>`;
  }

  function renderArticles() {
    return (content.articles || [])
      .map((a, i) => {
        const seo = a.seo || {};
        const tagsText = a._tags ?? tagsToText(a.tags);

        return itemCard(
          a.cardTitle || a.slug,
          i,
          adminGroup(
            "Kart & SEO",
            field("Slug (URL)", `articles.${i}.slug`, a.slug, "text", "article.html?slug=...") +
              imageField("Kart görseli", `articles.${i}.cardImage`, a.cardImage) +
              field(
                "Etiketler (kart üstü)",
                `articles.${i}._tags`,
                tagsText,
                "textarea",
                "Her satır bir etiket. Özel URL: Görsel Araştırma|visual-research"
              ) +
              field("Kart başlığı", `articles.${i}.cardTitle`, a.cardTitle) +
              field("Kart başlık satır 1", `articles.${i}.cardTitleLine1`, a.cardTitleLine1, "text", "Witness Desk iki satırlı başlık") +
              field("Kart başlık satır 2", `articles.${i}.cardTitleLine2`, a.cardTitleLine2, "text", "Kartta alt satır") +
              field("Kart özet (gri alt metin)", `articles.${i}.cardExcerpt`, a.cardExcerpt, "textarea") +
              field("Kart meta (opsiyonel)", `articles.${i}.meta`, a.meta) +
              field("Sayfa başlığı (tarayıcı)", `articles.${i}.title`, a.title) +
              field("SEO başlık (opsiyonel)", `articles.${i}.seo.title`, seo.title) +
              field("SEO açıklama", `articles.${i}.seo.description`, seo.description, "textarea")
          ) +
            renderArticleInsideFields(a, i) +
            `<button type="button" class="btn btn-danger btn-sm" data-del-article="${i}" style="margin-top:1rem">Makaleyi sil</button>`,
          "art-" + i,
          true
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
    const contact = content.home?.contact;
    if (contact?._addressLines != null) {
      contact.addressLines = contact._addressLines
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      delete contact._addressLines;
    }
    if (contact?.social) {
      const defaults = ["LinkedIn", "Instagram", "YouTube", "Substance"];
      contact.social = contact.social.map((s, i) => ({
        label: (s && s.label) || defaults[i] || "Link",
        href: (s && s.href) || "#",
      }));
    }
    const feat = content.home?.featured;
    if (feat && feat._paragraphs != null) {
      feat.paragraphs = feat._paragraphs.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
      delete feat._paragraphs;
    }
    const bento = content.home?.creativeProjects?.bento;
    if (bento?._tags != null) {
      bento.tags = parseLinesText(bento._tags);
      delete bento._tags;
    }
    if (bento?._breakdownItems != null) {
      bento.breakdownItems = parseLinesText(bento._breakdownItems);
      delete bento._breakdownItems;
    }
    const witness = content.home?.witness;
    if (witness?._cardSlugs != null) {
      witness.cardSlugs = parseLinesText(witness._cardSlugs);
      delete witness._cardSlugs;
    }
    const works = content.works;
    if (works?._projectSlugs != null) {
      works.projectSlugs = parseLinesText(works._projectSlugs);
      delete works._projectSlugs;
    }
    const blog = content.blog;
    if (blog?._cardSlugs != null) {
      blog.cardSlugs = parseLinesText(blog._cardSlugs);
      delete blog._cardSlugs;
    }
    const thinking = content.thinking;
    if (thinking?._cardSlugs != null) {
      thinking.cardSlugs = parseLinesText(thinking._cardSlugs);
      delete thinking._cardSlugs;
    }
    (content.projects || []).forEach((p) => {
      if (p._cardTags != null) {
        p.cardTags = parseLinesText(p._cardTags);
        delete p._cardTags;
      }
      syncParagraphsField(p, "paragraphs", "_paragraphs");
      if (p._gallery != null) {
        p.gallery = p._gallery.split("\n").map((s) => s.trim()).filter(Boolean);
        delete p._gallery;
      }
      if (p.mission) {
        syncParagraphsField(p.mission, "paragraphs", "_paragraphs");
      }
      (p.storyArticles || []).forEach((s) => {
        syncParagraphsField(s, "paragraphs", "_p");
      });
      (p.storySections || []).forEach((s) => {
        syncParagraphsField(s, "paragraphs", "_p");
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
      (a.insideSections || []).forEach((s) => {
        syncParagraphsField(s, "paragraphs", "_paragraphs");
      });
      if (a.closingSection) {
        syncParagraphsField(a.closingSection, "paragraphs", "_paragraphs");
      }
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
    else if (section === "blog") html = renderBlog();
    else if (section === "thinking") html = renderThinking();
    else if (section === "projects") html = renderProjects();
    else if (section === "articles") html = renderArticles();
    else if (section === "about") html = renderAbout();

    root.innerHTML = html;
    bindFields(root);
    bindLogoFields(root);
    bindCards(root);
    bindActions(root);
  }

  function bindLogoFields(root) {
    const typeSelect = root.querySelector('[data-path="site.logoType"]');
    if (!typeSelect) return;

    function syncLogoFieldVisibility() {
      const type = typeSelect.value || "composite";
      root.querySelectorAll("[data-logo-fields]").forEach((group) => {
        const modes = group.dataset.logoFields.split(/\s+/);
        group.style.display = modes.includes(type) ? "" : "none";
      });
    }

    typeSelect.addEventListener("change", syncLogoFieldVisibility);
    syncLogoFieldVisibility();
  }

  function bindActions(root) {
    $("#add-nav", root)?.addEventListener("click", () => {
      content.site.nav = content.site.nav || [];
      content.site.nav.push({ label: "Yeni", href: "#", page: "home" });
      render();
    });

    $("#add-experience", root)?.addEventListener("click", () => {
      content.home.experience.items = content.home.experience.items || [];
      const n = String(content.home.experience.items.length + 1).padStart(2, "0");
      content.home.experience.items.push({ num: n, title: "Yeni", details: "" });
      render();
    });

    $("#add-project", root)?.addEventListener("click", () => {
      content.projects = content.projects || [];
      content.projects.push({
        slug: "yeni-proje-" + Date.now(),
        cardTitle: "Yeni Proje",
        cardExcerpt: "",
        cardTags: [],
        meta: "",
        cardImage: "",
        heroImage: "",
        homeBadge: "",
        homeDescription: "",
        videoUrl: "",
        showPlayButton: true,
        displayTitle: "PROJECT: YENİ PROJE",
        projectDate: "",
        titleLine1: "Project:",
        titleLine2: "Yeni Proje",
        title: "Yeni Proje",
        mission: {
          label: "THE MISSION",
          quote: "",
          image: "",
          paragraphs: [],
        },
        storyEngineIntro: "",
        storyArticles: [],
        materialsCta: { text: "More project materials", href: "#materials" },
        closingImage: "",
        paragraphs: [],
        sideImage: "",
        sideImageAlt: "",
        storyTitle: "Story Engine",
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

    $$("[data-add-story-article]", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        collectFromDom();
        const i = parseInt(btn.dataset.addStoryArticle, 10);
        content.projects[i].storyArticles = content.projects[i].storyArticles || [];
        content.projects[i].storyArticles.push({ heading: "YENİ BÖLÜM", paragraphs: [""] });
        render();
      });
    });

    $$("[data-del-story-article]", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        collectFromDom();
        const [pi, ai] = btn.dataset.delStoryArticle.split(":").map(Number);
        content.projects[pi].storyArticles.splice(ai, 1);
        render();
      });
    });

    $("#add-article", root)?.addEventListener("click", () => {
      content.articles = content.articles || [];
      content.articles.push({
        slug: "yeni-yazi-" + Date.now(),
        cardTitle: "Yeni Yazı",
        cardExcerpt: "",
        meta: "",
        cardImage: "",
        displayTitle: "YENİ YAZI",
        subtitle: "",
        title: "Yeni Yazı",
        tags: [],
        seo: { title: "", description: "" },
        insideSections: [{ type: "prose", paragraphs: [""] }],
        closingSection: { title: "END OF THE DAY…", paragraphs: [""] },
        blocks: [],
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

    $$("[data-add-inside-section]", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        collectFromDom();
        const i = parseInt(btn.dataset.addInsideSection, 10);
        const type = btn.dataset.sectionType || "prose";
        content.articles[i].insideSections = content.articles[i].insideSections || [];
        const section = { type };
        if (type === "marker") section.value = "01";
        else if (type === "image") {
          section.src = "";
          section.alt = "";
        } else if (type === "quote-section") {
          section.quote = "";
          section.paragraphs = [""];
        } else {
          section.paragraphs = [""];
        }
        content.articles[i].insideSections.push(section);
        render();
      });
    });

    $$("[data-del-inside-section]", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        collectFromDom();
        const [ai, si] = btn.dataset.delInsideSection.split(":").map(Number);
        content.articles[ai].insideSections.splice(si, 1);
        render();
      });
    });

    $$("[data-inside-type]", root).forEach((sel) => {
      sel.addEventListener("change", () => {
        collectFromDom();
        const i = parseInt(sel.dataset.article, 10);
        const si = parseInt(sel.dataset.section, 10);
        const type = sel.value;
        const section = { type };
        if (type === "marker") section.value = "01";
        else if (type === "image") {
          section.src = "";
          section.alt = "";
        } else if (type === "quote-section") {
          section.quote = "";
          section.paragraphs = [""];
        } else {
          section.paragraphs = [""];
        }
        content.articles[i].insideSections[si] = section;
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
    const bento = content.home?.creativeProjects?.bento;
    if (bento?.tags) bento._tags = linesToText(bento.tags);
    if (bento?.breakdownItems) bento._breakdownItems = linesToText(bento.breakdownItems);
    if (content.home?.witness?.cardSlugs) {
      content.home.witness._cardSlugs = linesToText(content.home.witness.cardSlugs);
    }
    if (content.works?.projectSlugs) {
      content.works._projectSlugs = linesToText(content.works.projectSlugs);
    }
    if (content.blog?.cardSlugs) {
      content.blog._cardSlugs = linesToText(content.blog.cardSlugs);
    }
    if (content.thinking?.cardSlugs) {
      content.thinking._cardSlugs = linesToText(content.thinking.cardSlugs);
    }
    if (content.home?.contact?.addressLines) {
      content.home.contact._addressLines = content.home.contact.addressLines.join("\n");
    }
    if (content.home?.contact?.social) {
      const defaults = ["LinkedIn", "Instagram", "YouTube", "Substance"];
      content.home.contact.social = content.home.contact.social.map((s, i) => ({
        label: s.label || defaults[i],
        href: s.href || "#",
      }));
    }
    (content.projects || []).forEach((p) => {
      if (p.cardTags) p._cardTags = linesToText(p.cardTags);
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
    const warn = $("#login-config-warn");
    if (warn && json.configured === false) {
      const missing = (json.missing || []).join(", ");
      warn.style.display = "block";
      warn.textContent =
        "Sunucu yapılandırması eksik (" +
        (missing || "ADMIN_USER, ADMIN_PASS, ADMIN_SESSION_SECRET") +
        "). Netlify → Site configuration → Environment variables → değişkenleri ekleyin → Deploy site.";
    } else if (warn) {
      warn.style.display = "none";
    }
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
