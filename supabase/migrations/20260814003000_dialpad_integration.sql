-- Dialpad OAuth credentials are server-only and tenant scoped.
CREATE TABLE IF NOT EXISTS public.dialpad_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.company_settings(id) ON DELETE CASCADE,
  dialpad_user_id text,
  email text,
  display_name text,
  phone_number text,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  webhook_id bigint,
  sms_subscription_id bigint,
  webhook_secret text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dialpad_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.dialpad_connections FROM anon, authenticated;

DROP TRIGGER IF EXISTS update_dialpad_connections_updated_at ON public.dialpad_connections;
CREATE TRIGGER update_dialpad_connections_updated_at
BEFORE UPDATE ON public.dialpad_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS sms_provider text NOT NULL DEFAULT 'auto';

ALTER TABLE public.company_settings
  DROP CONSTRAINT IF EXISTS company_settings_sms_provider_check;
ALTER TABLE public.company_settings
  ADD CONSTRAINT company_settings_sms_provider_check
  CHECK (sms_provider IN ('auto', 'ringcentral', 'dialpad'));

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_message_id text;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_provider_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_provider_check
  CHECK (provider IS NULL OR provider IN ('ringcentral', 'dialpad'));

CREATE INDEX IF NOT EXISTS messages_provider_message_id_idx
ON public.messages(provider, provider_message_id)
WHERE provider_message_id IS NOT NULL;
