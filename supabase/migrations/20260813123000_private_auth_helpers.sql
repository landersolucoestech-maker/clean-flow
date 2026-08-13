-- Privileged identity lookups belong in a non-exposed schema. Public wrappers
-- are SECURITY INVOKER and expose only the caller's own derived identity.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.current_staff_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
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

CREATE OR REPLACE FUNCTION private.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT s.company_id
  FROM public.staff s
  WHERE s.id = private.current_staff_id()
    AND s.is_active = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.current_staff_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT sr.role
  FROM public.staff_roles sr
  WHERE sr.staff_id = private.current_staff_id()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.is_current_staff_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.current_staff_id() IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION private.is_management_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.current_staff_role() IN (
    'admin', 'virtual_assistant', 'office_manager', 'cleaning_manager'
  )
$$;

CREATE OR REPLACE FUNCTION private.is_finance_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.current_staff_role() IN ('admin', 'office_manager')
$$;

CREATE OR REPLACE FUNCTION private.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.platform_admins p
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
    )
$$;

REVOKE ALL ON FUNCTION private.current_staff_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.current_company_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.current_staff_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_current_staff_active() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_management_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_finance_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_staff_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_company_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_staff_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_current_staff_active() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_management_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_finance_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_platform_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_staff_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.current_staff_id() $$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.current_company_id() $$;

CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.current_staff_role() $$;

CREATE OR REPLACE FUNCTION public.is_current_staff_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.is_current_staff_active() $$;

CREATE OR REPLACE FUNCTION public.is_management_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.is_management_staff() $$;

CREATE OR REPLACE FUNCTION public.is_finance_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.is_finance_staff() $$;

CREATE OR REPLACE FUNCTION public.is_current_company(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT _company_id IS NOT NULL AND _company_id = private.current_company_id() $$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT coalesce(_user_id = auth.uid(), false) AND private.is_platform_admin() $$;

REVOKE ALL ON FUNCTION public.current_staff_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_company_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_staff_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_current_staff_active() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_management_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_finance_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_current_company(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_staff_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_staff_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_staff_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_management_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_finance_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;

-- Privileged workflow RPCs can run as the caller because RLS now enforces the
-- same tenant and role invariants on the underlying rows.
ALTER FUNCTION public.create_support_ticket_atomic(text, text, public.ticket_priority, public.ticket_category)
  SECURITY INVOKER;
ALTER FUNCTION public.add_support_ticket_message_atomic(uuid, text)
  SECURITY INVOKER;
ALTER FUNCTION public.save_customer_with_addresses(uuid, jsonb, jsonb)
  SECURITY INVOKER;
ALTER FUNCTION public.create_invoice_with_transaction(jsonb, jsonb)
  SECURITY INVOKER;
ALTER FUNCTION public.ensure_invoice_revenue_transaction()
  SECURITY INVOKER;
ALTER FUNCTION public.sync_invoice_revenue_transaction()
  SECURITY INVOKER;
ALTER FUNCTION public.claim_automation_delivery(uuid, uuid, text, uuid, uuid, uuid, text)
  SECURITY INVOKER;
ALTER FUNCTION public.finish_automation_delivery(uuid, uuid, text, text, text, text, text)
  SECURITY INVOKER;

-- Trigger helpers are not Data API endpoints.
REVOKE ALL ON FUNCTION public.ensure_invoice_revenue_transaction() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_invoice_revenue_transaction() FROM PUBLIC, anon, authenticated;
