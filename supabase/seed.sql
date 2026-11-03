-- ============================================================
-- Synthetic seed for local development, CI and E2E tests.
--
-- Loaded by `supabase start` and `supabase db reset` (never by
-- `supabase db push`, so it doesn't reach production). A local
-- data dump in seed.local.sql, if present, loads after this file.
--
-- Demo login: demo@example.com / demo-password
--
-- Dates are relative to now(), so the data stays current. One
-- Applied row is older than 14 days, so the nightly job moves it
-- to Unlikely. Companies and URLs are fictional; the one logo URL
-- uses the reserved .invalid domain so the initials fallback shows.
-- ============================================================

-- Storage bucket for résumé and cover-letter uploads, with the policies
-- 001_initial_schema.sql describes (migrations don't create either)
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-files', 'application-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users_select_own_files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING ((storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "users_insert_own_files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK ((storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "users_delete_own_files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING ((storage.foldername(name))[1] = auth.uid()::text);


-- ------------------------------------------------------------
-- Demo user. GoTrue expects the token columns to be '' rather
-- than NULL, and an email identity to sign in with a password.
-- ------------------------------------------------------------

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous,
  created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated',
  'demo@example.com',
  extensions.crypt('demo-password', extensions.gen_salt('bf')),
  now() - interval '60 days',
  '', '', '', '', '', '', '', '',
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false, false, false,
  now() - interval '60 days', now() - interval '60 days'
);

INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
VALUES (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '{"sub": "00000000-0000-4000-8000-000000000001", "email": "demo@example.com", "email_verified": true}',
  'email',
  now() - interval '60 days', now() - interval '60 days'
);


-- ------------------------------------------------------------
-- Applications: every status, plus a referral, notes, a broken
-- logo and a stale Applied row.
-- ------------------------------------------------------------

INSERT INTO public.applications (
  id, user_id, job_post_url, job_title, company, company_logo_url, industry,
  compensation, is_referral, date_applied, status, notes, created_at
) VALUES
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001',
   'https://jobs.example.com/northwind-labs/senior-product-designer', 'Senior Product Designer', 'Northwind Labs',
   NULL, 'Software', '$150k - $170k', true, current_date - 3, 'Applied',
   'Referred by a former teammate. Follow up after a week.', now() - interval '3 days'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001',
   'https://jobs.example.com/halcyon-health/frontend-engineer', 'Frontend Engineer', 'Halcyon Health',
   NULL, 'Healthcare', '$130k - $150k', false, current_date - 8, 'Applied',
   NULL, now() - interval '8 days'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001',
   'https://jobs.example.com/brightline-transit/ux-engineer', 'UX Engineer', 'Brightline Transit',
   NULL, 'Transportation', NULL, false, current_date - 20, 'Applied',
   NULL, now() - interval '20 days'),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001',
   'https://jobs.example.com/fernway/design-engineer', 'Design Engineer', 'Fernway',
   NULL, 'Software', '$140k - $160k', false, current_date - 18, 'Interviewing',
   NULL, now() - interval '18 days'),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000001',
   'https://jobs.example.com/quarry-analytics/senior-frontend-engineer', 'Senior Frontend Engineer', 'Quarry Analytics',
   'https://logos.example.invalid/quarry-analytics.png', 'Data and analytics', '$165k - $185k', false, current_date - 12, 'Interviewing',
   'Technical screen went well; take-home due Friday.', now() - interval '12 days'),
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000001',
   'https://jobs.example.com/lumen-and-co/product-designer', 'Product Designer', 'Lumen & Co',
   NULL, 'Retail', '$125k - $140k', true, current_date - 40, 'Offer',
   NULL, now() - interval '40 days'),
  ('00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000001',
   'https://jobs.example.com/tidewater-bank/ui-engineer', 'UI Engineer', 'Tidewater Bank',
   NULL, 'Finance', '$120k - $135k', false, current_date - 35, 'Rejected',
   NULL, now() - interval '35 days'),
  ('00000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000001',
   'https://jobs.example.com/orchard-games/frontend-developer', 'Frontend Developer', 'Orchard Games',
   NULL, 'Gaming', '$55/hr', false, current_date - 25, 'Rejected',
   NULL, now() - interval '25 days'),
  ('00000000-0000-4000-8000-000000000109', '00000000-0000-4000-8000-000000000001',
   'https://jobs.example.com/kestrel-robotics/design-systems-engineer', 'Design Systems Engineer', 'Kestrel Robotics',
   NULL, 'Robotics', '$155k - $175k', false, current_date - 45, 'Role Eliminated',
   NULL, now() - interval '45 days'),
  ('00000000-0000-4000-8000-000000000110', '00000000-0000-4000-8000-000000000001',
   'https://jobs.example.com/saltmarsh-media/web-developer', 'Web Developer', 'Saltmarsh Media',
   NULL, 'Media', NULL, false, current_date - 50, 'Unlikely',
   NULL, now() - interval '50 days');


-- ------------------------------------------------------------
-- Status history: a NULL old_status marks creation; the Unlikely
-- move is automatic, as the nightly job records it.
-- ------------------------------------------------------------

INSERT INTO public.application_status_history (application_id, user_id, old_status, new_status, changed_at, is_automatic)
SELECT h.application_id::uuid, '00000000-0000-4000-8000-000000000001', h.old_status, h.new_status, now() - h.ago, h.is_automatic
FROM (VALUES
  ('00000000-0000-4000-8000-000000000101', NULL,           'Applied',         interval '3 days',  false),
  ('00000000-0000-4000-8000-000000000102', NULL,           'Applied',         interval '8 days',  false),
  ('00000000-0000-4000-8000-000000000103', NULL,           'Applied',         interval '20 days', false),
  ('00000000-0000-4000-8000-000000000104', NULL,           'Applied',         interval '18 days', false),
  ('00000000-0000-4000-8000-000000000104', 'Applied',      'Interviewing',    interval '10 days', false),
  ('00000000-0000-4000-8000-000000000105', NULL,           'Applied',         interval '12 days', false),
  ('00000000-0000-4000-8000-000000000105', 'Applied',      'Interviewing',    interval '5 days',  false),
  ('00000000-0000-4000-8000-000000000106', NULL,           'Applied',         interval '40 days', false),
  ('00000000-0000-4000-8000-000000000106', 'Applied',      'Interviewing',    interval '30 days', false),
  ('00000000-0000-4000-8000-000000000106', 'Interviewing', 'Offer',           interval '7 days',  false),
  ('00000000-0000-4000-8000-000000000107', NULL,           'Applied',         interval '35 days', false),
  ('00000000-0000-4000-8000-000000000107', 'Applied',      'Rejected',        interval '21 days', false),
  ('00000000-0000-4000-8000-000000000108', NULL,           'Applied',         interval '25 days', false),
  ('00000000-0000-4000-8000-000000000108', 'Applied',      'Interviewing',    interval '18 days', false),
  ('00000000-0000-4000-8000-000000000108', 'Interviewing', 'Rejected',        interval '9 days',  false),
  ('00000000-0000-4000-8000-000000000109', NULL,           'Applied',         interval '45 days', false),
  ('00000000-0000-4000-8000-000000000109', 'Applied',      'Interviewing',    interval '38 days', false),
  ('00000000-0000-4000-8000-000000000109', 'Interviewing', 'Role Eliminated', interval '30 days', false),
  ('00000000-0000-4000-8000-000000000110', NULL,           'Applied',         interval '50 days', false),
  ('00000000-0000-4000-8000-000000000110', 'Applied',      'Unlikely',        interval '36 days', true)
) AS h (application_id, old_status, new_status, ago, is_automatic);
