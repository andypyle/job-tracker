-- ============================================================
-- Synthetic seed for local development, CI and E2E tests.
--
-- Loaded by `supabase start` and `supabase db reset` (never by
-- `supabase db push`, so it doesn't reach production). A local
-- data dump in seed.local.sql, if present, loads after this file.
--
-- Demo login: demo@example.com / demo-password
--
-- It's flagged as the demo account (app_metadata.demo), so its
-- sign-in details can't change and its data resets each night.
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
-- "demo": true makes it the demo account.
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
  '{"provider": "email", "providers": ["email"], "demo": true}',
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
-- Sample data, from the function the nightly reset also uses
-- (migrations/20261106120000_demo_account.sql).
-- ------------------------------------------------------------

SELECT public.reset_demo_data();
