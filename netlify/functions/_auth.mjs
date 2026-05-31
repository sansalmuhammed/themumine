import crypto from "crypto";

export const ADMIN_USER = process.env.ADMIN_USER || "mumine.serap@themumine.com";
export const ADMIN_PASS = process.env.ADMIN_PASS || "1L0veSemerkand";

const SECRET = process.env.ADMIN_SESSION_SECRET || "themumine-admin-session-v1";
const COOKIE = "themumine_admin";

export function json(body, status = 200, headers = {}) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
    body: JSON.stringify(body),
  };
}

export function createToken(username) {
  const exp = Date.now() + 24 * 60 * 60 * 1000;
  const payload = `${username}|${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${sig}`;
}

export function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  const payload = Buffer.from(data, "base64url").toString("utf8");
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  if (sig !== expected) return null;
  const [username, exp] = payload.split("|");
  if (Date.now() > Number(exp)) return null;
  return username;
}

export function cookieHeader(token, maxAge = 86400) {
  return `themumine_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function readCookie(event) {
  const raw = event.headers.cookie || event.headers.Cookie || "";
  const match = raw.match(/(?:^|;\s*)themumine_admin=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export { COOKIE };
