# Supabase Veritabanı Kurulum Talimatları

Bu dosya, Fikret Petrol Görev Takip Sistemi için Supabase veritabanı tablolarını oluşturmak için gerekli SQL komutlarını içerir.

## 1. Users Tablosu

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('general_manager', 'supervisor', 'shift_supervisor', 'staff')),
  department TEXT NOT NULL CHECK (department IN ('yonetim', 'istasyon', 'muhasebe', 'vardiya')),
  supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index'ler
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_supervisor_id ON users(supervisor_id);
```

## 2. Tasks Tablosu

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  department TEXT NOT NULL CHECK (department IN ('istasyon', 'muhasebe', 'vardiya')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  requires_photo BOOLEAN DEFAULT false NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index'ler
CREATE INDEX idx_tasks_department ON tasks(department);
CREATE INDEX idx_tasks_is_active ON tasks(is_active);
```

## 3. Task Assignments Tablosu

```sql
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  forwarded_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'forwarded', 'in_progress', 'submitted', 'rejected', 'completed')),
  result TEXT CHECK (result IN ('olumlu', 'olumsuz')),
  photo_url TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  staff_notes TEXT,
  supervisor_notes TEXT,
  forwarded_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index'ler
CREATE INDEX idx_task_assignments_assigned_to ON task_assignments(assigned_to);
CREATE INDEX idx_task_assignments_forwarded_to ON task_assignments(forwarded_to);
CREATE INDEX idx_task_assignments_status ON task_assignments(status);
CREATE INDEX idx_task_assignments_assigned_date ON task_assignments(assigned_date);
```

### Mevcut Tabloya attachments Kolonu Eklemek İçin (Migration)

```sql
-- Mevcut tabloya attachments kolonu ekle
ALTER TABLE task_assignments 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
```

## 4. GM Comments Tablosu

```sql
CREATE TABLE gm_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index'ler
CREATE INDEX idx_gm_comments_assignment_id ON gm_comments(assignment_id);
CREATE INDEX idx_gm_comments_created_at ON gm_comments(created_at DESC);
```

## 5. Storage Bucket Oluşturma

Supabase Dashboard'da Storage bölümüne gidin ve:

1. "Create a new bucket" butonuna tıklayın
2. Bucket adı: `task-photos`
3. Public bucket olarak işaretleyin
4. "Create bucket" butonuna tıklayın

### Storage Policies

```sql
-- Public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-photos');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-photos' 
  AND auth.role() = 'authenticated'
);

-- Users can update their own uploads
CREATE POLICY "Users can update own uploads"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'task-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## 6. Row Level Security (RLS) Policies

### Users Tablosu Policies

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read all users
CREATE POLICY "Users can read all users"
ON users FOR SELECT
USING (auth.role() = 'authenticated');

-- Only general managers can insert users
CREATE POLICY "General managers can insert users"
ON users FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'general_manager'
  )
);

-- General managers can update all users, supervisors can update their department staff
CREATE POLICY "Update users policy"
ON users FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND (
      u.role = 'general_manager'
      OR (u.role IN ('supervisor', 'shift_supervisor') AND u.department = users.department)
    )
  )
);
```

### Tasks Tablosu Policies

```sql
-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read tasks
CREATE POLICY "Authenticated users can read tasks"
ON tasks FOR SELECT
USING (auth.role() = 'authenticated');
```

### Task Assignments Tablosu Policies

```sql
-- Enable RLS
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- Users can read assignments related to them
CREATE POLICY "Users can read related assignments"
ON task_assignments FOR SELECT
USING (
  assigned_to = auth.uid()
  OR forwarded_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'general_manager'
  )
);

-- Supervisors can insert assignments
CREATE POLICY "Supervisors can insert assignments"
ON task_assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('supervisor', 'shift_supervisor', 'general_manager')
  )
);

-- Users can update assignments they're involved in
CREATE POLICY "Users can update related assignments"
ON task_assignments FOR UPDATE
USING (
  assigned_to = auth.uid()
  OR forwarded_to = auth.uid()
);
```

