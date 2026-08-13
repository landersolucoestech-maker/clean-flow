-- Canonical tenant isolation foundation for operational data.
-- If legacy ownership is ambiguous across multiple companies, fail rather than
-- silently assigning records to the wrong tenant.

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_settings(id) ON DELETE RESTRICT;
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_settings(id) ON DELETE RESTRICT;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_settings(id) ON DELETE RESTRICT;
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_settings(id) ON DELETE RESTRICT;
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_settings(id) ON DELETE RESTRICT;
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_settings(id) ON DELETE RESTRICT;
ALTER TABLE public.payroll_records
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_settings(id) ON DELETE RESTRICT;
ALTER TABLE public.payroll_rules
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_settings(id) ON DELETE RESTRICT;
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_settings(id) ON DELETE RESTRICT;
ALTER TABLE public.automation_configs
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_settings(id) ON DELETE RESTRICT;
ALTER TABLE public.automation_logs
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_settings(id) ON DELETE RESTRICT;
ALTER TABLE public.broadcast_messages
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_settings(id) ON DELETE RESTRICT;
ALTER TABLE public.transaction_rules
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.company_settings(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.company_id
  FROM public.staff s
  WHERE s.is_active = true
    AND (
      s.auth_user_id = auth.uid()
      OR (
        s.auth_user_id IS NULL
        AND lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    )
  ORDER BY CASE WHEN s.auth_user_id = auth.uid() THEN 0 ELSE 1 END
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_company_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated, service_role;

DO $$
DECLARE
  company_count integer;
  only_company uuid;
  has_unscoped_data boolean;
BEGIN
  SELECT count(*), min(id::text)::uuid INTO company_count, only_company FROM public.company_settings;

  IF company_count = 1 THEN
    UPDATE public.staff SET company_id = only_company WHERE company_id IS NULL;
    UPDATE public.customers SET company_id = only_company WHERE company_id IS NULL;
    UPDATE public.leads SET company_id = only_company WHERE company_id IS NULL;
    UPDATE public.jobs SET company_id = only_company WHERE company_id IS NULL;
    UPDATE public.invoices SET company_id = only_company WHERE company_id IS NULL;
    UPDATE public.transactions SET company_id = only_company WHERE company_id IS NULL;
    UPDATE public.payroll_records SET company_id = only_company WHERE company_id IS NULL;
    UPDATE public.payroll_rules SET company_id = only_company WHERE company_id IS NULL;
    UPDATE public.conversations SET company_id = only_company WHERE company_id IS NULL;
    UPDATE public.automation_configs SET company_id = only_company WHERE company_id IS NULL;
    UPDATE public.automation_logs SET company_id = only_company WHERE company_id IS NULL;
    UPDATE public.broadcast_messages SET company_id = only_company WHERE company_id IS NULL;
    UPDATE public.transaction_rules SET company_id = only_company WHERE company_id IS NULL;
  ELSIF company_count > 1 THEN
    -- Recover child ownership only when an already-scoped parent proves it.
    UPDATE public.leads l
      SET company_id = c.company_id
      FROM public.customers c
      WHERE l.company_id IS NULL AND l.customer_id = c.id AND c.company_id IS NOT NULL;
    UPDATE public.jobs j
      SET company_id = c.company_id
      FROM public.customers c
      WHERE j.company_id IS NULL AND j.customer_id = c.id AND c.company_id IS NOT NULL;
    UPDATE public.invoices i
      SET company_id = c.company_id
      FROM public.customers c
      WHERE i.company_id IS NULL AND i.customer_id = c.id AND c.company_id IS NOT NULL;
    UPDATE public.conversations conv
      SET company_id = c.company_id
      FROM public.customers c
      WHERE conv.company_id IS NULL AND conv.customer_id = c.id AND c.company_id IS NOT NULL;

    SELECT EXISTS (
      SELECT 1 FROM public.staff WHERE company_id IS NULL
      UNION ALL SELECT 1 FROM public.customers WHERE company_id IS NULL
      UNION ALL SELECT 1 FROM public.leads WHERE company_id IS NULL
      UNION ALL SELECT 1 FROM public.jobs WHERE company_id IS NULL
      UNION ALL SELECT 1 FROM public.invoices WHERE company_id IS NULL
      UNION ALL SELECT 1 FROM public.transactions WHERE company_id IS NULL
      UNION ALL SELECT 1 FROM public.payroll_records WHERE company_id IS NULL
      UNION ALL SELECT 1 FROM public.payroll_rules WHERE company_id IS NULL
      UNION ALL SELECT 1 FROM public.conversations WHERE company_id IS NULL
      UNION ALL SELECT 1 FROM public.automation_configs WHERE company_id IS NULL
      UNION ALL SELECT 1 FROM public.automation_logs WHERE company_id IS NULL
      UNION ALL SELECT 1 FROM public.broadcast_messages WHERE company_id IS NULL
      UNION ALL SELECT 1 FROM public.transaction_rules WHERE company_id IS NULL
    ) INTO has_unscoped_data;

    IF has_unscoped_data THEN
      RAISE EXCEPTION 'Tenant migration blocked: multiple companies exist with legacy rows whose owner cannot be inferred safely';
    END IF;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.assign_current_company_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE resolved_company_id uuid;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  resolved_company_id := public.current_company_id();
  IF resolved_company_id IS NULL THEN
    RAISE EXCEPTION 'Unable to resolve company for this write';
  END IF;

  NEW.company_id := resolved_company_id;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION public.assign_current_company_id() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'customers', 'leads', 'jobs', 'invoices', 'transactions', 'payroll_records',
    'payroll_rules', 'conversations', 'automation_configs', 'automation_logs',
    'broadcast_messages', 'transaction_rules'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS assign_company_id ON public.%I', table_name);
    EXECUTE format(
      'CREATE TRIGGER assign_company_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.assign_current_company_id()',
      table_name
    );
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION public.is_current_company(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _company_id IS NOT NULL AND _company_id = public.current_company_id()
$$;

REVOKE ALL ON FUNCTION public.is_current_company(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_company(uuid) TO authenticated;

-- Replace role-only policies on directly tenant-scoped operational tables.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'customers', 'leads', 'jobs', 'automation_configs', 'automation_logs',
    'broadcast_messages', 'conversations'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS management_full_access ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_management_full_access ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_management_full_access ON public.%I FOR ALL TO authenticated '
      'USING (public.is_management_staff() AND public.is_current_company(company_id)) '
      'WITH CHECK (public.is_management_staff() AND public.is_current_company(company_id))',
      table_name
    );
  END LOOP;

  FOREACH table_name IN ARRAY ARRAY[
    'invoices', 'transactions', 'payroll_records', 'payroll_rules', 'transaction_rules'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS finance_full_access ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_finance_full_access ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_finance_full_access ON public.%I FOR ALL TO authenticated '
      'USING (public.is_finance_staff() AND public.is_current_company(company_id)) '
      'WITH CHECK (public.is_finance_staff() AND public.is_current_company(company_id))',
      table_name
    );
  END LOOP;
END
$$;

DROP POLICY IF EXISTS active_staff_read ON public.company_settings;
DROP POLICY IF EXISTS own_company_read ON public.company_settings;
CREATE POLICY own_company_read
ON public.company_settings FOR SELECT TO authenticated
USING (id = public.current_company_id() OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS own_staff_read ON public.staff;
CREATE POLICY own_staff_read
ON public.staff FOR SELECT TO authenticated
USING (
  id = public.current_staff_id()
  OR (public.is_finance_staff() AND public.is_current_company(company_id))
  OR public.is_platform_admin(auth.uid())
);

DROP POLICY IF EXISTS assigned_jobs_read ON public.jobs;
CREATE POLICY assigned_jobs_read
ON public.jobs FOR SELECT TO authenticated
USING (
  public.is_current_company(company_id)
  AND public.is_job_assigned(staff_assigned)
);

DROP POLICY IF EXISTS assigned_customers_read ON public.customers;
CREATE POLICY assigned_customers_read
ON public.customers FOR SELECT TO authenticated
USING (
  public.is_current_company(company_id)
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.customer_id = customers.id
      AND j.company_id = customers.company_id
      AND public.is_job_assigned(j.staff_assigned)
  )
);

DROP POLICY IF EXISTS ticket_owner_access ON public.support_tickets;
CREATE POLICY ticket_owner_access
ON public.support_tickets FOR ALL TO authenticated
USING (
  user_id = auth.uid()
  AND company_id = public.current_company_id()
)
WITH CHECK (
  user_id = auth.uid()
  AND company_id = public.current_company_id()
);

-- Bootstrap establishes the first staff membership explicitly.
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(
  company_name text,
  staff_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  authenticated_email text := auth.jwt() ->> 'email';
  resolved_staff_name text;
  company_record public.company_settings;
  staff_record public.staff;
BEGIN
  IF auth.uid() IS NULL OR authenticated_email IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF trim(coalesce(company_name, '')) = '' THEN
    RAISE EXCEPTION 'Company name is required';
  END IF;

  LOCK TABLE public.staff IN EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public.staff) THEN
    RAISE EXCEPTION 'Initial administrator has already been configured';
  END IF;

  SELECT * INTO company_record FROM public.company_settings ORDER BY created_at LIMIT 1;
  IF company_record.id IS NULL THEN
    INSERT INTO public.company_settings (legal_name, trade_name, email)
    VALUES (trim(company_name), trim(company_name), authenticated_email)
    RETURNING * INTO company_record;
  END IF;

  resolved_staff_name := coalesce(
    nullif(trim(staff_name), ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    split_part(authenticated_email, '@', 1)
  );

  INSERT INTO public.staff (name, email, auth_user_id, is_active, is_driver, company_id)
  VALUES (resolved_staff_name, authenticated_email, auth.uid(), true, false, company_record.id)
  RETURNING * INTO staff_record;

  INSERT INTO public.staff_roles (staff_id, role)
  VALUES (staff_record.id, 'admin');

  RETURN jsonb_build_object(
    'company_id', company_record.id,
    'staff_id', staff_record.id,
    'role', 'admin'
  );
END
$$;

REVOKE ALL ON FUNCTION public.bootstrap_first_admin(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin(text, text) TO authenticated;
