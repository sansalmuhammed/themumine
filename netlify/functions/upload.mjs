import { json, requireAuth } from "./_auth.mjs";
import {
  githubConfigured,
  githubError,
  publicRawUrl,
  readRepoFile,
  writeRepoBinary,
} from "./_github.mjs";

const MAX_BYTES = 2 * 1024 * 1024;

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  if (!requireAuth(event)) return json({ ok: false, error: "Yetkisiz" }, 401);
  if (!githubConfigured()) return json(githubError(), 503);

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json({ ok: false, error: "Geçersiz istek" }, 400);
  }

  const dataUrl = body.dataUrl || "";
  if (!dataUrl.startsWith("data:image/")) {
    return json({ ok: false, error: "Sadece görsel (JPG, PNG, WebP, GIF)" }, 400);
  }

  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) return json({ ok: false, error: "Geçersiz görsel" }, 400);

  const mime = match[1].toLowerCase();
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(mime)) {
    return json({ ok: false, error: "Desteklenmeyen format" }, 400);
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_BYTES) {
    return json({ ok: false, error: "Dosya en fazla 2 MB" }, 400);
  }

  const ext = mime.replace("image/", "").replace("jpeg", "jpg");
  const safeName = (body.filename || `image.${ext}`)
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 80) || `image.${ext}`;
  const repoPath = `assets/uploads/${Date.now()}-${safeName}`;

  try {
    const existing = await readRepoFile(repoPath);
    await writeRepoBinary(
      repoPath,
      buffer,
      `Admin: görsel yüklendi ${safeName}`,
      existing?.sha
    );
    const staticPath = repoPath;
    const url = publicRawUrl(repoPath);
    return json({
      ok: true,
      url: staticPath,
      path: staticPath,
      previewUrl: url,
      message: "Görsel yüklendi. Kaydet ile metinleri de kaydedin; deploy sonrası sitede görünür.",
    });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}
