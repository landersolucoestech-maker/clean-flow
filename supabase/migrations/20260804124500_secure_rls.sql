-- Replace the imported dump's 98 public USING (true) policies with authenticated,
-- role-aware policies. Service-role Edge Functions continue to bypass RLS.

CREATE OR REPLACE FUNCTION public.current_staff_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
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

CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sr.role
  FROM public.staff_roles sr
  WHERE sr.staff_id = public.current_staff_id()
$$;

CREATE OR REPLACE FUNCTION public.is_current_staff_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_staff_id() IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.is_management_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_staff_role() IN (
    'admin', 'virtual_assistant', 'office_manager', 'cleaning_manager'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_finance_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_staff_role() IN ('admin', 'office_manager')
$$;

CREATE OR REPLACE FUNCTION public.is_job_assigned(assignments text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.id = public.current_staff_id()
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(assignments, '{}')) assignment
        WHERE lower(trim(assignment)) IN (
          lower(s.id::text),
          lower(s.name),
          lower(coalesce(s.team, '')),
          lower('team ' || coalesce(s.team, ''))
        )
      )
  )
$$;

-- The legacy helper accepted any UUID. Bind it to the current request identity
-- so authenticated callers cannot probe or impersonate platform administrators.
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(_user_id = auth.uid(), false)
    AND EXISTS (
      SELECT 1
      FROM public.platform_admins
      WHERE user_id = auth.uid()
        AND is_active = true
    )
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_staff_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_staff_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_staff_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_management_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_finance_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_job_assigned(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;

DO $$
DECLARE policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;
END
$$;

-- Platform administrators can manage tenant data, but integration credential
-- tables remain service-role-only so secrets never reach a browser.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'automation_configs', 'automation_logs', 'broadcast_messages', 'broadcast_recipients',
    'company_settings', 'conversations', 'customer_addresses', 'customer_relationships',
    'customer_terms', 'customers', 'invoice_reminders', 'invoices', 'job_status_tracking',
    'jobs', 'lead_addresses', 'lead_interactions', 'leads', 'messages', 'payroll_records',
    'payroll_rules', 'platform_admins', 'platform_logs', 'review_request_logs', 'roles',
    'staff', 'staff_roles', 'support_ticket_messages', 'support_tickets',
    'transaction_rules', 'transactions'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY platform_admin_full_access ON public.%I FOR ALL TO authenticated '
      'USING (public.is_platform_admin(auth.uid())) '
      'WITH CHECK (public.is_platform_admin(auth.uid()))',
      table_name
    );
  END LOOP;
END
$$;

-- Basic reference data required throughout the authenticated application.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'automation_configs', 'company_settings'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY active_staff_read ON public.%I FOR SELECT TO authenticated '
      'USING (public.is_current_staff_active())',
      table_name
    );
  END LOOP;
END
$$;

-- Field staff need their own identity and role for route guards, but not the
-- payment details of every co-worker.
CREATE POLICY own_staff_read
ON public.staff FOR SELECT TO authenticated
USING (id = public.current_staff_id());

CREATE POLICY own_staff_role_read
ON public.staff_roles FOR SELECT TO authenticated
USING (staff_id = public.current_staff_id());

-- Management controls operational records and configuration.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'automation_configs', 'automation_logs', 'broadcast_messages', 'broadcast_recipients',
    'customer_addresses', 'customer_relationships', 'customer_terms', 'customers', 'jobs',
    'lead_addresses', 'lead_interactions', 'leads', 'review_request_logs'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY management_full_access ON public.%I FOR ALL TO authenticated '
      'USING (public.is_management_staff()) WITH CHECK (public.is_management_staff())',
      table_name
    );
  END LOOP;
END
$$;

-- Field staff see only assigned jobs and the corresponding customers.
CREATE POLICY assigned_jobs_read
ON public.jobs FOR SELECT TO authenticated
USING (public.is_job_assigned(staff_assigned));

CREATE POLICY assigned_customers_read
ON public.customers FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.customer_id = customers.id
      AND public.is_job_assigned(j.staff_assigned)
  )
);

CREATE POLICY assigned_customer_addresses_read
ON public.customer_addresses FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.customer_id = customer_addresses.customer_id
      AND public.is_job_assigned(j.staff_assigned)
  )
);

-- Customer communications contain sensitive contact data and are limited to
-- operational management roles.
CREATE POLICY management_conversations
ON public.conversations FOR ALL TO authenticated
USING (public.is_management_staff())
WITH CHECK (public.is_management_staff());

CREATE POLICY management_messages
ON public.messages FOR ALL TO authenticated
USING (public.is_management_staff())
WITH CHECK (public.is_management_staff());

-- Financial data is restricted to finance roles; staff can read their own pay.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'company_settings', 'invoice_reminders', 'invoices', 'payroll_records',
    'payroll_rules', 'roles', 'staff', 'staff_roles', 'transaction_rules', 'transactions'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY finance_full_access ON public.%I FOR ALL TO authenticated '
      'USING (public.is_finance_staff()) WITH CHECK (public.is_finance_staff())',
      table_name
    );
  END LOOP;
END
$$;

CREATE POLICY own_payroll_read
ON public.payroll_records FOR SELECT TO authenticated
USING (staff_id = public.current_staff_id());

CREATE POLICY own_payroll_rules_read
ON public.payroll_rules FOR SELECT TO authenticated
USING (staff_id = public.current_staff_id());

CREATE POLICY own_job_tracking_read
ON public.job_status_tracking FOR SELECT TO authenticated
USING (
  triggered_by = public.current_staff_id()
  OR edited_by = public.current_staff_id()
  OR public.is_management_staff()
);

-- Ticket owners and platform administrators can access support threads.
CREATE POLICY ticket_owner_access
ON public.support_tickets FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY ticket_message_owner_access
ON public.support_ticket_messages FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets ticket
    WHERE ticket.id = support_ticket_messages.ticket_id
      AND ticket.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets ticket
    WHERE ticket.id = support_ticket_messages.ticket_id
      AND ticket.user_id = auth.uid()
  )
);

-- Token-bearing tables are intentionally inaccessible to authenticated clients.
REVOKE ALL ON TABLE public.google_connections FROM authenticated;
REVOKE ALL ON TABLE public.quickbooks_connections FROM authenticated;
REVOKE ALL ON TABLE public.ringcentral_connections FROM authenticated;

-- One-time bootstrap for a brand-new project. Disable public Auth sign-ups in
-- the Supabase dashboard before inviting the first account.
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

  INSERT INTO public.staff (name, email, auth_user_id, is_active, is_driver)
  VALUES (resolved_staff_name, authenticated_email, auth.uid(), true, false)
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
