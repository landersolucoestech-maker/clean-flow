-- Make RingCentral message ingestion idempotent across webhook retries and manual syncs.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS ringcentral_message_id text;

CREATE UNIQUE INDEX IF NOT EXISTS messages_ringcentral_message_id_key
  ON public.messages (ringcentral_message_id)
  WHERE ringcentral_message_id IS NOT NULL;

