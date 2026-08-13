CREATE OR REPLACE FUNCTION public.create_support_ticket_atomic(
  ticket_subject text,
  ticket_description text,
  ticket_priority public.ticket_priority,
  ticket_category public.ticket_category
)
RETURNS public.support_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_id uuid := public.current_company_id();
  created_ticket public.support_tickets;
BEGIN
  IF auth.uid() IS NULL OR tenant_id IS NULL OR NOT public.is_current_staff_active() THEN
    RAISE EXCEPTION 'Authenticated staff tenant required';
  END IF;
  IF trim(coalesce(ticket_subject, '')) = '' OR trim(coalesce(ticket_description, '')) = '' THEN
    RAISE EXCEPTION 'Subject and description are required';
  END IF;

  INSERT INTO public.support_tickets (
    company_id, user_id, ticket_number, subject, description, priority, category
  ) VALUES (
    tenant_id, auth.uid(), 'TEMP', trim(ticket_subject), trim(ticket_description),
    ticket_priority, ticket_category
  )
  RETURNING * INTO created_ticket;

  INSERT INTO public.support_ticket_messages (
    ticket_id, user_id, is_staff_reply, message
  ) VALUES (
    created_ticket.id, auth.uid(), false, trim(ticket_description)
  );

  RETURN created_ticket;
END
$$;

REVOKE ALL ON FUNCTION public.create_support_ticket_atomic(text, text, public.ticket_priority, public.ticket_category)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_support_ticket_atomic(text, text, public.ticket_priority, public.ticket_category)
TO authenticated;

CREATE OR REPLACE FUNCTION public.add_support_ticket_message_atomic(
  target_ticket_id uuid,
  message_body text
)
RETURNS public.support_ticket_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_id uuid := public.current_company_id();
  created_message public.support_ticket_messages;
BEGIN
  IF auth.uid() IS NULL OR tenant_id IS NULL OR trim(coalesce(message_body, '')) = '' THEN
    RAISE EXCEPTION 'Authenticated tenant and message are required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = target_ticket_id
      AND company_id = tenant_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  INSERT INTO public.support_ticket_messages (ticket_id, user_id, is_staff_reply, message)
  VALUES (target_ticket_id, auth.uid(), false, trim(message_body))
  RETURNING * INTO created_message;

  UPDATE public.support_tickets
  SET updated_at = now()
  WHERE id = target_ticket_id AND company_id = tenant_id AND user_id = auth.uid();

  RETURN created_message;
END
$$;

REVOKE ALL ON FUNCTION public.add_support_ticket_message_atomic(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_support_ticket_message_atomic(uuid, text) TO authenticated;
