function ensureVideoModal() {
  if (document.querySelector("[data-video-modal]")) return;
  const modal = document.createElement("div");
  modal.className = "video-modal";
  modal.hidden = true;
  modal.setAttribute("data-video-modal", "");
  modal.innerHTML =
    '<div class="video-modal__backdrop" data-video-close tabindex="-1"></div>' +
    '<div class="video-modal__dialog" role="dialog" aria-modal="true" aria-label="Video player">' +
    '<button type="button" class="video-modal__close" data-video-close aria-label="Close video">×</button>' +
    '<div class="video-modal__frame-wrap">' +
    '<iframe class="video-modal__iframe" title="YouTube video" src="" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>' +
    "</div></div>";
  document.body.appendChild(modal);
}

function initProjectVideo() {
  ensureVideoModal();
  const modal = document.querySelector("[data-video-modal]");
  if (!modal || modal.dataset.bound === "1") return;
  modal.dataset.bound = "1";

  const iframe = modal.querySelector(".video-modal__iframe");
  let lastTrigger = null;

  function closeVideo() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (iframe) iframe.src = "";
    if (lastTrigger) lastTrigger.focus();
    lastTrigger = null;
  }

  function openVideo(id, trigger) {
    if (!iframe || !id) return;
    lastTrigger = trigger || null;
    iframe.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=1&rel=0";
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    modal.querySelector(".video-modal__close")?.focus();
  }

  document.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-youtube-play]");
    if (btn) {
      e.preventDefault();
      openVideo(btn.getAttribute("data-youtube-play"), btn);
      return;
    }
    if (e.target.closest("[data-video-close]")) closeVideo();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) closeVideo();
  });
}

function initSiteUI() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".site-nav");

  if (toggle && nav) {
    toggle.replaceWith(toggle.cloneNode(true));
    const newToggle = document.querySelector(".menu-toggle");
    const newNav = document.querySelector(".site-nav");

    newToggle.addEventListener("click", function () {
      const open = newToggle.getAttribute("aria-expanded") === "true";
      newToggle.setAttribute("aria-expanded", String(!open));
      newNav.classList.toggle("is-open", !open);
      document.body.style.overflow = open ? "" : "hidden";
    });

    newNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        newToggle.setAttribute("aria-expanded", "false");
        newNav.classList.remove("is-open");
        document.body.style.overflow = "";
      });
    });
  }

  const params = new URLSearchParams(location.search);
  if (params.get("contact") === "success") {
    const notice = document.querySelector("[data-contact-success]");
    const form = document.querySelector(".contact-form[data-netlify]");
    const baseMsg =
      form?.getAttribute("data-success") || "Your inquiry has been received. Thank you.";
    const redirectMs = parseInt(form?.getAttribute("data-redirect-ms") || "3000", 10);

    if (notice) {
      notice.textContent =
        baseMsg + " " + (form?.getAttribute("data-redirect-hint") || "Redirecting to the homepage…");
      notice.hidden = false;
    }
    if (location.hash !== "#contact") {
      history.replaceState(null, "", location.pathname + location.search + "#contact");
    }

    setTimeout(function () {
      const home = new URL("/", location.origin);
      window.location.replace(home.href);
    }, redirectMs);
  }

  initProjectVideo();

  const form = document.querySelector(".contact-form");
  if (form && !form.dataset.bound) {
    form.dataset.bound = "1";
    const isNetlify = form.hasAttribute("data-netlify");
    form.addEventListener("submit", function (e) {
      if (isNetlify) return;
      const action = form.getAttribute("action");
      if (!action || action === "#") {
        e.preventDefault();
        const msg = form.getAttribute("data-success") || "Your inquiry has been received.";
        alert(msg);
        form.reset();
      }
    });
  }
}

window.initSiteUI = initSiteUI;

if (document.body && !document.body.dataset.page) {
  document.addEventListener("DOMContentLoaded", initSiteUI);
}
