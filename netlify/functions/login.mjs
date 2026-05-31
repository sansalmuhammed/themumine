import {
  ADMIN_USER,
  ADMIN_PASS,
  createToken,
  cookieHeader,
  isAuthConfigured,
  json,
} from "./_auth.mjs";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  if (!isAuthConfigured()) {
    return json(
      {
        ok: false,
        error: "Admin yapılandırması eksik. Netlify ortam değişkenlerini tanımlayın.",
      },
      503
    );
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json({ ok: false, error: "Geçersiz istek" }, 400);
  }

  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return json({ ok: false, error: "Hatalı kullanıcı adı veya şifre" }, 401);
  }

  let token;
  try {
    token = createToken(username);
  } catch {
    return json({ ok: false, error: "Oturum yapılandırması eksik (ADMIN_SESSION_SECRET)" }, 503);
  }
  return json(
    { ok: true, message: "Giriş başarılı" },
    200,
    { "Set-Cookie": cookieHeader(token) }
  );
}
