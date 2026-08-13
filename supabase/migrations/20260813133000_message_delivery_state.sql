ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS delivery_error text,
  ADD COLUMN IF NOT EXISTS delivery_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_delivery_attempt_at timestamptz;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_delivery_status_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_delivery_status_check
  CHECK (delivery_status IN ('pending', 'sent', 'failed', 'received'));

CREATE INDEX IF NOT EXISTS messages_delivery_status_idx
  ON public.messages(delivery_status, created_at DESC);
