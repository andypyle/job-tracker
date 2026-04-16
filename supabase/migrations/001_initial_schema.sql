-- ============================================================
-- Job Application Tracker — Initial Schema
-- 001_initial_schema.sql
--
-- Creates:
--   - application_status enum
--   - applications table
--   - updated_at trigger
--   - RLS policies (users access only their own rows)
--   - Indexes on user_id, (user_id, status), (user_id, date_applied DESC)
--
-- NOTE: Storage bucket "application-files" cannot be created via SQL
-- migration. It must be created via the Supabase dashboard or CLI.
-- See storage notes at the bottom of this file.
-- ============================================================


-- ============================================================
-- 19.1: Status enum
-- ============================================================

CREATE TYPE application_status AS ENUM (
  'Applied',
  'Interviewing',
  'Unlikely',
  'Offer',
  'Rejected',
  'Role Eliminated'
);


-- ============================================================
-- 19.2: Applications table
-- ============================================================

CREATE TABLE applications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_post_url        TEXT,
  job_title           TEXT NOT NULL,
  company             TEXT NOT NULL,
  company_logo_url    TEXT,
  industry            TEXT,
  compensation        TEXT,
  is_referral         BOOLEAN NOT NULL DEFAULT FALSE,
  resume_path         TEXT,
  cover_letter_path   TEXT,
  date_applied        DATE NOT NULL,
  status              application_status NOT NULL DEFAULT 'Applied',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 19.3: updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 19.4: Row Level Security
-- ============================================================

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own ON applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY insert_own ON applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY update_own ON applications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY delete_own ON applications
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- 19.5: Indexes
-- ============================================================

CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_user_status ON applications(user_id, status);
CREATE INDEX idx_applications_user_date ON applications(user_id, date_applied DESC);


-- ============================================================
-- Storage bucket (manual step — cannot be done via SQL migration)
--
-- Bucket name : application-files
-- Type        : private
-- Path format : {user_id}/{application_id}/resume.pdf
--               {user_id}/{application_id}/cover_letter.pdf
--
-- RLS policies to create in Supabase dashboard or via CLI:
--
--   SELECT policy:
--     (storage.foldername(name))[1] = auth.uid()::text
--
--   INSERT policy:
--     (storage.foldername(name))[1] = auth.uid()::text
--
--   DELETE policy:
--     (storage.foldername(name))[1] = auth.uid()::text
--
-- The backend uses the service role key for uploads, which bypasses
-- Storage RLS. The RLS policies above protect direct Supabase client
-- access from the browser (which is not used in this app, but is
-- good security hygiene).
-- ============================================================
