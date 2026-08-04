-- Attachments are public because they are delivered as links to external SMS
-- recipients. Upload, listing, modification and deletion remain management-only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'message-attachments',
    'message-attachments',
    true,
    10485760,
    ARRAY[
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
  ),
  (
    'broadcast-attachments',
    'broadcast-attachments',
    true,
    10485760,
    ARRAY[
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS management_upload_message_attachments ON storage.objects;
CREATE POLICY management_upload_message_attachments
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND public.is_management_staff()
);

DROP POLICY IF EXISTS management_manage_message_attachments ON storage.objects;
CREATE POLICY management_manage_message_attachments
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND public.is_management_staff()
)
WITH CHECK (
  bucket_id = 'message-attachments'
  AND public.is_management_staff()
);

DROP POLICY IF EXISTS management_upload_broadcast_attachments ON storage.objects;
CREATE POLICY management_upload_broadcast_attachments
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'broadcast-attachments'
  AND public.is_management_staff()
);

DROP POLICY IF EXISTS management_manage_broadcast_attachments ON storage.objects;
CREATE POLICY management_manage_broadcast_attachments
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'broadcast-attachments'
  AND public.is_management_staff()
)
WITH CHECK (
  bucket_id = 'broadcast-attachments'
  AND public.is_management_staff()
);
