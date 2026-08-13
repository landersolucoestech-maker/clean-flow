CREATE OR REPLACE FUNCTION public.save_customer_with_addresses(
  target_customer_id uuid,
  customer_payload jsonb,
  addresses_payload jsonb DEFAULT '[]'::jsonb
)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_id uuid := public.current_company_id();
  saved_customer public.customers;
  address_item jsonb;
  formatted_address text;
BEGIN
  IF auth.uid() IS NULL OR tenant_id IS NULL OR NOT public.is_management_staff() THEN
    RAISE EXCEPTION 'Management authorization required';
  END IF;
  IF trim(coalesce(customer_payload ->> 'name', '')) = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  IF jsonb_typeof(coalesce(addresses_payload, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'addresses_payload must be an array';
  END IF;

  IF target_customer_id IS NULL THEN
    INSERT INTO public.customers (
      company_id, name, email, phone, phone2, address, status, payment_method,
      customer_since, source, additional_info, billing_contact_name,
      billing_contact_relationship, billing_contact_email, billing_contact_phone,
      billing_contact_phone2, billing_contact_notes
    ) VALUES (
      tenant_id,
      trim(customer_payload ->> 'name'),
      nullif(customer_payload ->> 'email', ''),
      nullif(customer_payload ->> 'phone', ''),
      nullif(customer_payload ->> 'phone2', ''),
      nullif(customer_payload ->> 'address', ''),
      coalesce(nullif(customer_payload ->> 'status', ''), 'Active'),
      nullif(customer_payload ->> 'payment_method', ''),
      nullif(customer_payload ->> 'customer_since', '')::date,
      nullif(customer_payload ->> 'source', ''),
      nullif(customer_payload ->> 'additional_info', ''),
      nullif(customer_payload ->> 'billing_contact_name', ''),
      nullif(customer_payload ->> 'billing_contact_relationship', ''),
      nullif(customer_payload ->> 'billing_contact_email', ''),
      nullif(customer_payload ->> 'billing_contact_phone', ''),
      nullif(customer_payload ->> 'billing_contact_phone2', ''),
      nullif(customer_payload ->> 'billing_contact_notes', '')
    )
    RETURNING * INTO saved_customer;
  ELSE
    UPDATE public.customers
    SET
      name = trim(customer_payload ->> 'name'),
      email = nullif(customer_payload ->> 'email', ''),
      phone = nullif(customer_payload ->> 'phone', ''),
      phone2 = nullif(customer_payload ->> 'phone2', ''),
      address = nullif(customer_payload ->> 'address', ''),
      status = coalesce(nullif(customer_payload ->> 'status', ''), status),
      payment_method = nullif(customer_payload ->> 'payment_method', ''),
      customer_since = coalesce(nullif(customer_payload ->> 'customer_since', '')::date, customer_since),
      source = nullif(customer_payload ->> 'source', ''),
      additional_info = nullif(customer_payload ->> 'additional_info', ''),
      billing_contact_name = nullif(customer_payload ->> 'billing_contact_name', ''),
      billing_contact_relationship = nullif(customer_payload ->> 'billing_contact_relationship', ''),
      billing_contact_email = nullif(customer_payload ->> 'billing_contact_email', ''),
      billing_contact_phone = nullif(customer_payload ->> 'billing_contact_phone', ''),
      billing_contact_phone2 = nullif(customer_payload ->> 'billing_contact_phone2', ''),
      billing_contact_notes = nullif(customer_payload ->> 'billing_contact_notes', ''),
      updated_at = now()
    WHERE id = target_customer_id AND company_id = tenant_id
    RETURNING * INTO saved_customer;

    IF saved_customer.id IS NULL THEN
      RAISE EXCEPTION 'Customer not found';
    END IF;

    DELETE FROM public.customer_addresses
    WHERE customer_id = target_customer_id;
  END IF;

  FOR address_item IN SELECT value FROM jsonb_array_elements(coalesce(addresses_payload, '[]'::jsonb))
  LOOP
    formatted_address := trim(concat_ws(', ',
      nullif(address_item ->> 'street', ''),
      nullif(address_item ->> 'city', ''),
      nullif(concat_ws(' ', nullif(address_item ->> 'state', ''), nullif(address_item ->> 'postal_code', '')), '')
    ));

    IF formatted_address = '' THEN
      RAISE EXCEPTION 'Each address requires a street/city/state/postal value';
    END IF;

    INSERT INTO public.customer_addresses (
      customer_id, name, street, complement, city, state, postal_code, address,
      notes, additional_notes, frequency, preferred_day
    ) VALUES (
      saved_customer.id,
      coalesce(nullif(address_item ->> 'name', ''), 'Home'),
      nullif(address_item ->> 'street', ''),
      nullif(address_item ->> 'complement', ''),
      nullif(address_item ->> 'city', ''),
      nullif(address_item ->> 'state', ''),
      nullif(address_item ->> 'postal_code', ''),
      formatted_address,
      nullif(address_item ->> 'notes', ''),
      nullif(address_item ->> 'additional_notes', ''),
      nullif(address_item ->> 'frequency', ''),
      nullif(address_item ->> 'preferred_day', '')
    );
  END LOOP;

  RETURN saved_customer;
END
$$;

REVOKE ALL ON FUNCTION public.save_customer_with_addresses(uuid, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_customer_with_addresses(uuid, jsonb, jsonb) TO authenticated;
