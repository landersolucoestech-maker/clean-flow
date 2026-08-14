import { supabase } from "@/integrations/supabase/client";

export interface NotificationPreferencesInput {
  jobUpdatesEmail: boolean;
  jobRemindersSms: boolean;
  paymentNotificationsEmail: boolean;
  paymentAlertsSms: boolean;
  customerFeedbackSms: boolean;
  systemAlertsSms: boolean;
  weeklyReportsEmail: boolean;
}

export async function loadNotificationPreferences() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return null;

  const { data, error } = await supabase
    .from("user_notification_preferences")
    .select("*")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveNotificationPreferences(input: NotificationPreferencesInput) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("AUTHENTICATED_ACCOUNT_NOT_FOUND");

  const { error } = await supabase.from("user_notification_preferences").upsert({
    auth_user_id: authData.user.id,
    job_updates_email: input.jobUpdatesEmail,
    job_reminders_sms: input.jobRemindersSms,
    payment_notifications_email: input.paymentNotificationsEmail,
    payment_alerts_sms: input.paymentAlertsSms,
    customer_feedback_sms: input.customerFeedbackSms,
    system_alerts_sms: input.systemAlertsSms,
    weekly_reports_email: input.weeklyReportsEmail,
  });

  if (error) throw error;
}

export async function saveCurrentProfile(name: string, phone: string | null) {
  const { data, error } = await supabase.functions.invoke("manage-staff", {
    body: { action: "update-profile", name, phone },
  });
  if (error) throw error;
  return data as { auth_metadata_synced?: boolean } | null;
}

export async function changeCurrentPassword(currentPassword: string, newPassword: string) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const email = authData.user?.email;
  if (!email) throw new Error("AUTHENTICATED_ACCOUNT_NOT_FOUND");

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (reauthError) throw new Error("CURRENT_PASSWORD_INCORRECT");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
