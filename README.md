# The Mumine — Portfolio

[Figma tasarımı](https://www.figma.com/design/Y9pDcCEtiTHpJeWqf6rEEo/the-mumine?node-id=1-2) temel alınarak oluşturulmuş statik portfolio sitesi.

## Yerel çalıştırma (WAMP)

1. WAMP’ı başlatın (Apache + PHP).
2. Site: **http://localhost/themumine/**
3. Admin: **http://localhost/themumine/admin/** — kullanıcı adı + şifre ile giriş (ayarlar `api/config.php`)

### Admin’de düzenlenebilen alanlar

- Logo, menü, footer, sayfa başlıkları, meta, tema renkleri, fontlar
- Ana sayfa: hero, öne çıkan proje, Witness Book, deneyim, iletişim formu
- Projeler ve makaleler: ekle/sil, metin, görseller, galeri, story/blok yapısı
- Hakkımda: biyografi, portreler, skills
- Görsel yükleme → `assets/uploads/`

## Sayfalar

| Dosya | Figma karşılığı |
|--------|------------------|
| `index.html` | Ana sayfa (hero, projeler, witness book, deneyim, iletişim) |
| `works.html` | Selected Works |
| `project.html` | Proje detay |
| `thinking.html` | What I'm Thinking |
| `article.html` | Makale detay |
| `about.html` | Mümine Serap / Skills |

## Figma görsellerini ekleme

1. Figma’da frame veya görseli seçin → **Export** (PNG veya JPG, 2x önerilir).
2. Dosyaları `assets/` klasörüne kaydedin.
3. HTML’deki `src` yollarını güncelleyin, örn. `assets/hero.jpg`.

## İletişim formu (canlı yayın)

Form şu an demo modunda. Admin → Ana Sayfa → **Form action URL** alanına Formspree adresini yazın.

## İnternete yayınlama

- **Netlify:** Adım adım rehber → [`NETLIFY.md`](NETLIFY.md) (Git + otomatik deploy önerilir).
- **Kendi hosting (PHP):** Tüm klasörü yükleyin; admin ve API çalışır.
- **Not:** Netlify’da PHP yok; içerik `data/content.json` üzerinden sunulur, admin yerelde kalır.

## Admin giriş bilgilerini değiştirme

`api/config.php` içinde `ADMIN_USERNAME` ve `ADMIN_PASSWORD_HASH` güncelleyin:

```bash
php -r "echo password_hash('YENI_SIFRE', PASSWORD_DEFAULT);"
```

Netlify için aynı bilgileri **Site settings → Environment variables** altında `ADMIN_USER` ve `ADMIN_PASS` olarak da tanımlayabilirsiniz (kodda varsayılanlar vardır).

## Özelleştirme

Renk ve fontlar admin panelinden veya `data/content.json` üzerinden düzenlenir.
