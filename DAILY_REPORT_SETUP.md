# 📧 Günlük Görev Raporu Mail Sistemi Kurulumu

Bu döküman, Genel Müdür'e günlük görev raporu göndermek için gerekli adımları içerir.

## 📋 Genel Bakış

Sistem her gün belirlenen saatte (örn: 18:00) çalışarak:
- O gün atanan görevlerin durumunu kontrol eder
- Tamamlanan, bekleyen ve gecikmeli görevleri listeler
- Genel Müdür'e detaylı bir HTML rapor maili gönderir

## 🔧 Kurulum Adımları

### 1. Resend Hesabı Oluşturma (Ücretsiz)

1. [resend.com](https://resend.com) adresine gidin
2. "Start for free" butonuna tıklayın
3. GitHub veya email ile kayıt olun
4. Dashboard'a giriş yapın
5. Sol menüden "API Keys" seçin
6. "Create API Key" butonuna tıklayın
7. API Key'i kopyalayın (bir kere gösterilir!)

> 💡 Resend ücretsiz planda günde 100 mail gönderebilirsiniz.

### 2. Domain Doğrulama (Opsiyonel ama Önerilen)

Resend Dashboard'da:
1. "Domains" sekmesine gidin
2. "Add Domain" butonuna tıklayın
3. Domain adınızı girin (örn: fikretpetrol.com)
4. DNS kayıtlarını domain sağlayıcınıza ekleyin
5. Doğrulamayı bekleyin

> ⚠️ Domain doğrulaması yapmazsanız, mailler `onboarding@resend.dev` adresinden gönderilir.

### 3. Supabase Edge Function Deploy

#### Supabase CLI Kurulumu

```bash
# macOS
brew install supabase/tap/supabase

# Windows (Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# npm
npm install -g supabase
```

#### Projeye Bağlanma

```bash
# Supabase'e giriş yap
supabase login

# Projeyi bağla (Supabase Dashboard'dan Project ID'yi alın)
supabase link --project-ref YOUR_PROJECT_REF
```

#### Environment Variables Ayarlama

Supabase Dashboard'da:
1. Project Settings > Edge Functions > Secrets
2. Aşağıdaki secret'ları ekleyin:

| Secret Name | Değer |
|-------------|-------|
| `RESEND_API_KEY` | Resend'den aldığınız API key |
| `GM_EMAIL` | Genel Müdür'ün email adresi |

> Not: `SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` otomatik olarak eklenir.

#### Function Deploy

```bash
# Proje klasöründe
supabase functions deploy daily-report
```

### 4. Cron Job Ayarlama (Otomatik Çalıştırma)

#### Seçenek A: Supabase pg_cron (Önerilen)

Supabase SQL Editor'da şu komutu çalıştırın:

```sql
-- pg_cron extension'ı aktifleştir
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Her gün saat 18:00'da (UTC+3 için 15:00 UTC) çalıştır
SELECT cron.schedule(
  'daily-task-report',
  '0 15 * * *',  -- 15:00 UTC = 18:00 Türkiye
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-report',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);

-- Cron job'ları listele
SELECT * FROM cron.job;

-- Cron job'ı silmek için
-- SELECT cron.unschedule('daily-task-report');
```

> ⚠️ `YOUR_PROJECT_REF` ve `YOUR_ANON_KEY` değerlerini Supabase Dashboard'dan alın.

#### Seçenek B: GitHub Actions (Alternatif)

`.github/workflows/daily-report.yml` dosyası oluşturun:

```yaml
name: Daily Task Report

on:
  schedule:
    - cron: '0 15 * * *'  # 18:00 Türkiye saati
  workflow_dispatch:  # Manuel tetikleme için

jobs:
  send-report:
    runs-on: ubuntu-latest
    steps:
      - name: Send Daily Report
        run: |
          curl -X POST \
            'https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-report' \
            -H 'Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}'
```

GitHub Repository Settings > Secrets'a `SUPABASE_ANON_KEY` ekleyin.

#### Seçenek C: cron-job.org (Ücretsiz Harici Servis)

1. [cron-job.org](https://cron-job.org) adresine gidin
2. Ücretsiz hesap oluşturun
3. "Create Cronjob" butonuna tıklayın
4. Ayarlar:
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-report`
   - Schedule: Custom - `0 15 * * *`
   - Request Method: POST
   - Headers: `Authorization: Bearer YOUR_ANON_KEY`

### 5. Manuel Test

Function'ı test etmek için:

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-report' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

Veya Supabase Dashboard > Edge Functions > daily-report > "Invoke" butonu.

## 📧 Mail Örneği

Gönderilen mail şöyle görünür:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 GÜNLÜK GÖREV RAPORU
27 Kasım 2025, Perşembe

📊 ÖZET
• Toplam Görev: 25
• Tamamlanan: 20
• Bekleyen: 3
• Gecikmeli: 2
• Aynı Gün Yapılan: 18
• Olumlu Sonuç: 15
• Olumsuz Sonuç: 5

⚠️ TAMAMLANMAYAN GÖREVLER (3)
• Pompa Kontrolü (Ahmet Yılmaz) - İstasyon
• Kasa Sayımı (Mehmet Demir) - Muhasebe
• Vardiya Devir (Ali Kaya) - Vardiya

🕐 GECİKMELİ GÖREVLER (2)
• Tank Ölçümü (Hasan Öz) - 2 gün gecikme
• Fatura Kontrolü (Ayşe Kara) - 1 gün gecikme

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🔍 Sorun Giderme

### Mail Gelmiyor

1. Resend Dashboard'da "Emails" sekmesini kontrol edin
2. Spam klasörünü kontrol edin
3. Edge Function loglarını kontrol edin:
   ```bash
   supabase functions logs daily-report
   ```

### Function Çalışmıyor

1. Environment variables doğru mu kontrol edin
2. Supabase Dashboard > Edge Functions > Logs

### Cron Çalışmıyor

1. `SELECT * FROM cron.job;` ile job'ı kontrol edin
2. `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;` ile çalışma geçmişini görün

## 📞 Destek

Sorularınız için:
- Supabase Discord: https://discord.supabase.com
- Resend Docs: https://resend.com/docs

---

✅ Kurulum tamamlandığında, Genel Müdür her gün saat 18:00'da günlük görev raporunu alacaktır.

