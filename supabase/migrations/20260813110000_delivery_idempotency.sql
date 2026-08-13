ALTER TABLE public.automation_logs
  ADD COLUMN IF NOT EXISTS dedupe_key text,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS automation_logs_dedupe_key_unique
  ON public.automation_logs (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_automation_delivery(
  tenant_id uuid,
  automation_config_id uuid,
  delivery_key text,
  target_job_id uuid DEFAULT NULL,
  target_invoice_id uuid DEFAULT NULL,
  target_customer_id uuid DEFAULT NULL,
  delivery_trigger_type text DEFAULT 'scheduled'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_id uuid;
BEGIN
  IF tenant_id IS NULL OR trim(coalesce(delivery_key, '')) = '' THEN
    RAISE EXCEPTION 'Tenant and delivery key are required';
  END IF;

  INSERT INTO public.automation_logs (
    company_id, automation_id, job_id, invoice_id, customer_id,
    trigger_type, status, dedupe_key, attempt_count, processing_started_at
  ) VALUES (
    tenant_id, automation_config_id, target_job_id, target_invoice_id,
    target_customer_id, delivery_trigger_type, 'processing', delivery_key, 1, now()
  )
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL
  DO UPDATE SET
    status = 'processing',
    attempt_count = public.automation_logs.attempt_count + 1,
    processing_started_at = now(),
    error_message = NULL
  WHERE public.automation_logs.status = 'failed'
     OR (
       public.automation_logs.status = 'processing'
       AND public.automation_logs.processing_started_at < now() - interval '15 minutes'
     )
  RETURNING id INTO claimed_id;

  RETURN claimed_id;
END
$$;

CREATE OR REPLACE FUNCTION public.finish_automation_delivery(
  delivery_log_id uuid,
  tenant_id uuid,
  delivery_status text,
  delivered_message text DEFAULT NULL,
  delivered_to text DEFAULT NULL,
  provider_id text DEFAULT NULL,
  failure_message text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF delivery_status NOT IN ('sent', 'failed') THEN
    RAISE EXCEPTION 'Invalid delivery status';
  END IF;

  UPDATE public.automation_logs
  SET
    status = delivery_status,
    message_sent = delivered_message,
    sent_to = delivered_to,
    provider_message_id = provider_id,
    error_message = failure_message,
    sent_at = CASE WHEN delivery_status = 'sent' THEN now() ELSE sent_at END,
    processing_started_at = NULL
  WHERE id = delivery_log_id
    AND company_id = tenant_id
    AND status = 'processing';

  RETURN FOUND;
END
$$;

REVOKE ALL ON FUNCTION public.claim_automation_delivery(uuid, uuid, text, uuid, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_automation_delivery(uuid, uuid, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_automation_delivery(uuid, uuid, text, uuid, uuid, uuid, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_automation_delivery(uuid, uuid, text, text, text, text, text)
  TO service_role;
