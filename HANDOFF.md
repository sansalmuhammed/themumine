# The Mumine — Müşteri teslim kontrol listesi

Canlı site: [https://themumine.netlify.app/](https://themumine.netlify.app/)

## Sizin yapmanız gerekenler (öncelik sırasıyla)

### 1. Netlify ortam değişkenleri (zorunlu)

**Site configuration → Environment variables → Add variable**

| Değişken | Ne yazmalısınız |
|----------|------------------|
| `GITHUB_OWNER` | GitHub kullanıcı adı (ör. `sansalmuhammed`) |
| `GITHUB_REPO` | Repo adı (ör. `themumine`) |
| `GITHUB_TOKEN` | GitHub Personal Access Token — sadece **repo** yetkisi |
| `GITHUB_BRANCH` | `main` |
| `ADMIN_USER` | Admin giriş e-postası (müşteriye özel) |
| `ADMIN_PASS` | **Güçlü, benzersiz şifre** (en az 16 karakter) |
| `ADMIN_SESSION_SECRET` | Rastgele uzun metin (32+ karakter; [1Password / random.org](https://www.random.org/strings/) kullanın) |

Kaydettikten sonra: **Deploys → Trigger deploy → Deploy site** (env değişince yeniden deploy şart).

> **Önemli:** Kodda artık varsayılan admin şifresi yok. Bu değişkenler tanımlı değilse admin panele giriş yapılamaz.

> **“Admin yapılandırması eksik” hatası:** Genelde `ADMIN_SESSION_SECRET` Netlify’da hiç tanımlanmamıştır (eskiden kod içinde varsayılan vardı). Üç değişkenin hepsini ekleyip yeniden deploy edin. Giriş ekranında hangi değişkenlerin eksik olduğu listelenir.

### 2. GitHub token

1. [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. **Fine-grained** veya **Classic** token oluşturun
3. Bu repo için **Contents: Read and write** (veya classic `repo`)
4. Token’ı yalnızca Netlify `GITHUB_TOKEN` alanına yapıştırın; e-posta/chat ile paylaşmayın
5. Token’ı periyodik olarak yenileyin (ör. 6–12 ay)

### 3. İletişim formu e-postası

Admin’deki `notifyEmail` alanı yalnızca hatırlatmadır; Netlify otomatik okumaz.

1. Netlify → **Forms** → **Form detection** açık olsun
2. Form adı: **contact**
3. **Form notifications** → Add notification → **Email notification**
4. Alıcı: `mumine.serap@themumine.com` (veya müşterinin istediği adres)
5. Test gönderimi yapın → **Submissions** altında görünmeli

### 4. İçerik son düzenlemeler (müşteri / siz)

- [ ] **Sosyal medya linkleri** — `content.json` → `home.contact.social` içindeki LinkedIn, Instagram, YouTube, Substance URL’leri gerçek profillere güncellenmeli (şu an genel ana sayfa linkleri)
- [ ] **İletişim e-postası** — `ist@themumine.com` doğru mu?
- [ ] **Footer telif** — `© 2026 THE MUMINE` (admin’den değiştirilebilir)
- [ ] Unsplash görselleri istenirse kendi görselleriyle değiştirin (admin → Yükle)

### 5. Özel alan adı (isteğe bağlı)

Netlify → **Domain management** → `themumine.com` vb. DNS yönlendirmesi.

---

## Güvenlik — bilmeniz gerekenler

| Konu | Durum | Öneri |
|------|--------|--------|
| Admin şifresi kaynak kodda | **Kaldırıldı** | Sadece Netlify env kullanın |
| Admin paneli URL’si | Herkese açık `/admin/` | Güçlü şifre; mümkünse Netlify şifre koruması veya IP kısıtı |
| Oturum çerezi | HttpOnly, Secure, SameSite=Strict | İyi |
| Şifre saklama | Düz metin karşılaştırma | HTTPS + güçlü şifre ile kabul edilebilir; ileride hash eklenebilir |
| Giriş deneme sınırı | Yok | Brute-force riski — güçlü şifre şart |
| GitHub token | Tam repo yazma yetkisi | Mümkünse fine-grained, sadece bu repo |
| `.env` / token repoda | Olmamalı | `.env.example` sadece şablon |
| Form spam | Honeypot var | Gerekirse Netlify reCAPTCHA açın |

**Acil aksiyon (canlı site zaten yayındaysa):**

1. Netlify’da `ADMIN_PASS` ve `ADMIN_SESSION_SECRET` değerlerini **hemen** güçlü yenilerle değiştirin
2. Eski şifre kaynak kodda varsayılan olarak duruyordu (`1L0veSemerkand`) — bu deploy’dan sonra geçersiz; yine de müşteriye yeni şifre verin
3. GitHub token sızdıysa GitHub’dan token’ı **revoke** edip yenisini oluşturun

---

## Site test listesi (teslim öncesi)

- [ ] Ana sayfa — hero, projeler, witness, experience, iletişim
- [ ] Works — 4 proje kartı, detay sayfaları
- [ ] Blog — kartlar, makale detayı, etiket filtresi (`?tag=`)
- [ ] About — portreler, skill kartları
- [ ] Header CONTACT → `#contact`
- [ ] Form gönder → başarı mesajı → 3 sn sonra ana sayfa
- [ ] Admin giriş → kaydet → sitede güncelleme (1–3 dk deploy)
- [ ] Mobil menü

---

## Teknik özet (müşteriye basit anlatım)

- Site statik; içerik `data/content.json` + GitHub’daki görseller
- Düzenleme: `https://themumine.netlify.app/admin/`
- Kaydet = GitHub’a yazar → Netlify otomatik yeniden yayınlar
- WAMP / PHP gerekmez

Destek için: `README.md` ve `.env.example`
