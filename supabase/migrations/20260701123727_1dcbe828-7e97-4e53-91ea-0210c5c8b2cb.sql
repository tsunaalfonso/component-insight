
-- Users manage files under their own uid/ prefix; admins can read all.
DO $$
DECLARE b TEXT;
BEGIN
  FOREACH b IN ARRAY ARRAY['component-images','camera-captures','reports','avatars'] LOOP
    EXECUTE format($f$
      CREATE POLICY "own_read_%1$s" ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id = %1$L AND (storage.foldername(name))[1] = auth.uid()::text);
      CREATE POLICY "own_insert_%1$s" ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = %1$L AND (storage.foldername(name))[1] = auth.uid()::text);
      CREATE POLICY "own_update_%1$s" ON storage.objects FOR UPDATE TO authenticated
        USING (bucket_id = %1$L AND (storage.foldername(name))[1] = auth.uid()::text);
      CREATE POLICY "own_delete_%1$s" ON storage.objects FOR DELETE TO authenticated
        USING (bucket_id = %1$L AND (storage.foldername(name))[1] = auth.uid()::text);
      CREATE POLICY "admin_read_%1$s" ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id = %1$L AND public.has_role(auth.uid(), 'admin'));
    $f$, b);
  END LOOP;
END $$;
