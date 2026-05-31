# Netlify’da yayınlama — The Mumine

Netlify **PHP çalıştırmaz**. Canlı sitede içerik `data/content.json` dosyasından okunur. **Admin paneli** yalnızca bilgisayarınızda (WAMP) çalışır; değişiklik yaptıktan sonra JSON’u Git ile Netlify’a gönderirsiniz.

---

## Hızlı yol (önerilen): Git + Netlify

### 1. Git deposu oluşturun

Proje klasöründe (PowerShell):

```powershell
cd c:\wamp64\www\themumine
git init
git add .
git commit -m "Initial portfolio site"
```

GitHub’da boş bir repo oluşturun, sonra:

```powershell
git remote add origin https://github.com/KULLANICI_ADINIZ/the-mumine.git
git branch -M main
git push -u origin main
```

### 2. Netlify’da site ekleyin

1. [https://app.netlify.com](https://app.netlify.com) → giriş yapın  
2. **Add new site** → **Import an existing project**  
3. **GitHub** → repoyu seçin  
4. Build ayarları (çoğu zaman otomatik doğru gelir):

| Alan | Değer |
|------|--------|
| Branch | `main` |
| Build command | *(boş bırakın)* |
| Publish directory | `.` veya boş (kök klasör) |

`netlify.toml` zaten repoda; Netlify bunu okur.

5. **Deploy site**

Site adresi: `https://rastgele-isim.netlify.app` — **Domain settings** ile özel alan adı bağlayabilirsiniz.

### 3. İçerik güncelleme akışı

1. Yerelde: `http://localhost/themumine/admin/` → düzenle → **Kaydet**  
2. `data/content.json` (ve yeni görseller `assets/uploads/`) değişir  
3. Git’e commit + push:

```powershell
git add data/content.json assets/
git commit -m "İçerik güncellemesi"
git push
```

4. Netlify otomatik yeniden deploy eder (1–2 dk)

---

## Alternatif: Sürükle-bırak (Git olmadan)

1. Netlify → **Sites** → **Add new site** → **Deploy manually**  
2. Proje klasörünün **içeriğini** (zip veya klasör) sürükleyin  
   - `index.html`, `css/`, `js/`, `data/content.json`, `assets/` dahil olmalı  
   - `api/` PHP dosyaları Netlify’da işe yaramaz; zararsızdır  

Her admin güncellemesinden sonra zip’i yeniden yüklemeniz gerekir — uzun vadede Git daha pratiktir.

---

## İletişim formu (Netlify Forms)

Statik sitede form için Netlify Forms kullanabilirsiniz:

1. `index.html` içindeki formu şöyle güncelleyin:

```html
<form class="contact-form" name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field">
  <input type="hidden" name="form-name" value="contact">
  <p hidden><label>Bot <input name="bot-field"></label></p>
  <!-- mevcut alanlar -->
</form>
```

2. Netlify deploy sonrası **Forms** sekmesinden gelen mesajları görürsünüz  

Admin’deki “Form action URL” alanı Netlify Forms ile birlikte kullanılmaz; form HTML’de `data-netlify` yeterli.

---

## Admin paneli canlıda (Netlify)

| Ortam | Site | Admin giriş | Admin kayıt |
|--------|------|-------------|---------------|
| WAMP (yerel) | ✅ | ✅ Kullanıcı adı + şifre | ✅ |
| Netlify | ✅ | ✅ `/.netlify/functions/login` | ❌ Yerel kayıt + git push |

Giriş: **kullanıcı adı** + **şifre** (tek alan şifre değil).

Netlify ortam değişkenleri (isteğe bağlı, yoksa kod içi varsayılanlar kullanılır):

| Değişken | Açıklama |
|----------|----------|
| `ADMIN_USER` | Giriş e-postası / kullanıcı adı |
| `ADMIN_PASS` | Şifre |
| `ADMIN_SESSION_SECRET` | Oturum imzası (üretimde değiştirin) |

**Güvenlik:** Repo herkese açıksa şifreyi yalnızca Netlify env’de tutun; `netlify/functions/_auth.mjs` içindeki varsayılanları kaldırın.

---

## Kontrol listesi (ilk deploy)

- [ ] `data/content.json` repoda / zip’te var  
- [ ] Görseller `assets/` veya tam URL (Unsplash) — yerel upload’lar `assets/uploads/` commit edildi mi?  
- [ ] Site açılıyor: ana sayfa, works, proje `?slug=...` linkleri  
- [ ] Netlify **Deploy log** yeşil  
- [ ] İsteğe bağlı: özel domain + HTTPS (Netlify otomatik)

---

## Sorun giderme

**Sayfa boş / eski içerik**  
- `data/content.json` push edildi mi?  
- Tarayıcı önbelleğini temizleyin veya gizli pencere deneyin  

**Görseller kırık**  
- Yollar `assets/uploads/...` ise dosyaların deploy’a dahil olduğundan emin olun  
- Tam URL (`https://...`) kullanıyorsanız CORS sorunu olmaz  

**404 proje/makale**  
- Linkler `project.html?slug=bubble-buddies` formatında olmalı (slug admin’deki ile aynı)
