-- Route anonymous website leads to a tenant without ever choosing an arbitrary company.
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS public_lead_capture_key uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS company_settings_public_lead_capture_key_uidx
  ON public.company_settings(public_lead_capture_key);

CREATE OR REPLACE FUNCTION public.capture_website_lead(form_data jsonb, target_company_id uuid)
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
  IF target_company_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.company_settings WHERE id = target_company_id
  ) THEN
    RAISE EXCEPTION 'Invalid target company';
  END IF;

  IF lead_name IS NULL OR length(lead_name) < 2 OR (lead_phone IS NULL AND lead_email IS NULL) THEN
    RAISE EXCEPTION 'Invalid lead payload';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(target_company_id::text || ':' || coalesce(lead_email, lead_phone), 0)
  );

  SELECT id INTO customer_id_value
  FROM public.customers
  WHERE company_id = target_company_id
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
      target_company_id,
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
    target_company_id,
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
    'estimate_number', estimate_number_value,
    'company_id', target_company_id
  );
END
$$;

REVOKE ALL ON FUNCTION public.capture_website_lead(jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_website_lead(jsonb, uuid) TO service_role;

-- Compatibility wrapper: safe only when ownership is unambiguous.
CREATE OR REPLACE FUNCTION public.capture_website_lead(form_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_count integer;
  only_company_id uuid;
BEGIN
  SELECT count(*), min(id) INTO company_count, only_company_id
  FROM public.company_settings;

  IF company_count <> 1 OR only_company_id IS NULL THEN
    RAISE EXCEPTION 'Lead capture tenant is ambiguous; an explicit company key is required';
  END IF;

  RETURN public.capture_website_lead(form_data, only_company_id);
END
$$;

REVOKE ALL ON FUNCTION public.capture_website_lead(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_website_lead(jsonb) TO service_role;
