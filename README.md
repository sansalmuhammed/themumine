# The Mumine — Portfolio (Netlify)

[Figma tasarımı](https://www.figma.com/design/Y9pDcCEtiTHpJeWqf6rEEo/the-mumine?node-id=1-2) temel alınmış portfolio sitesi. **Yalnızca Netlify** üzerinde yayınlanır.

## Canlı adresler

- Site: `https://SITENIZ.netlify.app/`
- Admin: `https://SITENIZ.netlify.app/admin/`

## Deploy (Git)

```bash
git add .
git commit -m "Güncelleme"
git push
```

Netlify repoyu bağlıysa otomatik deploy eder. İlk kurulumda **Build command** boş, **Publish directory** `.` (kök).

## Admin girişi

| Alan | Varsayılan |
|------|------------|
| Kullanıcı adı | `mumine.serap@themumine.com` |
| Şifre | *(kurulumda belirlediğiniz)* |

Netlify → **Site configuration → Environment variables** (önerilir):

- `ADMIN_USER` — giriş kullanıcı adı
- `ADMIN_PASS` — şifre
- `ADMIN_SESSION_SECRET` — rastgele uzun bir metin (oturum güvenliği)

## Admin özellikleri

- Tüm sayfa metinleri, menü, tema renkleri
- **Görsel yükleme** → Netlify Blobs (`/.netlify/functions/upload`)
- **Kaydet** → içerik Netlify Blobs’ta saklanır; site anında güncellenir

Logo ve diğer görseller: Admin → Site & Tema → Logo görseli → **Yükle** → **Kaydet**.

## Yerel test (isteğe bağlı)

```bash
npm install
npx netlify dev
```

WAMP / PHP gerekmez.

## Proje yapısı

```
├── index.html, works.html, …   # Sayfalar
├── css/, js/render.js          # Ön yüz
├── data/content.json           # İlk / yedek içerik
├── admin/                      # Yönetim paneli
├── netlify/functions/          # API (giriş, içerik, yükleme)
└── netlify.toml
```

## İletişim formu

Admin → Ana Sayfa → **Form action URL** alanına [Formspree](https://formspree.io) adresi yazın; veya forma `data-netlify="true"` ekleyin.
