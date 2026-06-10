import {
  readCookie,
  verifyToken,
  isAuthConfigured,
  getMissingAuthEnv,
  json,
} from "./_auth.mjs";

export async function handler(event) {
  const configured = isAuthConfigured();
  const token = readCookie(event);
  const user = configured ? verifyToken(token) : null;
  return json({
    ok: true,
    loggedIn: Boolean(user),
    configured,
    missing: configured ? [] : getMissingAuthEnv(),
  });
}
