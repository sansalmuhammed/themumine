# The Mumine — Portfolio (yalnızca Netlify)

Site ve admin **sadece Netlify** üzerinde çalışır. WAMP, PHP veya yerel sunucu gerekmez.

## Kurulum (bir kez)

### 1. GitHub repo

Proje bir GitHub reposuna bağlı olmalı (Netlify bu repodan deploy eder).

### 2. Netlify ortam değişkenleri

**Site configuration → Environment variables:**

| Değişken | Örnek / açıklama |
|----------|------------------|
| `GITHUB_OWNER` | GitHub kullanıcı adınız veya organizasyon |
| `GITHUB_REPO` | Repo adı (ör. `the-mumine`) |
| `GITHUB_TOKEN` | [Personal access token](https://github.com/settings/tokens) — **repo** yetkisi |
| `GITHUB_BRANCH` | `main` (varsayılan dal) |
| `ADMIN_USER` | Admin giriş e-postası |
| `ADMIN_PASS` | Admin şifresi |
| `ADMIN_SESSION_SECRET` | Uzun rastgele metin |

### 3. Deploy

```bash
git push
```

Netlify otomatik build alır.

## Kullanım

- **Site:** `https://SITENIZ.netlify.app/`
- **Admin:** `https://SITENIZ.netlify.app/admin/`

Admin’de metin veya görsel değiştirip **Kaydet** dediğinizde içerik **GitHub’daki `data/content.json`** dosyasına yazılır; Netlify birkaç dakika içinde siteyi yeniden yayınlar.

Görsel **Yükle** → dosya `assets/uploads/` altına GitHub’a gider.

## Akış

```
Admin (Netlify) → GitHub API → content.json / görseller güncellenir
                → Netlify otomatik deploy → Canlı site güncellenir
```

## Sorun giderme

**“GitHub bağlantısı eksik”**  
→ `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_TOKEN` tanımlı mı? Deploy yenilendi mi?

**Kayıt oldu ama sitede eski içerik**  
→ Deploy bitmesini bekleyin (Netlify Deploys sekmesi, 1–3 dk).

**Görsel kırık**  
→ Deploy tamamlandıktan sonra sayfayı yenileyin; yol `assets/uploads/...` olmalı.

## İletişim formu (Netlify Forms)

Ana sayfadaki **Get in Touch** formu Netlify Form Detection ile çalışır (`index.html` içinde gizli şablon + canlı form).

**E-posta bildirimi:** Netlify → **Forms** → form adı `contact` → **Form notifications** → e-posta: `mumine.serap@themumine.com`

Form detection site ayarlarında açık olmalı. Gönderimler Netlify panelinde **Submissions** altında görünür.
