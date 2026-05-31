import { json, requireAuth } from "./_auth.mjs";
import {
  githubConfigured,
  githubError,
  readRepoFile,
  writeRepoFile,
} from "./_github.mjs";

const CONTENT_PATH = "data/content.json";

async function loadDefaultFromDeploy(event) {
  const host = event.headers.host || event.headers.Host;
  const proto = event.headers["x-forwarded-proto"] || "https";
  if (!host) return null;
  try {
    const res = await fetch(`${proto}://${host}/data/content.json`);
    if (res.ok) return await res.json();
  } catch {
    /* ignore */
  }
  return null;
}

export async function handler(event) {
  if (event.httpMethod === "GET") {
    if (githubConfigured()) {
      try {
        const file = await readRepoFile(CONTENT_PATH);
        if (file) {
          return json({ ok: true, data: JSON.parse(file.text) });
        }
      } catch (e) {
        return json({ ok: false, error: e.message }, 500);
      }
    }
    const fallback = await loadDefaultFromDeploy(event);
    if (fallback) return json({ ok: true, data: fallback });
    return json({ ok: false, error: "İçerik bulunamadı" }, 404);
  }

  if (event.httpMethod === "POST") {
    if (!requireAuth(event)) return json({ ok: false, error: "Yetkisiz" }, 401);
    if (!githubConfigured()) return json(githubError(), 503);

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json({ ok: false, error: "Geçersiz JSON" }, 400);
    }
    if (!body.data || typeof body.data !== "object") {
      return json({ ok: false, error: "Geçersiz veri" }, 400);
    }

    try {
      const existing = await readRepoFile(CONTENT_PATH);
      const text = JSON.stringify(body.data, null, 2) + "\n";
      await writeRepoFile(
        CONTENT_PATH,
        text,
        "Admin: içerik güncellendi",
        existing?.sha
      );
      return json({
        ok: true,
        message: "Kaydedildi. Site birkaç dakika içinde otomatik güncellenir.",
      });
    } catch (e) {
      return json({ ok: false, error: e.message }, 500);
    }
  }

  return json({ ok: false, error: "Method not allowed" }, 405);
}