### GM Comments Tablosu Policies

```sql
-- Enable RLS
ALTER TABLE gm_comments ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read comments
CREATE POLICY "Authenticated users can read comments"
ON gm_comments FOR SELECT
USING (auth.role() = 'authenticated');

-- Only general managers can insert comments
CREATE POLICY "General managers can insert comments"
ON gm_comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'general_manager'
  )
);
```

## 7. Test Kullanıcıları Ekleme

Kullanıcıları Supabase Auth Dashboard'dan manuel olarak ekleyin ve ardından users tablosuna kayıt ekleyin:

```sql
-- Genel Müdür
INSERT INTO users (id, email, full_name, role, department, is_active)
VALUES ('AUTH_USER_ID', 'genel.mudur@fikretpetrol.com', 'Genel Müdür', 'general_manager', 'yonetim', true);

-- Birim Amirleri
INSERT INTO users (id, email, full_name, role, department, is_active)
VALUES 
  ('AUTH_USER_ID', 'erdinc.sam@fikretpetrol.com', 'Erdinç Sam', 'supervisor', 'istasyon', true),
  ('AUTH_USER_ID', 'dilek.yildirim@fikretpetrol.com', 'Dilek Yıldırım', 'supervisor', 'muhasebe', true);

-- Vardiya Şefleri
INSERT INTO users (id, email, full_name, role, department, is_active)
VALUES 
  ('AUTH_USER_ID', 'orhan.aral@fikretpetrol.com', 'Orhan Aral', 'shift_supervisor', 'vardiya', true),
  ('AUTH_USER_ID', 'tolga.ural@fikretpetrol.com', 'Tolga Ural', 'shift_supervisor', 'vardiya', true),
  ('AUTH_USER_ID', 'aysegul.comuk@fikretpetrol.com', 'Ayşegül Çömük', 'shift_supervisor', 'vardiya', true);

-- Personeller
INSERT INTO users (id, email, full_name, role, department, supervisor_id, is_active)
VALUES 
  ('AUTH_USER_ID', 'istasyon.personel1@fikretpetrol.com', 'İstasyon Personel 1', 'staff', 'istasyon', 'ERDINC_SAM_ID', true),
  ('AUTH_USER_ID', 'istasyon.personel2@fikretpetrol.com', 'İstasyon Personel 2', 'staff', 'istasyon', 'ERDINC_SAM_ID', true),
  ('AUTH_USER_ID', 'muhasebe.personel1@fikretpetrol.com', 'Muhasebe Personel 1', 'staff', 'muhasebe', 'DILEK_YILDIRIM_ID', true),
  ('AUTH_USER_ID', 'muhasebe.personel2@fikretpetrol.com', 'Muhasebe Personel 2', 'staff', 'muhasebe', 'DILEK_YILDIRIM_ID', true),
  ('AUTH_USER_ID', 'vardiya.personel1@fikretpetrol.com', 'Vardiya Personel 1', 'staff', 'vardiya', 'ORHAN_ARAL_ID', true);
```

**Not:** Tüm kullanıcılar için şifre: `Sasmaz2025!`

## 8. Örnek Görev Ekleme

```sql
INSERT INTO tasks (title, description, frequency, department, priority, requires_photo, is_active)
VALUES 
  ('Pompa Kontrolü', 'Tüm pompaların çalışır durumda olduğunu kontrol edin', 'daily', 'istasyon', 'high', true, true),
  ('Kasa Sayımı', 'Günlük kasa sayımını yapın ve kayıt altına alın', 'daily', 'muhasebe', 'high', false, true),
  ('Vardiya Devir Teslim', 'Vardiya devir teslim formunu doldurun', 'daily', 'vardiya', 'medium', false, true);
```

## Kurulum Tamamlandı!

Tüm SQL komutlarını çalıştırdıktan sonra uygulama kullanıma hazır olacaktır.
