-- Protect historical/financial records from accidental customer deletion and
-- replace text-only invoice/transaction linkage with a real foreign key.

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_customer_id_fkey;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS estimates_customer_id_fkey;
ALTER TABLE public.leads
  ADD CONSTRAINT estimates_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE RESTRICT;

-- Backfill the legacy note-encoded relationship where it can be proven.
UPDATE public.transactions t
SET invoice_id = match.invoice_id
FROM (
  SELECT id AS transaction_id,
         substring(notes FROM 'Invoice ID: ([a-f0-9-]+)')::uuid AS invoice_id
  FROM public.transactions
  WHERE invoice_id IS NULL
    AND notes ~ 'Invoice ID: [a-f0-9-]{36}'
) match
JOIN public.invoices i ON i.id = match.invoice_id
WHERE t.id = match.transaction_id
  AND (t.company_id IS NULL OR i.company_id IS NULL OR t.company_id = i.company_id);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_invoice_id_unique
  ON public.transactions (invoice_id)
  WHERE invoice_id IS NOT NULL;

-- Global sequence removes the MAX()+1 race from invoice number allocation.
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1;
SELECT setval(
  'public.invoice_number_seq',
  greatest(
    1,
    coalesce((SELECT max(substring(invoice_number FROM '[0-9]+$')::bigint) FROM public.invoices), 0) + 1
  ),
  false
);

CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'INV-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0')
$$;

REVOKE ALL ON FUNCTION public.next_invoice_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_company_invoice_number_key
  ON public.invoices (company_id, invoice_number)
  WHERE company_id IS NOT NULL;

-- Auto-generated standard invoices must be idempotent per job.
CREATE UNIQUE INDEX IF NOT EXISTS invoices_auto_generated_job_key
  ON public.invoices (company_id, job_id)
  WHERE company_id IS NOT NULL AND job_id IS NOT NULL AND auto_generated = true;

-- Atomic browser-side manual invoice + financial transaction creation.
CREATE OR REPLACE FUNCTION public.create_invoice_with_transaction(
  invoice_payload jsonb,
  transaction_payload jsonb
)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_id uuid := public.current_company_id();
  created_invoice public.invoices;
BEGIN
  IF auth.uid() IS NULL OR tenant_id IS NULL OR NOT public.is_finance_staff() THEN
    RAISE EXCEPTION 'Finance authorization required';
  END IF;

  INSERT INTO public.invoices (
    company_id, customer_id, job_id, lead_id, invoice_number, status,
    issue_date, due_date, subtotal, tax_rate, tax_amount, total, amount_paid,
    notes, created_by, invoice_type, auto_generated
  ) VALUES (
    tenant_id,
    (invoice_payload ->> 'customer_id')::uuid,
    nullif(invoice_payload ->> 'job_id', '')::uuid,
    nullif(invoice_payload ->> 'lead_id', '')::uuid,
    coalesce(nullif(invoice_payload ->> 'invoice_number', ''), public.next_invoice_number()),
    coalesce(nullif(invoice_payload ->> 'status', ''), 'draft'),
    coalesce(nullif(invoice_payload ->> 'issue_date', '')::date, current_date),
    nullif(invoice_payload ->> 'due_date', '')::date,
    coalesce((invoice_payload ->> 'subtotal')::numeric, 0),
    coalesce((invoice_payload ->> 'tax_rate')::numeric, 0),
    coalesce((invoice_payload ->> 'tax_amount')::numeric, 0),
    coalesce((invoice_payload ->> 'total')::numeric, 0),
    coalesce((invoice_payload ->> 'amount_paid')::numeric, 0),
    nullif(invoice_payload ->> 'notes', ''),
    nullif(invoice_payload ->> 'created_by', ''),
    coalesce(nullif(invoice_payload ->> 'invoice_type', ''), 'standard'),
    coalesce((invoice_payload ->> 'auto_generated')::boolean, false)
  )
  RETURNING * INTO created_invoice;

  INSERT INTO public.transactions (
    company_id, invoice_id, date, description, category, amount, type,
    service_type, notes
  ) VALUES (
    tenant_id,
    created_invoice.id,
    coalesce(nullif(transaction_payload ->> 'date', '')::date, current_date),
    coalesce(nullif(transaction_payload ->> 'description', ''), 'Invoice ' || created_invoice.invoice_number),
    nullif(transaction_payload ->> 'category', ''),
    coalesce((transaction_payload ->> 'amount')::numeric, created_invoice.total),
    coalesce(nullif(transaction_payload ->> 'type', ''), 'receita'),
    nullif(transaction_payload ->> 'service_type', ''),
    nullif(transaction_payload ->> 'notes', '')
  );

  RETURN created_invoice;
END
$$;

REVOKE ALL ON FUNCTION public.create_invoice_with_transaction(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invoice_with_transaction(jsonb, jsonb) TO authenticated;
