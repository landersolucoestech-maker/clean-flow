-- Every invoice produces exactly one linked revenue transaction in the same
-- PostgreSQL transaction. Legacy browser code that attempts a second insert is
-- rejected by the existing invoice-note uniqueness rule without compromising
-- the already-created atomic pair.

CREATE OR REPLACE FUNCTION public.ensure_invoice_revenue_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.transactions (
    company_id,
    invoice_id,
    name,
    description,
    date,
    category,
    status,
    amount,
    type,
    notes
  )
  VALUES (
    NEW.company_id,
    NEW.id,
    'Invoice ' || NEW.invoice_number,
    'Invoice ' || NEW.invoice_number,
    coalesce(NEW.issue_date, current_date),
    'Cleaning Revenue',
    CASE WHEN NEW.status = 'paid' THEN 'concluido' ELSE 'pendente' END,
    NEW.total,
    'receita',
    'Invoice ID: ' || NEW.id::text
  )
  ON CONFLICT (invoice_id) WHERE invoice_id IS NOT NULL DO NOTHING;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION public.ensure_invoice_revenue_transaction() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ensure_invoice_revenue_transaction ON public.invoices;
CREATE TRIGGER ensure_invoice_revenue_transaction
AFTER INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.ensure_invoice_revenue_transaction();

-- Keep the linked transaction synchronized with invoice payment state and amount.
CREATE OR REPLACE FUNCTION public.sync_invoice_revenue_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.transactions
  SET
    amount = NEW.total,
    date = coalesce(NEW.issue_date, date),
    status = CASE WHEN NEW.status = 'paid' THEN 'concluido' ELSE status END,
    updated_at = now()
  WHERE invoice_id = NEW.id;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION public.sync_invoice_revenue_transaction() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_invoice_revenue_transaction ON public.invoices;
CREATE TRIGGER sync_invoice_revenue_transaction
AFTER UPDATE OF total, issue_date, status ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_revenue_transaction();
