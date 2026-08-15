import { T } from "@/shared/components/i18n/T";
import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { TeamUserModal } from "@/components/settings/TeamUserModal";
import { AutomationsTab } from "@/components/settings/AutomationsTab";
import { IntegrationsTab } from "@/components/settings/IntegrationsTab";
import { AuditTab } from "@/components/settings/AuditTab";
import { NotificationSettingsSection } from "../components/NotificationSettingsSection";
import { TeamSettingsSection } from "../components/TeamSettingsSection";
import { SecuritySettingsSection } from "../components/SecuritySettingsSection";
import { ProfileSettingsSection } from "../components/ProfileSettingsSection";
import { SettingsTabsNavigation } from "../components/SettingsTabsNavigation";
import { BusinessHoursSettingsSection } from "../components/BusinessHoursSettingsSection";
import { useSettingsNavigation } from "../hooks/useSettingsNavigation";
import { useLanguage } from "@/contexts/useLanguage";
import { useStaff, useCurrentStaff, Staff } from "@/hooks/useStaff";
import { useCompanySettings, useUpdateCompanySettings, BusinessHours } from "@/hooks/useCompanySettings";
import { changeCurrentPassword, loadNotificationPreferences, saveCurrentProfile, saveNotificationPreferences } from "../services/settingsAccountService";
import { useQueryClient } from "@tanstack/react-query";
import {
  User,
  Building2,
  Bell,
  Users,
  Shield,
  Globe,
  Smartphone,
  Mail,
  Key,
  Lock,
  Eye,
  EyeOff,
  Edit,
  Clock,
  Phone,
  MapPin,
  Plus,
  AlertTriangle,
  Zap,
  Link2,
  ClipboardList,
  Star,
  Wallet,
  DollarSign,
} from "lucide-react";

