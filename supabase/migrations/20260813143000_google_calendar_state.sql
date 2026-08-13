CREATE TABLE IF NOT EXISTS public.google_calendar_preferences (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.company_settings(id) ON DELETE RESTRICT,
  selected_calendar_id text NOT NULL DEFAULT 'primary',
  leads_calendar_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.google_calendar_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company_settings(id) ON DELETE RESTRICT,
  entity_type text NOT NULL CHECK (entity_type IN ('job', 'lead')),
  entity_id uuid NOT NULL,
  calendar_id text NOT NULL,
  event_id text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, entity_type, entity_id),
  UNIQUE (company_id, calendar_id, event_id)
);

ALTER TABLE public.google_calendar_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_mappings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_calendar_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_calendar_mappings TO authenticated;

DROP POLICY IF EXISTS own_google_calendar_preferences ON public.google_calendar_preferences;
CREATE POLICY own_google_calendar_preferences
ON public.google_calendar_preferences FOR ALL TO authenticated
USING (auth_user_id = auth.uid() AND company_id = public.current_company_id())
WITH CHECK (auth_user_id = auth.uid() AND company_id = public.current_company_id());

DROP POLICY IF EXISTS tenant_google_calendar_mappings ON public.google_calendar_mappings;
CREATE POLICY tenant_google_calendar_mappings
ON public.google_calendar_mappings FOR ALL TO authenticated
USING (public.is_management_staff() AND company_id = public.current_company_id())
WITH CHECK (public.is_management_staff() AND company_id = public.current_company_id());

DROP TRIGGER IF EXISTS update_google_calendar_preferences_updated_at ON public.google_calendar_preferences;
CREATE TRIGGER update_google_calendar_preferences_updated_at
BEFORE UPDATE ON public.google_calendar_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_google_calendar_mappings_updated_at ON public.google_calendar_mappings;
CREATE TRIGGER update_google_calendar_mappings_updated_at
BEFORE UPDATE ON public.google_calendar_mappings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS google_calendar_mappings_entity_idx
  ON public.google_calendar_mappings(company_id, entity_type, entity_id);
