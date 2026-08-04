CREATE SEQUENCE IF NOT EXISTS public.lead_estimate_number_seq START WITH 1001;

SELECT setval(
  'public.lead_estimate_number_seq',
  greatest(
    1000,
    coalesce((SELECT max(substring(estimate_number FROM '[0-9]+$')::bigint) FROM public.leads), 1000)
  ),
  true
);

CREATE OR REPLACE FUNCTION public.next_lead_estimate_number()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'EST-' || nextval('public.lead_estimate_number_seq')::text
$$;

CREATE OR REPLACE FUNCTION public.capture_website_lead(form_data jsonb)
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
  customer_id_value uuid;
  lead_id_value uuid;
  estimate_number_value text;
BEGIN
  IF lead_name IS NULL OR length(lead_name) < 2 OR (lead_phone IS NULL AND lead_email IS NULL) THEN
    RAISE EXCEPTION 'Invalid lead payload';
  END IF;

  -- Serialize matching submissions so simultaneous retries do not create two
  -- customers for the same contact before either transaction commits.
  PERFORM pg_advisory_xact_lock(hashtextextended(coalesce(lead_email, lead_phone), 0));

  SELECT id INTO customer_id_value
  FROM public.customers
  WHERE (lead_phone IS NOT NULL AND (phone = lead_phone OR phone2 = lead_phone))
     OR (lead_email IS NOT NULL AND lower(email) = lead_email)
  ORDER BY created_at
  LIMIT 1;

  IF customer_id_value IS NULL THEN
    INSERT INTO public.customers (
      name, phone, email, address, city, state, zip_code, source, status
    ) VALUES (
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
    customer_id, title, estimate_number, status, origin, address,
    service_type, frequency, preferred_time, preferred_days,
    bedrooms, bathrooms, square_feet, property_type, has_pets,
    notes, phone, email
  ) VALUES (
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

CREATE TABLE IF NOT EXISTS public.lead_capture_rate_limits (
  key_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_capture_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_lead_capture_rate_limit(
  request_key_hash text,
  maximum_requests integer DEFAULT 5,
  window_seconds integer DEFAULT 3600
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE allowed boolean;
BEGIN
  INSERT INTO public.lead_capture_rate_limits AS limits (key_hash)
  VALUES (request_key_hash)
  ON CONFLICT (key_hash) DO UPDATE SET
    request_count = CASE
      WHEN limits.window_started_at < now() - make_interval(secs => window_seconds) THEN 1
      ELSE limits.request_count + 1
    END,
    window_started_at = CASE
      WHEN limits.window_started_at < now() - make_interval(secs => window_seconds) THEN now()
      ELSE limits.window_started_at
    END,
    updated_at = now()
  RETURNING request_count <= maximum_requests INTO allowed;

  RETURN allowed;
END
$$;

REVOKE ALL ON TABLE public.lead_capture_rate_limits FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.lead_estimate_number_seq FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.next_lead_estimate_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.capture_website_lead(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_lead_capture_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_lead_estimate_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.capture_website_lead(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_lead_capture_rate_limit(text, integer, integer) TO service_role;
