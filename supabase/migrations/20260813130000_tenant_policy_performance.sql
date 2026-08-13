CREATE OR REPLACE FUNCTION private.is_job_assigned(assignments text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.id = private.current_staff_id()
      AND s.company_id = private.current_company_id()
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

REVOKE ALL ON FUNCTION private.is_job_assigned(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_job_assigned(text[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_job_assigned(assignments text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.is_job_assigned(assignments) $$;

REVOKE ALL ON FUNCTION public.is_job_assigned(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_job_assigned(text[]) TO authenticated;

CREATE INDEX IF NOT EXISTS staff_company_id_idx ON public.staff(company_id);
CREATE INDEX IF NOT EXISTS customers_company_id_idx ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS leads_company_id_idx ON public.leads(company_id);
CREATE INDEX IF NOT EXISTS jobs_company_id_idx ON public.jobs(company_id);
CREATE INDEX IF NOT EXISTS invoices_company_id_idx ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS transactions_company_id_idx ON public.transactions(company_id);
CREATE INDEX IF NOT EXISTS payroll_records_company_id_idx ON public.payroll_records(company_id);
CREATE INDEX IF NOT EXISTS payroll_rules_company_id_idx ON public.payroll_rules(company_id);
CREATE INDEX IF NOT EXISTS conversations_company_id_idx ON public.conversations(company_id);
CREATE INDEX IF NOT EXISTS automation_configs_company_id_idx ON public.automation_configs(company_id);
CREATE INDEX IF NOT EXISTS automation_logs_company_id_idx ON public.automation_logs(company_id);
CREATE INDEX IF NOT EXISTS broadcast_messages_company_id_idx ON public.broadcast_messages(company_id);
CREATE INDEX IF NOT EXISTS transaction_rules_company_id_idx ON public.transaction_rules(company_id);
CREATE INDEX IF NOT EXISTS roles_company_id_idx ON public.roles(company_id);
CREATE INDEX IF NOT EXISTS support_tickets_company_user_idx ON public.support_tickets(company_id, user_id);
CREATE INDEX IF NOT EXISTS jobs_company_customer_idx ON public.jobs(company_id, customer_id);
CREATE INDEX IF NOT EXISTS invoices_company_customer_idx ON public.invoices(company_id, customer_id);
CREATE INDEX IF NOT EXISTS conversations_company_customer_idx ON public.conversations(company_id, customer_id);
