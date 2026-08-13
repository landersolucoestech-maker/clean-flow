DROP POLICY IF EXISTS management_upload_message_attachments ON storage.objects;
DROP POLICY IF EXISTS management_manage_message_attachments ON storage.objects;
DROP POLICY IF EXISTS management_upload_broadcast_attachments ON storage.objects;
DROP POLICY IF EXISTS management_manage_broadcast_attachments ON storage.objects;

CREATE POLICY tenant_upload_message_attachments
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND public.is_management_staff()
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.company_id = public.current_company_id()
  )
);

CREATE POLICY tenant_manage_message_attachments
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND public.is_management_staff()
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.company_id = public.current_company_id()
  )
);

CREATE POLICY tenant_update_message_attachments
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.company_id = public.current_company_id()
  )
)
WITH CHECK (
  bucket_id = 'message-attachments'
  AND public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.company_id = public.current_company_id()
  )
);

CREATE POLICY tenant_delete_message_attachments
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.company_id = public.current_company_id()
  )
);

CREATE POLICY tenant_upload_broadcast_attachments
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'broadcast-attachments'
  AND public.is_management_staff()
  AND (storage.foldername(name))[1] = public.current_company_id()::text
);

CREATE POLICY tenant_manage_broadcast_attachments
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'broadcast-attachments'
  AND public.is_management_staff()
  AND (storage.foldername(name))[1] = public.current_company_id()::text
);

CREATE POLICY tenant_update_broadcast_attachments
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'broadcast-attachments'
  AND public.is_management_staff()
  AND (storage.foldername(name))[1] = public.current_company_id()::text
)
WITH CHECK (
  bucket_id = 'broadcast-attachments'
  AND public.is_management_staff()
  AND (storage.foldername(name))[1] = public.current_company_id()::text
);

CREATE POLICY tenant_delete_broadcast_attachments
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'broadcast-attachments'
  AND public.is_management_staff()
  AND (storage.foldername(name))[1] = public.current_company_id()::text
);
