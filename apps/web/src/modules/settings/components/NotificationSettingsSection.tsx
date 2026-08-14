import type { Dispatch, SetStateAction } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

type Translate = (key: string) => string;

interface NotificationSettingsSectionProps {
  t: Translate;
  jobUpdatesEmail: boolean;
  setJobUpdatesEmail: Dispatch<SetStateAction<boolean>>;
  jobRemindersSms: boolean;
  setJobRemindersSms: Dispatch<SetStateAction<boolean>>;
  paymentNotificationsEmail: boolean;
  setPaymentNotificationsEmail: Dispatch<SetStateAction<boolean>>;
  paymentAlertsSms: boolean;
  setPaymentAlertsSms: Dispatch<SetStateAction<boolean>>;
  customerFeedbackSms: boolean;
  setCustomerFeedbackSms: Dispatch<SetStateAction<boolean>>;
  systemAlertsSms: boolean;
  setSystemAlertsSms: Dispatch<SetStateAction<boolean>>;
  weeklyReportsEmail: boolean;
  setWeeklyReportsEmail: Dispatch<SetStateAction<boolean>>;
  onSave: () => void;
}

export function NotificationSettingsSection({
  t,
  jobUpdatesEmail,
  setJobUpdatesEmail,
  jobRemindersSms,
  setJobRemindersSms,
  paymentNotificationsEmail,
  setPaymentNotificationsEmail,
  paymentAlertsSms,
  setPaymentAlertsSms,
  customerFeedbackSms,
  setCustomerFeedbackSms,
  systemAlertsSms,
  setSystemAlertsSms,
  weeklyReportsEmail,
  setWeeklyReportsEmail,
  onSave,
}: NotificationSettingsSectionProps) {
  const items = [
    ["settings.jobUpdates", "settings.whenJobStatusChanges", jobUpdatesEmail, setJobUpdatesEmail],
    ["settings.jobReminders", "settings.whenJobIsComing", jobRemindersSms, setJobRemindersSms],
    ["settings.paymentReceived", "settings.whenSomeonePays", paymentNotificationsEmail, setPaymentNotificationsEmail],
    ["settings.paymentFailed", "settings.whenPaymentFails", paymentAlertsSms, setPaymentAlertsSms],
    ["settings.feedbackAlerts", "settings.whenClientLeavesReview", customerFeedbackSms, setCustomerFeedbackSms],
    ["settings.systemAlerts", "settings.errorsDisconnections", systemAlertsSms, setSystemAlertsSms],
    ["settings.weeklyReports", "settings.everyMonday", weeklyReportsEmail, setWeeklyReportsEmail],
  ] as const;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("settings.notifications")}
          </CardTitle>
          <CardDescription>{t("settings.configureNotifications")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map(([titleKey, descriptionKey, checked, onCheckedChange]) => (
            <div key={titleKey} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <h4 className="font-medium">{t(titleKey)}</h4>
                <p className="text-sm text-muted-foreground">{t(descriptionKey)}</p>
              </div>
              <Switch checked={checked} onCheckedChange={onCheckedChange} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={onSave} variant="hero">
        {t("settings.saveChanges")}
      </Button>
    </div>
  );
}
