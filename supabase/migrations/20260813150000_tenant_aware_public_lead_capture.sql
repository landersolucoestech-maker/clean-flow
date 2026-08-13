-- Make public website lead capture explicitly tenant-aware.
-- Existing single-company installations remain backward compatible when no key is supplied.

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS lead_capture_key text;

UPDATE public.company_settings
SET lead_capture_key = encode(extensions.gen_random_bytes(16), 'hex')
WHERE lead_capture_key IS NULL OR btrim(lead_capture_key) = '';

ALTER TABLE public.company_settings
  ALTER COLUMN lead_capture_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS company_settings_lead_capture_key_uidx
  ON public.company_settings (lead_capture_key);

COMMENT ON COLUMN public.company_settings.lead_capture_key IS
  'Public routing key used by website lead capture to resolve the owning tenant without exposing authenticated tenant context.';

DROP FUNCTION IF EXISTS public.capture_website_lead(jsonb);

CREATE OR REPLACE FUNCTION public.capture_website_lead(
  form_data jsonb,
  tenant_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_name text := nullif(trim(form_data ->> 'name'), '');
  lead_phone text := nullif(trim(form_data ->> 'phone'), '');
  lead_email text := nullif(lower(trim(form_data ->> 'email')), '');
  requested_tenant_key text := nullif(trim(tenant_key), '');
  resolved_company_id uuid;
  company_count integer;
  customer_id_value uuid;
  lead_id_value uuid;
  estimate_number_value text;
BEGIN
  IF lead_name IS NULL OR length(lead_name) < 2 OR (lead_phone IS NULL AND lead_email IS NULL) THEN
    RAISE EXCEPTION 'Invalid lead payload';
  END IF;

  IF requested_tenant_key IS NOT NULL THEN
    SELECT id INTO resolved_company_id
    FROM public.company_settings
    WHERE lead_capture_key = requested_tenant_key;

    IF resolved_company_id IS NULL THEN
      RAISE EXCEPTION 'Invalid tenant key';
    END IF;
  ELSE
    SELECT count(*), min(id)
      INTO company_count, resolved_company_id
    FROM public.company_settings;

    IF company_count <> 1 THEN
      RAISE EXCEPTION 'Tenant key required when multiple companies exist';
    END IF;
  END IF;

  -- Serialize matching submissions within the same tenant so simultaneous
  -- retries cannot create duplicate customers for one contact.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      resolved_company_id::text || ':' || coalesce(lead_email, lead_phone),
      0
    )
  );

  SELECT id INTO customer_id_value
  FROM public.customers
  WHERE company_id = resolved_company_id
    AND (
      (lead_phone IS NOT NULL AND (phone = lead_phone OR phone2 = lead_phone))
      OR (lead_email IS NOT NULL AND lower(email) = lead_email)
    )
  ORDER BY created_at
  LIMIT 1;

  IF customer_id_value IS NULL THEN
    INSERT INTO public.customers (
      company_id, name, phone, email, address, city, state, zip_code, source, status
    ) VALUES (
      resolved_company_id,
      lead_name,
      lead_phone,
      lead_email,
      nullif(form_data ->> 'address', ''),
      nullif(form_data ->> 'city', ''),
      nullif(form_data ->> 'state', ''),
      nullif(form_data ->> 'zip_code', ''),
      'website_form',
      'lead'
    )
    RETURNING id INTO customer_id_value;
  END IF;

  estimate_number_value := public.next_lead_estimate_number();

  INSERT INTO public.leads (
    company_id, customer_id, title, estimate_number, status, origin, address,
    service_type, frequency, preferred_time, preferred_days,
    bedrooms, bathrooms, square_feet, property_type, has_pets,
    notes, phone, email
  ) VALUES (
    resolved_company_id,
    customer_id_value,
    coalesce(nullif(form_data ->> 'service_type', ''), 'Cleaning') || ' - ' || lead_name,
    estimate_number_value,
    'new',
    'website_form',
    nullif(form_data ->> 'address', ''),
    nullif(form_data ->> 'service_type', ''),
    nullif(form_data ->> 'frequency', ''),
    nullif(form_data ->> 'preferred_time', ''),
    CASE
      WHEN nullif(form_data ->> 'preferred_date', '') IS NULL THEN NULL
      ELSE ARRAY[form_data ->> 'preferred_date']
    END,
    (form_data ->> 'bedrooms')::numeric,
    (form_data ->> 'bathrooms')::numeric,
    (form_data ->> 'square_feet')::numeric,
    nullif(form_data ->> 'property_type', ''),
    (form_data ->> 'has_pets')::boolean,
    nullif(form_data ->> 'notes', ''),
    lead_phone,
    lead_email
  )
  RETURNING id INTO lead_id_value;

  INSERT INTO public.lead_interactions (lead_id, interaction_type, description)
  VALUES (lead_id_value, 'form_submission', 'Lead captured from website form');

  RETURN jsonb_build_object(
    'lead_id', lead_id_value,
    'customer_id', customer_id_value,
    'estimate_number', estimate_number_value
  );
END
$$;

REVOKE ALL ON FUNCTION public.capture_website_lead(jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_website_lead(jsonb, text) TO service_role;
