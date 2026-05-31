import { json } from "./_auth.mjs";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }
  return json(
    { ok: true, message: "Çıkış yapıldı" },
    200,
    { "Set-Cookie": "themumine_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0" }
  );
}
