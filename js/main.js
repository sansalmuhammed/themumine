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
    if (notice) {
      notice.textContent =
        form?.getAttribute("data-success") || "Your inquiry has been received. Thank you.";
      notice.hidden = false;
    }
    if (location.hash !== "#contact") {
      history.replaceState(null, "", location.pathname + location.search + "#contact");
    }
  }

  const form = document.querySelector(".contact-form");
  if (form && !form.dataset.bound) {
    form.dataset.bound = "1";
    const isNetlify = form.hasAttribute("data-netlify");
    form.addEventListener("submit", function (e) {
      if (isNetlify) return;
      const action = form.getAttribute("action");
      if (!action || action === "#") {
        e.preventDefault();
        const msg = form.getAttribute("data-success") || "Mesajınız alındı.";
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
