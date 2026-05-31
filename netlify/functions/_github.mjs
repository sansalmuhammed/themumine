const OWNER = process.env.GITHUB_OWNER || "";
const REPO = process.env.GITHUB_REPO || "";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const TOKEN = process.env.GITHUB_TOKEN || "";

export function githubConfigured() {
  return Boolean(OWNER && REPO && TOKEN);
}

export function githubError() {
  return {
    ok: false,
    error:
      "GitHub bağlantısı eksik. Netlify → Environment variables: GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN ekleyip yeniden deploy edin.",
  };
}

function apiUrl(path) {
  return `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
}

async function ghFetch(path, options = {}) {
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  return res;
}

export async function readRepoFile(path) {
  const res = await ghFetch(path);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub okuma hatası: ${err}`);
  }
  const data = await res.json();
  if (Array.isArray(data)) throw new Error("Beklenmeyen dizin yanıtı");
  const text = Buffer.from(data.content, "base64").toString("utf8");
  return { text, sha: data.sha };
}

export async function writeRepoFile(path, text, message, sha) {
  const body = {
    message,
    content: Buffer.from(text, "utf8").toString("base64"),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await ghFetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub yazma hatası: ${err}`);
  }
  return true;
}

export async function writeRepoBinary(path, buffer, message, sha) {
  const body = {
    message,
    content: Buffer.from(buffer).toString("base64"),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await ghFetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub yükleme hatası: ${err}`);
  }
  return true;
}

export function publicRawUrl(path) {
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}`;
}
