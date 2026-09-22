-- ============================================================
-- ARYO PORTFOLIO - SUPABASE SCHEMA
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ADMINS (untuk custom JWT auth)
-- ============================================================
DROP TABLE IF EXISTS public.admins CASCADE;
CREATE TABLE public.admins (
  id          BIGSERIAL PRIMARY KEY,
  username    TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL, -- bcrypt hash
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GENERAL (single-row config)
-- ============================================================
DROP TABLE IF EXISTS public.general CASCADE;
CREATE TABLE public.general (
  id                  BIGINT PRIMARY KEY DEFAULT 1,
  status_note         TEXT DEFAULT 'Available for freelance work',
  about_name          TEXT DEFAULT 'Aryo',
  about_title         TEXT,
  about_description   TEXT,
  contact_email       TEXT,
  contact_linkedin    TEXT,
  contact_whatsapp    TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row_general CHECK (id = 1)
);

INSERT INTO public.general (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================
-- CATEGORIES
-- ============================================================
DROP TABLE IF EXISTS public.categories CASCADE;
CREATE TABLE public.categories (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('service','project','pub_cer')),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, type)
);
CREATE INDEX idx_categories_type ON public.categories(type);

-- Seed default categories
INSERT INTO public.categories (name, type, sort_order) VALUES
  ('Web Development', 'service', 1),
  ('Finance & Accounting', 'service', 2),
  ('Property Management', 'service', 3),
  ('IT Solutions', 'project', 1),
  ('Personal Projects', 'project', 2),
  ('Client Works', 'project', 3),
  ('Publication', 'pub_cer', 1),
  ('Certification', 'pub_cer', 2),
  ('Patent', 'pub_cer', 3),
  ('Others', 'pub_cer', 4)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SERVICES
-- ============================================================
DROP TABLE IF EXISTS public.service_gallery CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
CREATE TABLE public.services (
  id                    BIGSERIAL PRIMARY KEY,
  subject               TEXT NOT NULL,
  name                  TEXT NOT NULL,
  category              TEXT NOT NULL,
  description           TEXT NOT NULL,
  detail_description    TEXT,
  icon                  TEXT DEFAULT 'Code2',
  hill_color            TEXT DEFAULT '#65a30d',
  sky_grad              TEXT DEFAULT 'from-sky-100 to-sky-300',
  sheep_x               INTEGER DEFAULT 50,
  sheep_y               INTEGER DEFAULT 130,
  sort_order            INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_services_category ON public.services(category);

CREATE TABLE public.service_gallery (
  id          BIGSERIAL PRIMARY KEY,
  service_id  BIGINT NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_service_gallery_service_id ON public.service_gallery(service_id);

CREATE TABLE public.service_property_details (
  id                 BIGSERIAL PRIMARY KEY,
  service_id         BIGINT NOT NULL UNIQUE REFERENCES public.services(id) ON DELETE CASCADE,
  total_rooms       INTEGER NOT NULL DEFAULT 0,
  available_rooms   INTEGER NOT NULL DEFAULT 0,
  headline          TEXT,
  description       TEXT,
  info_text         TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_service_property_details_service_id ON public.service_property_details(service_id);

CREATE TABLE public.service_property_rooms (
  id          BIGSERIAL PRIMARY KEY,
  service_id  BIGINT NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  room_name   TEXT,
  status      TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'maintenance')),
  image_url   TEXT,
  image_urls  TEXT[] DEFAULT '{}',
  note        TEXT,
  price       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_service_property_rooms_service_id ON public.service_property_rooms(service_id);
CREATE INDEX idx_service_property_rooms_status ON public.service_property_rooms(status);

-- ============================================================
-- PROJECTS
-- ============================================================
DROP TABLE IF EXISTS public.project_gallery CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
CREATE TABLE public.projects (
  id                  BIGSERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
  it_sub_category     TEXT,
  description         TEXT NOT NULL,
  tags                TEXT[] DEFAULT '{}',
  sky_grad            TEXT DEFAULT 'from-sky-200 to-sky-400',
  hill_colors         TEXT[] DEFAULT ARRAY['#a3e635','#65a30d'],
  sort_order          INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_projects_category ON public.projects(category);
CREATE INDEX idx_projects_tags ON public.projects USING GIN (tags);

CREATE TABLE public.project_gallery (
  id          BIGSERIAL PRIMARY KEY,
  project_id  BIGINT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_project_gallery_project_id ON public.project_gallery(project_id);

-- ============================================================
-- PUB_CER (Publications & Certifications)
-- ============================================================
DROP TABLE IF EXISTS public.pub_cer CASCADE;
CREATE TABLE public.pub_cer (
  id                  BIGSERIAL PRIMARY KEY,
  type                TEXT NOT NULL,
  date                TEXT NOT NULL,
  name                TEXT NOT NULL,
  id_journal_issuer   TEXT,
  url                 TEXT,
  sort_order          INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pub_cer_type ON public.pub_cer(type);

-- ============================================================
-- MESSAGES (Contact form)
-- ============================================================
DROP TABLE IF EXISTS public.messages CASCADE;
CREATE TABLE public.messages (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  subject     TEXT,
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_is_read ON public.messages(is_read);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO NOTHING;

-- Policies untuk bucket 'portfolio'
DROP POLICY IF EXISTS "portfolio_public_read" ON storage.objects;
CREATE POLICY "portfolio_public_read"
ON storage.objects FOR SELECT
USING ( bucket_id = 'portfolio' );

DROP POLICY IF EXISTS "portfolio_admin_insert" ON storage.objects;
CREATE POLICY "portfolio_admin_insert"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'portfolio' );

DROP POLICY IF EXISTS "portfolio_admin_delete" ON storage.objects;
CREATE POLICY "portfolio_admin_delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'portfolio' );

-- ============================================================
-- TRIGGERS untuk updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_general_updated_at
  BEFORE UPDATE ON public.general
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- SEED DEFAULT ADMIN
-- Username: admin
-- Password: admin123  ← GANTI setelah login pertama!
-- Bcrypt hash dari 'admin123' (cost 10):
-- ============================================================
INSERT INTO public.admins (username, password) VALUES
  ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
ON CONFLICT (username) DO NOTHING;
-- Hash di atas adalah hash bcrypt untuk 'admin123'
-- Untuk generate ulang, pakai script: bcrypt.hashSync('yourpassword', 10)
