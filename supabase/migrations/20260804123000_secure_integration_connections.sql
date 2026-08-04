-- Integration credentials must never be readable from browser clients.
CREATE TABLE IF NOT EXISTS public.quickbooks_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.company_settings(id) ON DELETE CASCADE,
  realm_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quickbooks_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.quickbooks_connections FROM anon, authenticated;

DROP TRIGGER IF EXISTS update_quickbooks_connections_updated_at ON public.quickbooks_connections;
CREATE TRIGGER update_quickbooks_connections_updated_at
BEFORE UPDATE ON public.quickbooks_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Keep staff emails unambiguous while introducing the durable Auth user link.
CREATE UNIQUE INDEX IF NOT EXISTS staff_email_unique_ci
ON public.staff (lower(email))
WHERE email IS NOT NULL;

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.staff AS staff_record
SET auth_user_id = auth_user.id
FROM auth.users AS auth_user
WHERE staff_record.auth_user_id IS NULL
  AND staff_record.email IS NOT NULL
  AND lower(staff_record.email) = lower(auth_user.email);

CREATE UNIQUE INDEX IF NOT EXISTS staff_auth_user_id_key
ON public.staff (auth_user_id)
WHERE auth_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.google_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.company_settings(id) ON DELETE CASCADE,
  google_user_id text,
  email text,
  name text,
  picture_url text,
  scopes text[] NOT NULL DEFAULT '{}',
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.google_connections FROM anon, authenticated;

DROP TRIGGER IF EXISTS update_google_connections_updated_at ON public.google_connections;
CREATE TRIGGER update_google_connections_updated_at
BEFORE UPDATE ON public.google_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
