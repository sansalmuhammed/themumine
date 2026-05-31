import { getStore } from "@netlify/blobs";
import { json, requireAuth } from "./_auth.mjs";

async function loadDefaultContent() {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL || "";
  if (!base) return null;
  try {
    const res = await fetch(`${base}/data/content.json`);
    if (res.ok) return await res.json();
  } catch {
    /* ignore */
  }
  return null;
}

export async function handler(event) {
  const store = getStore("site");

  if (event.httpMethod === "GET") {
    let raw = await store.get("content", { type: "text" });
    let data = raw ? JSON.parse(raw) : null;
    if (!data) data = await loadDefaultContent();
    if (!data) return json({ ok: false, error: "İçerik bulunamadı" }, 404);
    return json({ ok: true, data });
  }

  if (event.httpMethod === "POST") {
    if (!requireAuth(event)) return json({ ok: false, error: "Yetkisiz" }, 401);
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json({ ok: false, error: "Geçersiz JSON" }, 400);
    }
    if (!body.data || typeof body.data !== "object") {
      return json({ ok: false, error: "Geçersiz veri" }, 400);
    }
    await store.set("content", JSON.stringify(body.data));
    return json({ ok: true, message: "İçerik kaydedildi" });
  }

  return json({ ok: false, error: "Method not allowed" }, 405);
}
