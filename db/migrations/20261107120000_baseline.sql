-- migrate:up

-- ============================================================
-- Baseline schema on Neon. It squashes supabase/migrations/* as they stood on 2026-11-07, with
-- the Supabase-only parts taken out or replaced:
--
--   - Users live in neon_auth."user" (Neon Auth, Managed Better Auth), not auth.users. The
--     neon_auth schema belongs to Neon: we reference it and put triggers on it, but never alter it.
--   - No RLS. The backend connects as the database owner and filters every query by the user_id
--     from the verified JWT; nothing else talks to these tables.
--   - No storage policies. Files are in Neon Object Storage, reached only by the backend.
--   - The demo flag is a row in demo_users rather than app_metadata.demo.
-- ============================================================


-- ------------------------------------------------------------
-- Applications
-- ------------------------------------------------------------

CREATE TYPE public.application_status AS ENUM (
  'Applied',
  'Interviewing',
  'Unlikely',
  'Offer',
  'Rejected',
  'Role Eliminated'
);

CREATE TABLE public.applications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
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
  status              public.application_status NOT NULL DEFAULT 'Applied',
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_applications_user_id ON public.applications(user_id);
CREATE INDEX idx_applications_user_status ON public.applications(user_id, status);
CREATE INDEX idx_applications_user_date ON public.applications(user_id, date_applied DESC);

CREATE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ------------------------------------------------------------
-- Status history. A NULL old_status marks creation.
-- ------------------------------------------------------------

CREATE TABLE public.application_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  old_status      TEXT,
  new_status      TEXT NOT NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_automatic    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_status_history_application_id ON public.application_status_history(application_id);
CREATE INDEX idx_status_history_changed_at ON public.application_status_history(changed_at DESC);


-- ------------------------------------------------------------
-- Per-user preferences, one row per user. A user without a row has the defaults.
-- unlikely_after_days: how long an application can sit in Applied before the nightly job moves
-- it to Unlikely. NULL means never.
-- ------------------------------------------------------------

CREATE TABLE public.user_settings (
  user_id              UUID PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  unlikely_after_days  SMALLINT DEFAULT 14 CHECK (unlikely_after_days IN (7, 14, 21, 30, 60)),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ------------------------------------------------------------
-- The public demo account: any user with a row here. Only the database owner writes it, so a
-- user can't make themselves one, or stop being one.
--
-- Setup on a branch, once: sign the demo user up, then
--   INSERT INTO public.demo_users (user_id) SELECT id FROM neon_auth."user" WHERE email = '…';
--   SELECT public.reset_demo_data();
-- To change its credentials later, delete its demo_users row first: the guard below undoes
-- changes while it's there.
-- ------------------------------------------------------------

CREATE TABLE public.demo_users (
  user_id  UUID PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE CASCADE
);


-- reset_demo_data(): puts every demo account back to the sample data. The backend calls it
-- nightly (before the Unlikely move) and the dev seed calls it. Dates are relative to now(), so
-- the data stays current; one Applied row is 20 days old, so the nightly move picks it up.
-- Companies and URLs are fictional; the one logo URL uses the reserved .invalid domain so the
-- initials fallback shows. Uploads are off for demo accounts, so there are no files to remove.
CREATE FUNCTION public.reset_demo_data()
RETURNS integer AS $$
DECLARE
  demo_id uuid;
  reset_count integer := 0;
BEGIN
  FOR demo_id IN SELECT user_id FROM public.demo_users
  LOOP
    -- Status history goes with its applications (ON DELETE CASCADE)
    DELETE FROM public.applications WHERE user_id = demo_id;
    DELETE FROM public.user_settings WHERE user_id = demo_id;

    WITH inserted AS (
      INSERT INTO public.applications (
        user_id, job_post_url, job_title, company, company_logo_url, industry,
        compensation, is_referral, date_applied, status, notes, created_at
      )
      SELECT demo_id, a.job_post_url, a.job_title, a.company, a.company_logo_url, a.industry,
        a.compensation, a.is_referral, current_date - a.days_ago, a.status::public.application_status, a.notes, now() - make_interval(days => a.days_ago)
      FROM (VALUES
        ('https://jobs.example.com/northwind-labs/senior-product-designer', 'Senior Product Designer', 'Northwind Labs',
         NULL, 'Software', '$150k - $170k', true, 3, 'Applied',
         'Referred by a former teammate. Follow up after a week.'),
        ('https://jobs.example.com/halcyon-health/frontend-engineer', 'Frontend Engineer', 'Halcyon Health',
         NULL, 'Healthcare', '$130k - $150k', false, 8, 'Applied', NULL),
        ('https://jobs.example.com/brightline-transit/ux-engineer', 'UX Engineer', 'Brightline Transit',
         NULL, 'Transportation', NULL, false, 20, 'Applied', NULL),
        ('https://jobs.example.com/fernway/design-engineer', 'Design Engineer', 'Fernway',
         NULL, 'Software', '$140k - $160k', false, 18, 'Interviewing', NULL),
        ('https://jobs.example.com/quarry-analytics/senior-frontend-engineer', 'Senior Frontend Engineer', 'Quarry Analytics',
         'https://logos.example.invalid/quarry-analytics.png', 'Data and analytics', '$165k - $185k', false, 12, 'Interviewing',
         'Technical screen went well; take-home due Friday.'),
        ('https://jobs.example.com/lumen-and-co/product-designer', 'Product Designer', 'Lumen & Co',
         NULL, 'Retail', '$125k - $140k', true, 40, 'Offer', NULL),
        ('https://jobs.example.com/tidewater-bank/ui-engineer', 'UI Engineer', 'Tidewater Bank',
         NULL, 'Finance', '$120k - $135k', false, 35, 'Rejected', NULL),
        ('https://jobs.example.com/orchard-games/frontend-developer', 'Frontend Developer', 'Orchard Games',
         NULL, 'Gaming', '$55/hr', false, 25, 'Rejected', NULL),
        ('https://jobs.example.com/kestrel-robotics/design-systems-engineer', 'Design Systems Engineer', 'Kestrel Robotics',
         NULL, 'Robotics', '$155k - $175k', false, 45, 'Role Eliminated', NULL),
        ('https://jobs.example.com/saltmarsh-media/web-developer', 'Web Developer', 'Saltmarsh Media',
         NULL, 'Media', NULL, false, 50, 'Unlikely', NULL)
      ) AS a (job_post_url, job_title, company, company_logo_url, industry, compensation, is_referral, days_ago, status, notes)
      RETURNING id, company
    )
    INSERT INTO public.application_status_history (application_id, user_id, old_status, new_status, changed_at, is_automatic)
    SELECT inserted.id, demo_id, h.old_status, h.new_status, now() - make_interval(days => h.days_ago), h.is_automatic
    FROM (VALUES
      ('Northwind Labs',     NULL,           'Applied',          3, false),
      ('Halcyon Health',     NULL,           'Applied',          8, false),
      ('Brightline Transit', NULL,           'Applied',         20, false),
      ('Fernway',            NULL,           'Applied',         18, false),
      ('Fernway',            'Applied',      'Interviewing',    10, false),
      ('Quarry Analytics',   NULL,           'Applied',         12, false),
      ('Quarry Analytics',   'Applied',      'Interviewing',     5, false),
      ('Lumen & Co',         NULL,           'Applied',         40, false),
      ('Lumen & Co',         'Applied',      'Interviewing',    30, false),
      ('Lumen & Co',         'Interviewing', 'Offer',            7, false),
      ('Tidewater Bank',     NULL,           'Applied',         35, false),
      ('Tidewater Bank',     'Applied',      'Rejected',        21, false),
      ('Orchard Games',      NULL,           'Applied',         25, false),
      ('Orchard Games',      'Applied',      'Interviewing',    18, false),
      ('Orchard Games',      'Interviewing', 'Rejected',         9, false),
      ('Kestrel Robotics',   NULL,           'Applied',         45, false),
      ('Kestrel Robotics',   'Applied',      'Interviewing',    38, false),
      ('Kestrel Robotics',   'Interviewing', 'Role Eliminated', 30, false),
      ('Saltmarsh Media',    NULL,           'Applied',         50, false),
      ('Saltmarsh Media',    'Applied',      'Unlikely',        36, true)
    ) AS h (company, old_status, new_status, days_ago, is_automatic)
    JOIN inserted USING (company);

    reset_count := reset_count + 1;
  END LOOP;

  RETURN reset_count;
END;
$$ LANGUAGE plpgsql SET search_path = '';


-- ------------------------------------------------------------
-- The guard: the demo's profile and password can't change while it's flagged, whoever asks.
-- Settings hides those forms, but Neon Auth's /update-user and /change-password are one devtools
-- call away. Changes are undone rather than refused, so Auth's own writes never fail a sign-in.
-- (Neon Auth doesn't allow email changes at all.) Deleting the account is refused by the backend.
--
-- These triggers sit on Neon-owned tables. SECURITY DEFINER lets them read demo_users when the
-- neon_auth role does the update.
-- ------------------------------------------------------------

CREATE FUNCTION public.keep_demo_user_fixed()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.demo_users WHERE user_id = OLD.id) THEN
    NEW.name := OLD.name;
    NEW.email := OLD.email;
    NEW.image := OLD.image;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER keep_demo_user_fixed
  BEFORE UPDATE ON neon_auth."user"
  FOR EACH ROW EXECUTE FUNCTION public.keep_demo_user_fixed();

CREATE FUNCTION public.keep_demo_password_fixed()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.demo_users WHERE user_id = OLD."userId") THEN
    NEW.password := OLD.password;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER keep_demo_password_fixed
  BEFORE UPDATE ON neon_auth.account
  FOR EACH ROW EXECUTE FUNCTION public.keep_demo_password_fixed();

REVOKE EXECUTE ON FUNCTION public.reset_demo_data() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.keep_demo_user_fixed() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.keep_demo_password_fixed() FROM PUBLIC;


-- migrate:down

DROP TRIGGER IF EXISTS keep_demo_password_fixed ON neon_auth.account;
DROP TRIGGER IF EXISTS keep_demo_user_fixed ON neon_auth."user";
DROP FUNCTION IF EXISTS public.keep_demo_password_fixed();
DROP FUNCTION IF EXISTS public.keep_demo_user_fixed();
DROP FUNCTION IF EXISTS public.reset_demo_data();
DROP TABLE IF EXISTS public.demo_users;
DROP TABLE IF EXISTS public.user_settings;
DROP TABLE IF EXISTS public.application_status_history;
DROP TABLE IF EXISTS public.applications;
DROP FUNCTION IF EXISTS public.set_updated_at();
DROP TYPE IF EXISTS public.application_status;
