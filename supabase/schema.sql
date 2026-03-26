-- =====================================================
-- GrayDocket Database Schema
-- Schema: graydocket
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Create the graydocket schema
-- =====================================================
CREATE SCHEMA IF NOT EXISTS graydocket;

-- Grant usage to authenticated and anon roles so Supabase clients can query
GRANT USAGE ON SCHEMA graydocket TO anon, authenticated, service_role;

-- Grant default privileges so future tables are accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA graydocket
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA graydocket
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;

-- =====================================================
-- Profiles (extends Supabase auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS graydocket.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION graydocket.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO graydocket.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION graydocket.handle_new_user();

-- =====================================================
-- Business Types
-- =====================================================
CREATE TABLE IF NOT EXISTS graydocket.business_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  required_fields JSONB DEFAULT '[]',
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default business types
INSERT INTO graydocket.business_types (name, description, base_price, required_fields) VALUES
  ('Sole Proprietorship', 'For individual entrepreneurs. Register under the Registration of Business Names Act (Form A).', 350.00, 
   '["business_name", "owner_name", "ghana_card", "tin", "email", "phone", "address", "digital_address", "description", "sector", "date_of_commencement"]'),
  ('Company Limited by Shares', 'For teams and investors. Limited liability with share capital under the Companies Act 2019 (Form 3).', 1200.00,
   '["business_name", "directors", "secretary", "shareholders", "stated_capital", "auditor", "beneficial_owner", "constitution", "registered_office"]'),
  ('Company Limited by Guarantee', 'For NGOs, associations, and non-profits. No share capital required (Form 3).', 1200.00,
   '["business_name", "directors", "secretary", "members", "auditor", "beneficial_owner", "constitution", "registered_office"]')
ON CONFLICT DO NOTHING;

-- =====================================================
-- Applications
-- =====================================================
CREATE TABLE IF NOT EXISTS graydocket.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES graydocket.profiles(id) ON DELETE CASCADE,
  business_type_id UUID NOT NULL REFERENCES graydocket.business_types(id),
  tracking_id TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  status TEXT DEFAULT 'submitted' CHECK (status IN (
    'draft', 'submitted', 'name_search', 'under_review', 
    'approved', 'rejected', 'completed', 'cancelled'
  )),
  form_data JSONB DEFAULT '{}',
  total_amount DECIMAL(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  delivery_method TEXT DEFAULT 'digital', -- 'digital', 'courier'
  delivery_address JSONB, -- { street, city, region, digital_address, phone }
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Application Status History
-- =====================================================
CREATE TABLE IF NOT EXISTS graydocket.application_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES graydocket.applications(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  updated_by UUID REFERENCES graydocket.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Services (Value-Added)
-- =====================================================
CREATE TABLE IF NOT EXISTS graydocket.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default services
INSERT INTO graydocket.services (name, description, price, category) VALUES
  ('Domain Name Purchase', 'Purchase a .com or .com.gh domain', 80.00, 'value-added'),
  ('Business Email Setup', 'Professional email address setup', 120.00, 'value-added'),
  ('Business Website', 'Professional one-page website', 500.00, 'value-added'),
  ('Bank Account Setup', 'Business bank account with partner bank', 0.00, 'banking')
ON CONFLICT DO NOTHING;

-- =====================================================
-- Application Services (junction table)
-- =====================================================
CREATE TABLE IF NOT EXISTS graydocket.application_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES graydocket.applications(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES graydocket.services(id),
  price DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Banking Partners
-- =====================================================
CREATE TABLE IF NOT EXISTS graydocket.banking_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  requirements JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed banking partners
INSERT INTO graydocket.banking_partners (name, description, is_active) VALUES
  ('Ghana Commercial Bank', 'Ghana''s premier bank for business accounts', TRUE),
  ('Ecobank Ghana', 'Pan-African banking with digital-first services', TRUE),
  ('Fidelity Bank Ghana', 'SME-focused banking solutions', TRUE),
  ('Stanbic Bank Ghana', 'International banking capabilities', FALSE),
  ('CalBank', 'Tailored business banking packages', TRUE)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Documents
-- =====================================================
CREATE TABLE IF NOT EXISTS graydocket.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES graydocket.applications(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  document_type TEXT DEFAULT 'general',
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Admin helper (SECURITY DEFINER bypasses RLS)
-- This avoids infinite recursion when profiles policies
-- need to check if the current user is an admin.
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM graydocket.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- Row Level Security Policies
-- =====================================================

-- Profiles
ALTER TABLE graydocket.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON graydocket.profiles;
CREATE POLICY "Users can view own profile"
  ON graydocket.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON graydocket.profiles;
CREATE POLICY "Users can update own profile"
  ON graydocket.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON graydocket.profiles;
CREATE POLICY "Admins can view all profiles"
  ON graydocket.profiles FOR SELECT
  USING (public.is_admin());

-- Applications
ALTER TABLE graydocket.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own applications" ON graydocket.applications;
CREATE POLICY "Users can view own applications"
  ON graydocket.applications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own applications" ON graydocket.applications;
CREATE POLICY "Users can insert own applications"
  ON graydocket.applications FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own applications" ON graydocket.applications;
CREATE POLICY "Users can update own applications"
  ON graydocket.applications FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all applications" ON graydocket.applications;
CREATE POLICY "Admins can manage all applications"
  ON graydocket.applications FOR ALL
  USING (public.is_admin());

-- Business Types (public read)
ALTER TABLE graydocket.business_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active business types" ON graydocket.business_types;
CREATE POLICY "Anyone can view active business types"
  ON graydocket.business_types FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can manage business types" ON graydocket.business_types;
CREATE POLICY "Admins can manage business types"
  ON graydocket.business_types FOR ALL
  USING (public.is_admin());

-- Services (public read)
ALTER TABLE graydocket.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active services" ON graydocket.services;
CREATE POLICY "Anyone can view active services"
  ON graydocket.services FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can manage services" ON graydocket.services;
CREATE POLICY "Admins can manage services"
  ON graydocket.services FOR ALL
  USING (public.is_admin());

-- Banking Partners (public read)
ALTER TABLE graydocket.banking_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active banking partners" ON graydocket.banking_partners;
CREATE POLICY "Anyone can view active banking partners"
  ON graydocket.banking_partners FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can manage banking partners" ON graydocket.banking_partners;
CREATE POLICY "Admins can manage banking partners"
  ON graydocket.banking_partners FOR ALL
  USING (public.is_admin());

-- Application Status History
ALTER TABLE graydocket.application_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own application history" ON graydocket.application_status_history;
CREATE POLICY "Users can view own application history"
  ON graydocket.application_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM graydocket.applications 
      WHERE graydocket.applications.id = application_id 
      AND graydocket.applications.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage status history" ON graydocket.application_status_history;
CREATE POLICY "Admins can manage status history"
  ON graydocket.application_status_history FOR ALL
  USING (public.is_admin());

-- Documents
ALTER TABLE graydocket.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own documents" ON graydocket.documents;
CREATE POLICY "Users can view own documents"
  ON graydocket.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM graydocket.applications 
      WHERE graydocket.applications.id = application_id 
      AND graydocket.applications.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can upload own documents" ON graydocket.documents;
CREATE POLICY "Users can upload own documents"
  ON graydocket.documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM graydocket.applications 
      WHERE graydocket.applications.id = application_id 
      AND graydocket.applications.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all documents" ON graydocket.documents;
CREATE POLICY "Admins can manage all documents"
  ON graydocket.documents FOR ALL
  USING (public.is_admin());
