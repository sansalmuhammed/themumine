import crypto from "crypto";

const IS_NETLIFY = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);

export const ADMIN_USER = process.env.ADMIN_USER || "";
export const ADMIN_PASS = process.env.ADMIN_PASS || "";

const AUTH_ENV_KEYS = ["ADMIN_USER", "ADMIN_PASS", "ADMIN_SESSION_SECRET"];

export function getMissingAuthEnv() {
  const missing = [];
  if (!String(process.env.ADMIN_USER || "").trim()) missing.push("ADMIN_USER");
  if (!process.env.ADMIN_PASS) missing.push("ADMIN_PASS");
  if (!String(process.env.ADMIN_SESSION_SECRET || "").trim()) missing.push("ADMIN_SESSION_SECRET");
  return missing;
}

export function isAuthConfigured() {
  return getMissingAuthEnv().length === 0;
}

export function authConfigErrorMessage() {
  const missing = getMissingAuthEnv();
  if (!missing.length) return "";
  return (
    "Admin yapılandırması eksik. Netlify → Site configuration → Environment variables " +
    "bölümünde şunları tanımlayıp siteyi yeniden deploy edin: " +
    missing.join(", ")
  );
}

function sessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret) return secret;
  if (IS_NETLIFY) return null;
  return "local-dev-only-change-in-netlify";
}

export function json(body, status = 200, headers = {}) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
    body: JSON.stringify(body),
  };
}

export function createToken(username) {
  const secret = sessionSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");
  const exp = Date.now() + 24 * 60 * 60 * 1000;
  const payload = `${username}|${exp}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${sig}`;
}

export function verifyToken(token) {
  const secret = sessionSecret();
  if (!secret || !token || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  const payload = Buffer.from(data, "base64url").toString("utf8");
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
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

export function requireAuth(event) {
  if (!isAuthConfigured()) return null;
  return verifyToken(readCookie(event));
}
