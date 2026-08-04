CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  job_updates_email boolean NOT NULL DEFAULT true,
  job_reminders_sms boolean NOT NULL DEFAULT true,
  payment_notifications_email boolean NOT NULL DEFAULT true,
  payment_alerts_sms boolean NOT NULL DEFAULT true,
  customer_feedback_sms boolean NOT NULL DEFAULT true,
  system_alerts_sms boolean NOT NULL DEFAULT true,
  weekly_reports_email boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notification_preferences TO authenticated;

DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at
ON public.user_notification_preferences;
CREATE TRIGGER update_user_notification_preferences_updated_at
BEFORE UPDATE ON public.user_notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS own_notification_preferences
ON public.user_notification_preferences;
CREATE POLICY own_notification_preferences
ON public.user_notification_preferences FOR ALL TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

