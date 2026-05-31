import { readCookie, verifyToken, json } from "./_auth.mjs";

export async function handler(event) {
  const token = readCookie(event);
  const user = verifyToken(token);
  return json({ ok: true, loggedIn: Boolean(user) });
}
