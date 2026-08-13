-- Close tenant isolation gaps on tables whose ownership is inherited through a
-- parent row instead of a direct company_id column.

ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_settings(id) ON DELETE RESTRICT;

DO $$
DECLARE
  company_count integer;
  only_company uuid;
BEGIN
  SELECT count(*) INTO company_count FROM public.company_settings;
  IF company_count = 1 THEN
    SELECT id INTO only_company FROM public.company_settings LIMIT 1;
    UPDATE public.roles SET company_id = only_company WHERE company_id IS NULL;
  ELSIF company_count > 1 AND EXISTS (SELECT 1 FROM public.roles WHERE company_id IS NULL) THEN
    RAISE EXCEPTION 'Tenant migration blocked: role ownership is ambiguous across multiple companies';
  END IF;
END
$$;

DROP TRIGGER IF EXISTS assign_company_id ON public.roles;
CREATE TRIGGER assign_company_id
BEFORE INSERT ON public.roles
FOR EACH ROW EXECUTE FUNCTION public.assign_current_company_id();

-- Company settings may only be managed by finance users from that company.
DROP POLICY IF EXISTS finance_full_access ON public.company_settings;
DROP POLICY IF EXISTS tenant_finance_company_manage ON public.company_settings;
CREATE POLICY tenant_finance_company_manage
ON public.company_settings FOR ALL TO authenticated
USING (public.is_finance_staff() AND id = public.current_company_id())
WITH CHECK (public.is_finance_staff() AND id = public.current_company_id());

-- Staff records and role assignments stay inside the authenticated company.
DROP POLICY IF EXISTS finance_full_access ON public.staff;
DROP POLICY IF EXISTS tenant_finance_staff_manage ON public.staff;
CREATE POLICY tenant_finance_staff_manage
ON public.staff FOR ALL TO authenticated
USING (public.is_finance_staff() AND public.is_current_company(company_id))
WITH CHECK (public.is_finance_staff() AND public.is_current_company(company_id));

DROP POLICY IF EXISTS finance_full_access ON public.staff_roles;
DROP POLICY IF EXISTS tenant_staff_roles_manage ON public.staff_roles;
CREATE POLICY tenant_staff_roles_manage
ON public.staff_roles FOR ALL TO authenticated
USING (
  public.is_finance_staff()
  AND EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = staff_roles.staff_id
      AND s.company_id = public.current_company_id()
  )
)
WITH CHECK (
  public.is_finance_staff()
  AND EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = staff_roles.staff_id
      AND s.company_id = public.current_company_id()
  )
);

DROP POLICY IF EXISTS finance_full_access ON public.roles;
DROP POLICY IF EXISTS tenant_roles_manage ON public.roles;
CREATE POLICY tenant_roles_manage
ON public.roles FOR ALL TO authenticated
USING (public.is_finance_staff() AND public.is_current_company(company_id))
WITH CHECK (public.is_finance_staff() AND public.is_current_company(company_id));

-- Customer child records inherit tenant ownership from customers.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['customer_addresses', 'customer_relationships', 'customer_terms']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS management_full_access ON public.%I', table_name);
  END LOOP;
END
$$;

DROP POLICY IF EXISTS tenant_customer_addresses_manage ON public.customer_addresses;
CREATE POLICY tenant_customer_addresses_manage
ON public.customer_addresses FOR ALL TO authenticated
USING (
  public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_addresses.customer_id
      AND c.company_id = public.current_company_id()
  )
)
WITH CHECK (
  public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_addresses.customer_id
      AND c.company_id = public.current_company_id()
  )
);

DROP POLICY IF EXISTS tenant_customer_relationships_manage ON public.customer_relationships;
CREATE POLICY tenant_customer_relationships_manage
ON public.customer_relationships FOR ALL TO authenticated
USING (
  public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_relationships.customer_id
      AND c.company_id = public.current_company_id()
  )
)
WITH CHECK (
  public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_relationships.customer_id
      AND c.company_id = public.current_company_id()
  )
);

