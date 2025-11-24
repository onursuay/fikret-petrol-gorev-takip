# Vercel Deployment Guide - Fikret Petrol Görev Takip Sistemi

Bu dokümantasyon, projeyi Vercel'de nasıl deploy edeceğinizi adım adım anlatmaktadır.

## ⚠️ Önemli Not

Bu branch (`vercel-deployment`) Vercel deployment için özel olarak hazırlanmıştır. **Ana proje (`main` branch) Manus platformunda çalışmaktadır.**

## 📋 Ön Gereksinimler

1. [Vercel hesabı](https://vercel.com/signup)
2. [Supabase hesabı](https://supabase.com) (Database için)
3. GitHub repository bağlantısı

## 🚀 Deployment Adımları

### 1. Supabase Projesi Oluşturma

1. [Supabase Dashboard](https://app.supabase.com)'a gidin
2. "New Project" butonuna tıklayın
3. Proje adı: `fikret-petrol-gorev-takip`
4. Database şifresini kaydedin
5. Region: `Southeast Asia (Singapore)` (en yakın)

### 2. Supabase Database Schema Oluşturma

Supabase SQL Editor'de şu SQL komutlarını çalıştırın:

```sql
-- Users tablosu
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  "openId" VARCHAR(64) UNIQUE NOT NULL,
  name TEXT,
  email VARCHAR(320),
  "loginMethod" VARCHAR(64),
  role VARCHAR(20) DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'admin', 'general_manager', 'supervisor', 'shift_supervisor', 'staff')),
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "lastSignedIn" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Departments tablosu
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tasks tablosu
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  "departmentId" INTEGER REFERENCES departments(id),
  "assignedTo" INTEGER REFERENCES users(id),
  "createdBy" INTEGER REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'approved', 'rejected')),
  "requiresPhoto" BOOLEAN DEFAULT false,
  "photoUrl" TEXT,
  "dueDate" TIMESTAMP,
  "completedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Comments tablosu
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  "taskId" INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  "userId" INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_tasks_assigned_to ON tasks("assignedTo");
CREATE INDEX idx_tasks_department ON tasks("departmentId");
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_comments_task ON comments("taskId");
```

### 3. Supabase Authentication Ayarları

1. Supabase Dashboard → Authentication → Settings
2. "Email Auth" aktif edin
3. "Confirm email" seçeneğini kapatın (development için)
4. Site URL: `https://your-project.vercel.app` (deployment sonrası güncelleyin)

### 4. Environment Variables

Supabase Dashboard'dan şu bilgileri alın:

- Project Settings → API → Project URL → `VITE_SUPABASE_URL`
- Project Settings → API → anon public → `VITE_SUPABASE_ANON_KEY`
- Project Settings → Database → Connection String → `DATABASE_URL`

### 5. Vercel'de Deployment

#### GitHub üzerinden:

1. [Vercel Dashboard](https://vercel.com/dashboard)'a gidin
2. "Add New" → "Project" tıklayın
3. GitHub repository'nizi seçin: `fikret-petrol-gorev-takip`
4. **Branch seçimi:** `vercel-deployment` ← ÖNEMLİ!
5. "Configure Project" ekranında:

**Build & Development Settings:**
- Framework Preset: `Other`
- Build Command: `pnpm vercel-build`
- Output Directory: `client/dist`
- Install Command: `pnpm install`

**Environment Variables** ekleyin:

```
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project.supabase.co:5432/postgres

# App
VITE_APP_TITLE=Fikret Petrol Görev Takip Sistemi
VITE_APP_LOGO=/fikret-petrol-logo.png
NODE_ENV=production
```

6. "Deploy" butonuna tıklayın

### 6. İlk Kullanıcı Oluşturma

Deployment tamamlandıktan sonra:

1. Sitenize gidin: `https://your-project.vercel.app`
2. Login sayfasında email ve şifre ile kayıt olun
3. Supabase Dashboard → Table Editor → users tablosuna gidin
4. Oluşturulan kullanıcının `role` alanını `general_manager` olarak güncelleyin

```sql
UPDATE users 
SET role = 'general_manager' 
WHERE email = 'your-email@example.com';
```

## 🔧 Deployment Sonrası Ayarlar

### Domain Bağlama (Opsiyonel)

1. Vercel Dashboard → Project Settings → Domains
2. Custom domain ekleyin (örn: `gorev.fikretpetrol.com`)
3. DNS kayıtlarını güncelleyin

### Supabase Site URL Güncelleme

1. Supabase Dashboard → Authentication → URL Configuration
2. Site URL'i Vercel domain'iniz ile güncelleyin
3. Redirect URLs'e Vercel domain'inizi ekleyin

## 📊 Veritabanı Yönetimi

### Drizzle Studio (Lokal)

```bash
pnpm db:studio
```

### Supabase Dashboard

https://app.supabase.com → Project → Table Editor

## 🐛 Sorun Giderme

### Build Hatası

```bash
# Lokal olarak test edin
pnpm vercel-build
```

### Database Bağlantı Hatası

- `DATABASE_URL` environment variable'ını kontrol edin
- Supabase project'in aktif olduğundan emin olun
- Connection pooling ayarlarını kontrol edin

### Authentication Çalışmıyor

- Supabase Email Auth aktif mi?
- `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` doğru mu?
- Site URL Vercel domain'i ile eşleşiyor mu?

## 📝 Notlar

- **Main branch:** Manus platformu için (orijinal)
- **Vercel-deployment branch:** Vercel için (bu branch)
- Her iki branch de aynı Supabase database'i kullanabilir
- Environment variables her platformda ayrı ayrı ayarlanmalıdır

## 🔄 Güncelleme

Yeni değişiklikler için:

```bash
git checkout vercel-deployment
# Değişikliklerinizi yapın
git add .
git commit -m "Update: description"
git push origin vercel-deployment
```

Vercel otomatik olarak yeni deployment başlatacaktır.

## 📞 Destek

Sorun yaşarsanız:
1. Vercel deployment logs'ları kontrol edin
2. Supabase logs'ları kontrol edin
3. Browser console'da hata mesajlarını kontrol edin

---

**Başarılar! 🚀**