export function Settings() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  
  // Fetch staff from database
  const { data: staffMembers = [], isLoading: isLoadingStaff } = useStaff();
  const { data: currentStaff } = useCurrentStaff();
  const currentRole = currentStaff?.staff_roles?.role;
  const { activeTab, tabs, selectTab, canManageTeam, canManageAutomations } = useSettingsNavigation(currentRole, t);

  // Company settings from database
  const { data: companySettings, isLoading: isLoadingCompany } = useCompanySettings();
  const updateCompanySettings = useUpdateCompanySettings();
  
  // Profile Settings
  const [fullName, setFullName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");

  // Company Settings (local state synced with database)
  const [companyName, setCompanyName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [currency, setCurrency] = useState("USD");
  const [language, setLanguage] = useState("en-US");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [nextdoorReviewUrl, setNextdoorReviewUrl] = useState("");
  const [reviewDelayMinutes, setReviewDelayMinutes] = useState(120);
  const [reviewTrigger, setReviewTrigger] = useState("time_after_finished");
  const [reviewDelayType, setReviewDelayType] = useState("hours");
  const [reviewDelayHours, setReviewDelayHours] = useState(2);
  const [reviewMessageTo, setReviewMessageTo] = useState("text_phone_1");
  const [gpsDistanceThreshold, setGpsDistanceThreshold] = useState(500);
  const [gpsAlertSmsEnabled, setGpsAlertSmsEnabled] = useState(false);
  const [gpsAlertSmsTo, setGpsAlertSmsTo] = useState("");
  const [zellePaymentKey, setZellePaymentKey] = useState("");
  const [venmoPaymentKey, setVenmoPaymentKey] = useState("");
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([
    { day: "Monday", open: "08:00", close: "18:00", isOpen: true },
    { day: "Tuesday", open: "08:00", close: "18:00", isOpen: true },
    { day: "Wednesday", open: "08:00", close: "18:00", isOpen: true },
    { day: "Thursday", open: "08:00", close: "18:00", isOpen: true },
    { day: "Friday", open: "08:00", close: "18:00", isOpen: true },
    { day: "Saturday", open: "09:00", close: "16:00", isOpen: true },
    { day: "Sunday", open: "00:00", close: "00:00", isOpen: false },
  ]);
  
  // Sync company settings from database to local state
  useEffect(() => {
    if (companySettings) {
      setCompanyName(companySettings.trade_name || "");
      setBusinessAddress(companySettings.address || "");
      setBusinessEmail(companySettings.email || "");
      setBusinessPhone(companySettings.phone || "");
      setTimezone(companySettings.timezone || "America/New_York");
      setCurrency(companySettings.currency || "USD");
      setLanguage(companySettings.locale || "en-US");
      setGoogleReviewUrl(companySettings.google_review_url || "");
      setNextdoorReviewUrl(companySettings.nextdoor_review_url || "");
      const delayMins = companySettings.review_delay_minutes ?? 120;
      setReviewDelayMinutes(delayMins);
      setReviewDelayHours(Math.round(delayMins / 60));
      if (companySettings.business_hours) {
        setBusinessHours(companySettings.business_hours);
      }
      setGpsDistanceThreshold(companySettings.gps_distance_threshold ?? 500);
      setGpsAlertSmsEnabled(companySettings.gps_alert_sms_enabled ?? false);
      setGpsAlertSmsTo(companySettings.gps_alert_sms_to ?? "");
      setZellePaymentKey(companySettings.zelle_payment_key ?? "");
      setVenmoPaymentKey(companySettings.venmo_payment_key ?? "");
    }
  }, [companySettings]);

  useEffect(() => {
    if (!currentStaff) return;
    setFullName(currentStaff.name);
    setUserEmail(currentStaff.email || "");
    setUserPhone(currentStaff.phone || "");
  }, [currentStaff]);

  useEffect(() => {
    let active = true;
    void loadNotificationPreferences()
      .then((preferences) => {
        if (!active || !preferences) return;
        setJobUpdatesEmail(preferences.job_updates_email);
        setJobRemindersSms(preferences.job_reminders_sms);
        setPaymentNotificationsEmail(preferences.payment_notifications_email);
        setPaymentAlertsSms(preferences.payment_alerts_sms);
        setCustomerFeedbackSms(preferences.customer_feedback_sms);
        setSystemAlertsSms(preferences.system_alerts_sms);
        setWeeklyReportsEmail(preferences.weekly_reports_email);
      })
      .catch(() => {
        if (active) toast.error("Could not load notification preferences");
      });
    return () => { active = false; };
  }, []);

  // Email Notification Settings
  const [jobUpdatesEmail, setJobUpdatesEmail] = useState(true);
  const [paymentNotificationsEmail, setPaymentNotificationsEmail] = useState(true);
  const [weeklyReportsEmail, setWeeklyReportsEmail] = useState(true);
  // SMS & Push Notification Settings
  const [jobRemindersSms, setJobRemindersSms] = useState(true);
  const [paymentAlertsSms, setPaymentAlertsSms] = useState(true);
  const [customerFeedbackSms, setCustomerFeedbackSms] = useState(true);
  const [systemAlertsSms, setSystemAlertsSms] = useState(true);

  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("all");
  const [teamUserModalOpen, setTeamUserModalOpen] = useState(false);
  const [teamUserModalMode, setTeamUserModalMode] = useState<"create" | "edit">("create");
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  // Security Settings
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState("sms");
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [passwordMinLength, setPasswordMinLength] = useState("8");
  const [requireSpecialChars, setRequireSpecialChars] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");


  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    try {
      const data = await saveCurrentProfile(fullName.trim(), userPhone.trim() || null);
      await queryClient.invalidateQueries({ queryKey: ["staff"] });
      if (data?.auth_metadata_synced === false) {
        toast.warning("Profile saved, but login metadata synchronization needs attention");
      } else {
        toast.success("Profile saved successfully!");
      }
    } catch {
      toast.error("Could not save profile");
    }
  };

  const handleSaveCompany = () => {
    if (!companySettings?.id) {
      toast.error("Company settings not found");
      return;
    }

    // Validate URLs
    if (googleReviewUrl && !googleReviewUrl.startsWith('http')) {
      toast.error("Google Review URL must start with http:// or https://");
      return;
    }
    if (nextdoorReviewUrl && !nextdoorReviewUrl.startsWith('http')) {
      toast.error("Nextdoor Review URL must start with http:// or https://");
      return;
    }
    
    updateCompanySettings.mutate({
      id: companySettings.id,
      trade_name: companyName,
      address: businessAddress,
      email: businessEmail,
      phone: businessPhone,
      timezone: timezone,
      currency: currency,
      locale: language,
      business_hours: businessHours,
      google_review_url: googleReviewUrl || null,
      nextdoor_review_url: nextdoorReviewUrl || null,
      review_delay_minutes: reviewDelayMinutes,
      review_trigger: reviewTrigger,
      review_delay_type: reviewDelayType,
      review_message_to: reviewMessageTo,
      gps_distance_threshold: gpsDistanceThreshold,
      gps_alert_sms_enabled: gpsAlertSmsEnabled,
      gps_alert_sms_to: gpsAlertSmsTo || null,
      zelle_payment_key: zellePaymentKey || null,
      venmo_payment_key: venmoPaymentKey || null,
    });
  };

  const handleSaveNotifications = async () => {
    try {
      await saveNotificationPreferences({
        jobUpdatesEmail,
        jobRemindersSms,
        paymentNotificationsEmail,
        paymentAlertsSms,
        customerFeedbackSms,
        systemAlertsSms,
        weeklyReportsEmail,
      });
      toast.success("Notification preferences saved!");
    } catch (error) {
      if (error instanceof Error && error.message === "AUTHENTICATED_ACCOUNT_NOT_FOUND") {
        toast.error("Authenticated account not found");
        return;
      }
      toast.error("Could not save notification preferences");
    }
  };

  const handleOpenCreateUser = () => {
    setTeamUserModalMode("create");
    setSelectedStaff(null);
    setTeamUserModalOpen(true);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 12) {
      toast.error("Password must be at least 12 characters");
      return;
    }
    try {
      await changeCurrentPassword(currentPassword, newPassword);
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      if (error instanceof Error && error.message === "AUTHENTICATED_ACCOUNT_NOT_FOUND") {
        toast.error("Authenticated account not found");
        return;
      }
      if (error instanceof Error && error.message === "CURRENT_PASSWORD_INCORRECT") {
        toast.error("Current password is incorrect");
        return;
      }
      toast.error("Could not change password");
    }
  };

  const handleUpdateBusinessHours = (index: number, field: string, value: string | boolean) => {
    const updated = [...businessHours];
    updated[index] = { ...updated[index], [field]: value };
    setBusinessHours(updated);
  };

  const renderCompanySettings = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {t("settings.companyInfo")}
          </CardTitle>
          <CardDescription>{t("settings.businessSettings")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("settings.companyName")}</Label>
            <Input 
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("settings.businessAddress")}</Label>
            <Textarea 
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("settings.businessEmail")}</Label>
              <Input 
                type="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.businessPhone")}</Label>
              <Input 
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("settings.timezone")}</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York"><T k="literal.settings.eastern_time_et.e1acb4f5" /></SelectItem>
                  <SelectItem value="America/Chicago"><T k="literal.settings.central_time_ct.91b79ee5" /></SelectItem>
                  <SelectItem value="America/Denver"><T k="literal.settings.mountain_time_mt.477f7cb7" /></SelectItem>
                  <SelectItem value="America/Los_Angeles"><T k="literal.settings.pacific_time_pt.2856e8ed" /></SelectItem>
                  <SelectItem value="America/Sao_Paulo"><T k="literal.settings.brasilia_time_brt.476d60ce" /></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("settings.currency")}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD"><T k="literal.settings.usd_dollar.42b651e0" /></SelectItem>
                  <SelectItem value="EUR"><T k="literal.settings.eur_euro.dd8e746b" /></SelectItem>
                  <SelectItem value="GBP"><T k="literal.settings.gbp_pound.13d37c7c" /></SelectItem>
                  <SelectItem value="BRL"><T k="literal.settings.brl_real.49c46ab7" /></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("settings.language")}</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">English</SelectItem>
                  <SelectItem value="pt-BR">Português</SelectItem>
                  <SelectItem value="es-ES">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <BusinessHoursSettingsSection t={t} businessHours={businessHours} onUpdate={handleUpdateBusinessHours} />

      {/* Grid: Review Links, GPS Settings, Payment Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Review Links */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              <T k="literal.settings.review_links.1e7d1160" />
            </CardTitle>
            <CardDescription><T k="literal.settings.configure_review_links_for_customer_requests.c15a61fa" /></CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <span>🌐</span>
                <T k="literal.settings.google_review_url.fa061482" />
              </Label>
              <Input 
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://search.google.com/local/writereview?placeid=..."
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <span>🏡</span>
                <T k="literal.settings.nextdoor_review_url.5dae9724" />
              </Label>
              <Input 
                value={nextdoorReviewUrl}
                onChange={(e) => setNextdoorReviewUrl(e.target.value)}
                placeholder="https://nextdoor.com/pages/.../recommend"
                className="font-mono text-xs"
              />
            </div>

            <Separator className="my-3" />
            
            <div className="space-y-3">
              <h4 className="font-medium text-sm"><T k="literal.settings.auto_review_settings.e2773bf6" /></h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs"><T k="literal.settings.delay_type.9a4c6b48" /></Label>
                  <Select value={reviewDelayType} onValueChange={setReviewDelayType}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours"><T k="literal.settings.hours.9e25a34e" /></SelectItem>
                      <SelectItem value="minutes"><T k="literal.settings.minutes.092f99ea" /></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">{reviewDelayType === "hours" ? "Hours" : "Minutes"}</Label>
                  <Input 
                    type="number"
                    min={1}
                    max={reviewDelayType === "hours" ? 168 : 10080}
                    value={reviewDelayType === "hours" ? reviewDelayHours : reviewDelayMinutes}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      if (reviewDelayType === "hours") {
                        setReviewDelayHours(val);
                        setReviewDelayMinutes(val * 60);
                      } else {
                        setReviewDelayMinutes(val);
                        setReviewDelayHours(Math.round(val / 60));
                      }
                    }}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs"><T k="literal.settings.message_to.0372a609" /></Label>
                <Select value={reviewMessageTo} onValueChange={setReviewMessageTo}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text_phone_1"><T k="literal.settings.text_phone_1.27612d27" /></SelectItem>
                    <SelectItem value="text_phone_2"><T k="literal.settings.text_phone_2.505cc810" /></SelectItem>
                    <SelectItem value="email"><T k="common.email" /></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GPS Location Settings */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <T k="settings.gpsSettings" />
            </CardTitle>
            <CardDescription><T k="literal.settings.configure_gps_tracking_and_alerts.a015d80e" /></CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">{t("settings.gpsDistanceThreshold")}</Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="number"
                  min={50}
                  max={5000}
                  value={gpsDistanceThreshold}
                  onChange={(e) => setGpsDistanceThreshold(parseInt(e.target.value) || 500)}
                  className="w-24 h-9"
                />
                <span className="text-sm text-muted-foreground"><T k="literal.settings.meters.0aa82f2a" /></span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("settings.gpsDistanceDescription")}
              </p>
            </div>

            <Separator className="my-3" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">{t("settings.gpsAlertSmsEnabled")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.gpsAlertSmsDescription")}
                  </p>
                </div>
                <Switch 
                  checked={gpsAlertSmsEnabled} 
                  onCheckedChange={setGpsAlertSmsEnabled} 
                />
              </div>

              {gpsAlertSmsEnabled && (
                <div className="space-y-2">
                  <Label className="text-sm">{t("settings.gpsAlertSmsTo")}</Label>
                  <Input 
                    type="tel"
                    value={gpsAlertSmsTo}
                    onChange={(e) => setGpsAlertSmsTo(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("settings.gpsAlertSmsToDescription")}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              <T k="literal.settings.payment_settings.1c76298f" />
            </CardTitle>
            <CardDescription><T k="literal.settings.configure_payment_receiving_methods.f9884c0e" /></CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-primary" />
                <T k="literal.settings.zelle_payment_key.c6f28a3f" />
              </Label>
              <Input 
                value={zellePaymentKey}
                onChange={(e) => setZellePaymentKey(e.target.value)}
                placeholder="email@example.com or phone"
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                <T k="literal.settings.zelle_registered_email_or_phone_number.758516c6" />
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-primary" />
                <T k="literal.settings.venmo_payment_key.d6fbf6a1" />
              </Label>
              <Input 
                value={venmoPaymentKey}
                onChange={(e) => setVenmoPaymentKey(e.target.value)}
                placeholder="@username"
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                <T k="literal.settings.venmo_username_or_link.5b00a244" />
              </p>
            </div>

            <Separator className="my-3" />

            <div className="rounded-md border border-border bg-muted/35 p-2.5">
              <h4 className="font-medium text-xs flex items-center gap-2 mb-1">
                <Zap className="w-3 h-3 text-warning" />
                <T k="literal.settings.how_it_works.1dd6a17c" />
              </h4>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                <li>• Customer's preferred method selects the link</li>
                <li>• Auto-included in invoices & reminders</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button variant="hero" onClick={handleSaveCompany}>
          {t("settings.saveChanges")}
        </Button>
      </div>
    </div>
  );



  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <ProfileSettingsSection
            t={t}
            fullName={fullName}
            setFullName={setFullName}
            userEmail={userEmail}
            userPhone={userPhone}
            setUserPhone={setUserPhone}
            onSave={handleSaveProfile}
          />
        );
      case "company":
        return renderCompanySettings();
      case "notifications":
        return (
          <NotificationSettingsSection
            t={t}
            jobUpdatesEmail={jobUpdatesEmail}
            setJobUpdatesEmail={setJobUpdatesEmail}
            jobRemindersSms={jobRemindersSms}
            setJobRemindersSms={setJobRemindersSms}
            paymentNotificationsEmail={paymentNotificationsEmail}
            setPaymentNotificationsEmail={setPaymentNotificationsEmail}
            paymentAlertsSms={paymentAlertsSms}
            setPaymentAlertsSms={setPaymentAlertsSms}
            customerFeedbackSms={customerFeedbackSms}
            setCustomerFeedbackSms={setCustomerFeedbackSms}
            systemAlertsSms={systemAlertsSms}
            setSystemAlertsSms={setSystemAlertsSms}
            weeklyReportsEmail={weeklyReportsEmail}
            setWeeklyReportsEmail={setWeeklyReportsEmail}
            onSave={handleSaveNotifications}
          />
        );
      case "team":
        return (
          <TeamSettingsSection
            t={t}
            staffMembers={staffMembers}
            isLoadingStaff={isLoadingStaff}
            teamSearchQuery={teamSearchQuery}
            setTeamSearchQuery={setTeamSearchQuery}
            newMemberRole={newMemberRole}
            setNewMemberRole={setNewMemberRole}
            canManageTeam={canManageTeam}
            onCreateUser={handleOpenCreateUser}
            onEditStaff={(staff) => {
              setSelectedStaff(staff);
              setTeamUserModalMode("edit");
              setTeamUserModalOpen(true);
            }}
          />
        );
      case "security":
        return (
          <SecuritySettingsSection
            t={t}
            showCurrentPassword={showCurrentPassword}
            setShowCurrentPassword={setShowCurrentPassword}
            showNewPassword={showNewPassword}
            setShowNewPassword={setShowNewPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            currentPassword={currentPassword}
            setCurrentPassword={setCurrentPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            onChangePassword={handleChangePassword}
            twoFactorEnabled={twoFactorEnabled}
            twoFactorMethod={twoFactorMethod}
            setTwoFactorMethod={setTwoFactorMethod}
            sessionTimeout={sessionTimeout}
            setSessionTimeout={setSessionTimeout}
            passwordMinLength={passwordMinLength}
            setPasswordMinLength={setPasswordMinLength}
            requireSpecialChars={requireSpecialChars}
          />
        );
      case "automations":
        return <AutomationsTab />;
      case "integrations":
        return <IntegrationsTab />;
      case "audit":
        return <AuditTab />;
      default:
        return (
          <ProfileSettingsSection
            t={t}
            fullName={fullName}
            setFullName={setFullName}
            userEmail={userEmail}
            userPhone={userPhone}
            setUserPhone={setUserPhone}
            onSave={handleSaveProfile}
          />
        );
    }
  };

  return (
    <PageLayout>
          <div className="space-y-3">
{/* Horizontal Tabs */}
            <SettingsTabsNavigation
              tabs={tabs}
              activeTab={activeTab}
              onChange={selectTab}
            />

            {/* Content Area */}
            <div>
              {renderContent()}
            </div>
          </div>

      <TeamUserModal
        open={teamUserModalOpen}
        onOpenChange={(open) => {
          setTeamUserModalOpen(open);
          if (!open) setSelectedStaff(null);
        }}
        mode={teamUserModalMode}
        staff={selectedStaff}
        canDelete={selectedStaff?.id !== currentStaff?.id}
      />
    </PageLayout>
  );
}