DROP POLICY IF EXISTS tenant_customer_terms_manage ON public.customer_terms;
CREATE POLICY tenant_customer_terms_manage
ON public.customer_terms FOR ALL TO authenticated
USING (
  public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_terms.customer_id
      AND c.company_id = public.current_company_id()
  )
)
WITH CHECK (
  public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_terms.customer_id
      AND c.company_id = public.current_company_id()
  )
);

-- Lead child records inherit tenant ownership from leads.
DROP POLICY IF EXISTS management_full_access ON public.lead_addresses;
DROP POLICY IF EXISTS tenant_lead_addresses_manage ON public.lead_addresses;
CREATE POLICY tenant_lead_addresses_manage
ON public.lead_addresses FOR ALL TO authenticated
USING (
  public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_addresses.lead_id
      AND l.company_id = public.current_company_id()
  )
)
WITH CHECK (
  public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_addresses.lead_id
      AND l.company_id = public.current_company_id()
  )
);

DROP POLICY IF EXISTS management_full_access ON public.lead_interactions;
DROP POLICY IF EXISTS tenant_lead_interactions_manage ON public.lead_interactions;
CREATE POLICY tenant_lead_interactions_manage
ON public.lead_interactions FOR ALL TO authenticated
USING (
  public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_interactions.lead_id
      AND l.company_id = public.current_company_id()
  )
)
WITH CHECK (
  public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_interactions.lead_id
      AND l.company_id = public.current_company_id()
  )
);

-- Messages inherit tenant ownership from their conversation.
DROP POLICY IF EXISTS management_messages ON public.messages;
DROP POLICY IF EXISTS tenant_management_messages ON public.messages;
CREATE POLICY tenant_management_messages
ON public.messages FOR ALL TO authenticated
USING (
  public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND c.company_id = public.current_company_id()
  )
)
WITH CHECK (
  public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND c.company_id = public.current_company_id()
  )
);

-- Broadcast recipients inherit from the tenant-scoped broadcast.
DROP POLICY IF EXISTS management_full_access ON public.broadcast_recipients;
DROP POLICY IF EXISTS tenant_broadcast_recipients_manage ON public.broadcast_recipients;
CREATE POLICY tenant_broadcast_recipients_manage
ON public.broadcast_recipients FOR ALL TO authenticated
USING (
  public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.broadcast_messages b
    WHERE b.id = broadcast_recipients.broadcast_id
      AND b.company_id = public.current_company_id()
  )
)
WITH CHECK (
  public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.broadcast_messages b
    WHERE b.id = broadcast_recipients.broadcast_id
      AND b.company_id = public.current_company_id()
  )
);

-- Invoice reminder access follows the invoice tenant.
DROP POLICY IF EXISTS finance_full_access ON public.invoice_reminders;
DROP POLICY IF EXISTS tenant_invoice_reminders_manage ON public.invoice_reminders;
CREATE POLICY tenant_invoice_reminders_manage
ON public.invoice_reminders FOR ALL TO authenticated
USING (
  public.is_finance_staff()
  AND EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_reminders.invoice_id
      AND i.company_id = public.current_company_id()
  )
)
WITH CHECK (
  public.is_finance_staff()
  AND EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_reminders.invoice_id
      AND i.company_id = public.current_company_id()
  )
);

-- Job tracking is readable only inside the current tenant.
DROP POLICY IF EXISTS own_job_tracking_read ON public.job_status_tracking;
CREATE POLICY own_job_tracking_read
ON public.job_status_tracking FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_status_tracking.job_id
      AND j.company_id = public.current_company_id()
  )
  AND (
    triggered_by = public.current_staff_id()
    OR edited_by = public.current_staff_id()
    OR public.is_management_staff()
  )
);

-- Review logs inherit tenant ownership from jobs.
DROP POLICY IF EXISTS management_full_access ON public.review_request_logs;
DROP POLICY IF EXISTS tenant_review_logs_manage ON public.review_request_logs;
CREATE POLICY tenant_review_logs_manage
ON public.review_request_logs FOR ALL TO authenticated
USING (
  public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = review_request_logs.job_id
      AND j.company_id = public.current_company_id()
  )
)
WITH CHECK (
  public.is_management_staff()
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = review_request_logs.job_id
      AND j.company_id = public.current_company_id()
  )
);
