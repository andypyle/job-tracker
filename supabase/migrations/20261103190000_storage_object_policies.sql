-- Storage RLS for uploaded files: a signed-in user reaches only objects under their own
-- {user_id}/ folder. 001_initial_schema.sql left these as a manual dashboard step; production
-- has them, so this puts them in version control and gives local the same rules.
--
-- The names (and the second SELECT policy) are exactly what the dashboard created on
-- production, so `supabase db diff --linked` shows no drift for them. Each is created only if
-- missing, which makes this a no-op on production.
--
-- The backend uploads, signs and deletes with the service role key, which bypasses RLS; these
-- protect direct browser access, which the app doesn't use.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'users_select_own_files 1bjhltm_0'
  ) THEN
    CREATE POLICY "users_select_own_files 1bjhltm_0" ON storage.objects
      FOR SELECT TO authenticated
      USING ((storage.foldername(name))[1] = (auth.uid())::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'users_insert_own_files 1bjhltm_0'
  ) THEN
    CREATE POLICY "users_insert_own_files 1bjhltm_0" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK ((storage.foldername(name))[1] = (auth.uid())::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'users_delete_own_files 1bjhltm_0'
  ) THEN
    CREATE POLICY "users_delete_own_files 1bjhltm_0" ON storage.objects
      FOR DELETE TO authenticated
      USING ((storage.foldername(name))[1] = (auth.uid())::text);
  END IF;

  -- The dashboard adds a SELECT alongside a DELETE policy (deleting needs to read the row first)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'users_delete_own_files 1bjhltm_1'
  ) THEN
    CREATE POLICY "users_delete_own_files 1bjhltm_1" ON storage.objects
      FOR SELECT TO authenticated
      USING ((storage.foldername(name))[1] = (auth.uid())::text);
  END IF;
END
$$;
