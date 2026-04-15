-- ============================================================
-- Job Application Tracker — Initial Schema
-- Creates: application_status enum, applications table,
--          updated_at trigger, RLS policies, indexes
-- ============================================================

-- ============================================================
-- Enum
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
-- Table
-- ============================================================

CREATE TABLE applications (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_post_url      TEXT,
  job_title         TEXT        NOT NULL,
  company           TEXT        NOT NULL,
  company_logo_url  TEXT,
  industry          TEXT,
  compensation      TEXT,
  is_referral       BOOLEAN     NOT NULL DEFAULT FALSE,
  resume_path       TEXT,
  cover_letter_path TEXT,
  date_applied      DATE        NOT NULL,
  status            application_status NOT NULL DEFAULT 'Applied',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
  ON applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own"
  ON applications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own"
  ON applications FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_applications_user_id
  ON applications(user_id);

CREATE INDEX idx_applications_user_status
  ON applications(user_id, status);

CREATE INDEX idx_applications_user_date
  ON applications(user_id, date_applied DESC);

-- ============================================================
-- Storage bucket
-- Storage bucket and its RLS policies must be created via
-- the Supabase dashboard or CLI separately — see notes below.
--
-- Bucket name: application-files
-- Bucket type: private
-- Path convention: {user_id}/{application_id}/resume.pdf
--                  {user_id}/{application_id}/cover_letter.pdf
--
-- RLS policies to add in the dashboard:
--   SELECT: (storage.foldername(name))[1] = auth.uid()::text
--   INSERT: (storage.foldername(name))[1] = auth.uid()::text
--   DELETE: (storage.foldername(name))[1] = auth.uid()::text
-- ============================================================