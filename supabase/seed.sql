-- ============================================================
-- Storage bucket + policies (local dev)
-- ============================================================

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