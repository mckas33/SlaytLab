# SlaytLab — Kimlik doğrulama ve e-posta kurulumu

Kod tamamlanmış olsa bile e-posta gönderimi ve hesap silme **Supabase Dashboard** ayarları olmadan production’da çalışmaz.

## Ortam değişkenleri

`.env.example` dosyasını `.env.local` olarak kopyala:

| Değişken | Açıklama |
|----------|----------|
| `VITE_SUPABASE_URL` | Proje API URL |
| `VITE_SUPABASE_ANON_KEY` | Anon key (service_role asla istemciye konmaz) |
| `VITE_SITE_URL` | Production kanonik adres (örn. `https://senin-domainin.com`) |

## Supabase Auth ayarları

1. **Authentication → Providers → Email**: Enable.
2. **Confirm email**: Açık tut (doğrulanmamış girişler engellenir).
3. **Authentication → URL Configuration**:
   - Site URL: production adresi (`VITE_SITE_URL` ile aynı).
   - Redirect URLs allow list:
     - `http://localhost:5173/**`
     - `http://localhost:5173/?flow=email-confirm`
     - `http://localhost:5173/?flow=password-reset`
     - `https://SENIN-DOMAININ.com/**`
     - `https://SENIN-DOMAININ.com/?flow=email-confirm`
     - `https://SENIN-DOMAININ.com/?flow=password-reset`
4. **Password requirements** (Authentication → Settings / Policies):
   - Minimum length: **8**
   - Mümkünse büyük harf, rakam ve özel karakter zorunluluklarını aç.
   - Uygulama istemci + `signUp`/`updateUser` öncesi aynı kuralları uygular; Dashboard kuralları daha zayıf bırakılmamalı.

## E-posta şablonları

Ücretsiz yol: Supabase yerleşik Auth e-postaları (ücretsiz kota sınırlı; aşımda gönderim gecikebilir veya durabilir).

1. Authentication → Email Templates
2. Şablon dosyalarını yapıştır:
   - `supabase/email-templates/confirm-signup.html` → Confirm signup
   - `supabase/email-templates/reset-password.html` → Reset password
   - `supabase/email-templates/change-email.html` → Change email address
3. Subject örnekleri (Türkçe):
   - `SlaytLab — E-posta adresini doğrula`
   - `SlaytLab — Şifre sıfırlama`
   - `SlaytLab — E-posta değişikliğini onayla`
4. Düz metin sürümü: HTML’deki cümleleri Subject altında Plain text alanına da ekle; bağlantı olarak `{{ .ConfirmationURL }}` bırak.

Özel SMTP (isteğe bağlı, ücretsiz katmanlar sınırlı): Resend / Brevo / Gmail SMTP — Authentication → SMTP Settings. DNS (SPF/DKIM) olmadan teslimat zayıf kalır.

## Hesap silme

`supabase/migrations/20260328_auth_account_helpers.sql` dosyasını SQL Editor’de çalıştır.

Profil → Hesabı sil:

1. Kullanıcı şifresiyle yeniden kimlik doğrular.
2. `delete_own_account` RPC, kullanıcının `slides` satırlarını ve `auth.users` kaydını tek veritabanı çağrısında siler.

İlişkili images/regions/questions kayıtları için gerekli foreign key cascade davranışını production öncesinde doğrula. RPC hatayla sonlanırsa veritabanı işlemi geri alınır; istemci önceden ayrı bir içerik silme isteği göndermez.

## Hız sınırları

- Uygulama: doğrulama yeniden gönderiminde 30 sn cooldown.
- Sunucu: Supabase `over_email_send_rate_limit` / `over_request_rate_limit` Türkçe mesaja çevrilir.

## Ücretsiz sınırlar (özet)

- Supabase Free: Auth e-posta kotası, proje pause riski, paylaşılmış kaynaklar.
- Harici AI API yok; soru üretimi kullanıcı tarafında yapılır, SlaytLab yalnızca JSON içe aktarır.
