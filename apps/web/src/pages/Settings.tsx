import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { useStaff, useCurrentStaff, Staff } from "@/hooks/useStaff";
import { useCompanySettings, useUpdateCompanySettings, BusinessHours } from "@/hooks/useCompanySettings";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useSearchParams } from "react-router-dom";
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

type SettingsTab = "profile" | "company" | "notifications" | "team" | "security" | "automations" | "integrations" | "audit";

const SETTINGS_TABS: SettingsTab[] = ["profile", "company", "notifications", "team", "security", "automations", "integrations", "audit"];

function isSettingsTab(value: string | null): value is SettingsTab {
  return value !== null && SETTINGS_TABS.includes(value as SettingsTab);
}

const STAFF_ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "cleaner", label: "Cleaner" },
  { value: "driver", label: "Driver" },
  { value: "cleaning_manager", label: "Cleaning Manager Team" },
  { value: "office_manager", label: "Office Manager" },
  { value: "virtual_assistant", label: "Virtual Assistant" },
] as const;

export function Settings() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  
  // Fetch staff from database
  const { data: staffMembers = [], isLoading: isLoadingStaff } = useStaff();
  const { data: currentStaff } = useCurrentStaff();
  const currentRole = currentStaff?.staff_roles?.role;
  const canManageTeam = currentRole === "admin" || currentRole === "office_manager";
  const canManageAutomations = canManageTeam || currentRole === "cleaning_manager" || currentRole === "virtual_assistant";

  useEffect(() => {
    if (!currentRole) return;
    const desiredTab = location.pathname === "/integrations" ? "integrations" : requestedTab;
    if (!isSettingsTab(desiredTab)) {
      setActiveTab("profile");
      return;
    }
    const baseTab = ["profile", "notifications", "security"].includes(desiredTab);
    const automationTab = desiredTab === "automations" && canManageAutomations;
    const administrativeTab = ["company", "team", "integrations", "audit"].includes(desiredTab) && canManageTeam;
    setActiveTab(baseTab || automationTab || administrativeTab ? desiredTab : "profile");
  }, [canManageAutomations, canManageTeam, currentRole, location.pathname, requestedTab]);
  
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
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: preferences } = await supabase
        .from("user_notification_preferences")
        .select("*")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();
      if (!active || !preferences) return;
      setJobUpdatesEmail(preferences.job_updates_email);
      setJobRemindersSms(preferences.job_reminders_sms);
      setPaymentNotificationsEmail(preferences.payment_notifications_email);
      setPaymentAlertsSms(preferences.payment_alerts_sms);
      setCustomerFeedbackSms(preferences.customer_feedback_sms);
      setSystemAlertsSms(preferences.system_alerts_sms);
      setWeeklyReportsEmail(preferences.weekly_reports_email);
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
    const { data, error } = await supabase.functions.invoke("manage-staff", {
      body: { action: "update-profile", name: fullName.trim(), phone: userPhone.trim() || null },
    });
    if (error) {
      toast.error("Could not save profile");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["staff"] });
    if (data?.auth_metadata_synced === false) {
      toast.warning("Profile saved, but login metadata synchronization needs attention");
    } else {
      toast.success("Profile saved successfully!");
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
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      toast.error("Authenticated account not found");
      return;
    }
    const { error } = await supabase.from("user_notification_preferences").upsert({
      auth_user_id: authData.user.id,
      job_updates_email: jobUpdatesEmail,
      job_reminders_sms: jobRemindersSms,
      payment_notifications_email: paymentNotificationsEmail,
      payment_alerts_sms: paymentAlertsSms,
      customer_feedback_sms: customerFeedbackSms,
      system_alerts_sms: systemAlertsSms,
      weekly_reports_email: weeklyReportsEmail,
    });
    if (error) {
      toast.error("Could not save notification preferences");
      return;
    }
    toast.success("Notification preferences saved!");
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
    const { data: authData } = await supabase.auth.getUser();
    const email = authData.user?.email;
    if (!email) {
      toast.error("Authenticated account not found");
      return;
    }
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (reauthError) {
      toast.error("Current password is incorrect");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error("Could not change password");
      return;
    }
    toast.success("Password changed successfully");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleUpdateBusinessHours = (index: number, field: string, value: string | boolean) => {
    const updated = [...businessHours];
    updated[index] = { ...updated[index], [field]: value };
    setBusinessHours(updated);
  };

  const tabs = [
    { id: "profile" as SettingsTab, label: t("settings.profile"), icon: User },
    { id: "notifications" as SettingsTab, label: t("settings.notifications"), icon: Bell },
    { id: "security" as SettingsTab, label: t("settings.security"), icon: Shield },
    ...(canManageTeam ? [
      { id: "company" as SettingsTab, label: t("settings.company"), icon: Building2 },
      { id: "team" as SettingsTab, label: t("settings.team"), icon: Users },
    ] : []),
    ...(canManageAutomations ? [
      { id: "automations" as SettingsTab, label: "Automations", icon: Zap },
    ] : []),
    ...(canManageTeam ? [
      { id: "integrations" as SettingsTab, label: t("settings.integrations"), icon: Link2 },
      { id: "audit" as SettingsTab, label: t("audit.title"), icon: ClipboardList },
    ] : []),
  ];

  const renderProfileSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          {t("settings.personalInfo")}
        </CardTitle>
        <CardDescription>{t("settings.updateProfileInfo")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Image */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold text-foreground">
            {fullName.charAt(0)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>{t("settings.fullName")}</Label>
            <Input 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("settings.enterFullName")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("common.email")}</Label>
            <Input 
              type="email"
              value={userEmail}
              readOnly
              aria-readonly="true"
              placeholder={t("settings.enterEmail")}
            />
            <p className="text-xs text-muted-foreground">Login email changes are managed by an administrator.</p>
          </div>
        </div>

        <div className="space-y-2 max-w-md">
          <Label>{t("common.phone")}</Label>
          <Input 
            value={userPhone}
            onChange={(e) => setUserPhone(e.target.value)}
            placeholder="(00) 00000-0000"
          />
        </div>

        <Button onClick={handleSaveProfile} variant="hero">
          {t("settings.saveChanges")}
        </Button>
      </CardContent>
    </Card>
  );

  const renderCompanySettings = () => (
    <div className="space-y-6">
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
                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="America/Sao_Paulo">Brasília Time (BRT)</SelectItem>
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
                  <SelectItem value="USD">USD - Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - Pound</SelectItem>
                  <SelectItem value="BRL">BRL - Real</SelectItem>
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

      {/* Business Hours */}
      <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t("settings.businessHours")}
          </CardTitle>
          <CardDescription>{t("settings.setOperatingHours")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {businessHours.map((schedule, index) => (
              <div key={schedule.day} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <Switch 
                    checked={schedule.isOpen}
                    onCheckedChange={(checked) => handleUpdateBusinessHours(index, "isOpen", checked)}
                  />
                  <span className="font-medium w-24">{schedule.day}</span>
                  {schedule.isOpen ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={schedule.open}
                        onChange={(e) => handleUpdateBusinessHours(index, "open", e.target.value)}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">{t("settings.to")}</span>
                      <Input
                        type="time"
                        value={schedule.close}
                        onChange={(e) => handleUpdateBusinessHours(index, "close", e.target.value)}
                        className="w-32"
                      />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{t("settings.closed")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grid: Review Links, GPS Settings, Payment Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Review Links */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Review Links
            </CardTitle>
            <CardDescription>Configure review links for customer requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <span>🌐</span>
                Google Review URL
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
                Nextdoor Review URL
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
              <h4 className="font-medium text-sm">Auto Review Settings</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Delay Type</Label>
                  <Select value={reviewDelayType} onValueChange={setReviewDelayType}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="minutes">Minutes</SelectItem>
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
                <Label className="text-xs">Message To</Label>
                <Select value={reviewMessageTo} onValueChange={setReviewMessageTo}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text_phone_1">Text Phone 1</SelectItem>
                    <SelectItem value="text_phone_2">Text Phone 2</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
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
              GPS Location Settings
            </CardTitle>
            <CardDescription>Configure GPS tracking and alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
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
                <span className="text-sm text-muted-foreground">meters</span>
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
              Payment Settings
            </CardTitle>
            <CardDescription>Configure payment receiving methods</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-primary" />
                Zelle Payment Key
              </Label>
              <Input 
                value={zellePaymentKey}
                onChange={(e) => setZellePaymentKey(e.target.value)}
                placeholder="email@example.com or phone"
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Zelle registered email or phone number
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-blue-500" />
                Venmo Payment Key
              </Label>
              <Input 
                value={venmoPaymentKey}
                onChange={(e) => setVenmoPaymentKey(e.target.value)}
                placeholder="@username"
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Venmo username or link
              </p>
            </div>

            <Separator className="my-3" />

            <div className="p-3 bg-muted/50 rounded-lg border border-border">
              <h4 className="font-medium text-xs flex items-center gap-2 mb-1">
                <Zap className="w-3 h-3 text-amber-500" />
                How it works
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

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {t("settings.notifications")}
          </CardTitle>
          <CardDescription>{t("settings.configureNotifications")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div>
              <h4 className="font-medium">{t("settings.jobUpdates")}</h4>
              <p className="text-sm text-muted-foreground">{t("settings.whenJobStatusChanges")}</p>
            </div>
            <Switch checked={jobUpdatesEmail} onCheckedChange={setJobUpdatesEmail} />
          </div>

          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div>
              <h4 className="font-medium">{t("settings.jobReminders")}</h4>
              <p className="text-sm text-muted-foreground">{t("settings.whenJobIsComing")}</p>
            </div>
            <Switch checked={jobRemindersSms} onCheckedChange={setJobRemindersSms} />
          </div>

          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div>
              <h4 className="font-medium">{t("settings.paymentReceived")}</h4>
              <p className="text-sm text-muted-foreground">{t("settings.whenSomeonePays")}</p>
            </div>
            <Switch checked={paymentNotificationsEmail} onCheckedChange={setPaymentNotificationsEmail} />
          </div>

          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div>
              <h4 className="font-medium">{t("settings.paymentFailed")}</h4>
              <p className="text-sm text-muted-foreground">{t("settings.whenPaymentFails")}</p>
            </div>
            <Switch checked={paymentAlertsSms} onCheckedChange={setPaymentAlertsSms} />
          </div>

          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div>
              <h4 className="font-medium">{t("settings.feedbackAlerts")}</h4>
              <p className="text-sm text-muted-foreground">{t("settings.whenClientLeavesReview")}</p>
            </div>
            <Switch checked={customerFeedbackSms} onCheckedChange={setCustomerFeedbackSms} />
          </div>

          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div>
              <h4 className="font-medium">{t("settings.systemAlerts")}</h4>
              <p className="text-sm text-muted-foreground">{t("settings.errorsDisconnections")}</p>
            </div>
            <Switch checked={systemAlertsSms} onCheckedChange={setSystemAlertsSms} />
          </div>

          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div>
              <h4 className="font-medium">{t("settings.weeklyReports")}</h4>
              <p className="text-sm text-muted-foreground">{t("settings.everyMonday")}</p>
            </div>
            <Switch checked={weeklyReportsEmail} onCheckedChange={setWeeklyReportsEmail} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSaveNotifications} variant="hero">
        {t("settings.saveChanges")}
      </Button>
    </div>
  );

  const renderTeamSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t("settings.manageTeamTitle")}
          </CardTitle>
          <CardDescription>{t("settings.userAccessManagement")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input 
                placeholder={t("settings.searchByName")}
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
              />
            </div>
            <Select value={newMemberRole} onValueChange={setNewMemberRole}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t("settings.selectRole")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {STAFF_ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canManageTeam && (
              <Button onClick={handleOpenCreateUser} variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                {t("settings.addTeamMember")}
              </Button>
            )}
          </div>

          <Separator />

          {isLoadingStaff ? (
            <div className="text-center py-8 text-muted-foreground">{t("settings.loadingStaff")}</div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {staffMembers
                .filter((staff) => {
                  // Filter by name search
                  const matchesSearch = !teamSearchQuery || 
                    staff.name.toLowerCase().includes(teamSearchQuery.toLowerCase());
                  
                  // Filter by role
                  if (newMemberRole === "all") return matchesSearch;
                  
                  const staffRole = staff.staff_roles?.role || (staff.is_driver ? "driver" : "cleaner");
                  
                  const matchesRole = staffRole === newMemberRole;
                  
                  return matchesSearch && matchesRole;
                })
                .map((staff) => (
                <div key={staff.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-medium">
                        {staff.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium">{staff.name}</h4>
                      <p className="text-sm text-muted-foreground">{staff.email || t("settings.noEmail")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {staff.payment_method && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 capitalize">
                        {staff.payment_method === "quickbooks" ? "QuickBooks" : staff.payment_method}
                      </Badge>
                    )}
                    {(() => {
                      const role = staff.staff_roles?.role || (staff.is_driver ? "driver" : "cleaner");
                      const showTeam = role === "driver" || role === "cleaner";
                      
                      if (!showTeam) return null;
                      
                      return staff.team ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Team {staff.team}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Sem Team
                        </Badge>
                      );
                    })()}
                    {(() => {
                      const role = staff.staff_roles?.role || (staff.is_driver ? "driver" : "cleaner");
                      const label =
                        role === "admin" ? "Admin" :
                        role === "driver" ? "Driver" :
                        role === "cleaning_manager" ? "Cleaning Manager Team" :
                        role === "cleaner" ? "Cleaner" :
                        role === "office_manager" ? "Office Manager" :
                        role === "virtual_assistant" ? "Virtual Assistant" :
                        role;

                      return (
                        <Badge variant={role === "driver" ? "default" : "secondary"}>
                          {label}
                        </Badge>
                      );
                    })()}
                    <Badge variant={staff.is_active ? "default" : "outline"}>
                      {staff.is_active ? t("common.active") : t("common.inactive")}
                    </Badge>
                    {canManageTeam && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedStaff(staff);
                          setTeamUserModalMode("edit");
                          setTeamUserModalOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {staffMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {t("settings.noStaffFound")}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t("settings.rolesPermissions")}
          </CardTitle>
          <CardDescription>
            Access is enforced by the supported operational roles below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {STAFF_ROLE_OPTIONS.map((role) => (
            <Badge key={role.value} variant="secondary">{role.label}</Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            {t("settings.changePassword")}
          </CardTitle>
          <CardDescription>{t("settings.updateAccountPassword")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("settings.currentPassword")}</Label>
            <div className="relative max-w-md">
              <Input 
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t("settings.enterCurrentPassword")}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("settings.newPassword")}</Label>
            <div className="relative max-w-md">
              <Input 
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("settings.enterNewPassword")}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("settings.confirmPassword")}</Label>
            <div className="relative max-w-md">
              <Input 
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("settings.confirmNewPassword")}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Button onClick={handleChangePassword} variant="hero">
            {t("settings.changePassword")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t("settings.twoFactor")}
          </CardTitle>
          <CardDescription>{t("settings.addExtraSecurity")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${twoFactorEnabled ? "bg-success/10" : "bg-muted"}`}>
                <Lock className={`w-5 h-5 ${twoFactorEnabled ? "text-success" : "text-muted-foreground"}`} />
              </div>
              <div>
                <h4 className="font-medium">{t("settings.enable2FA")}</h4>
                <p className="text-sm text-muted-foreground">
                  {twoFactorEnabled ? t("settings.accountProtected") : t("settings.protectWith2FA")}
                </p>
              </div>
            </div>
            <Switch checked={twoFactorEnabled} disabled aria-label="Two-factor authentication is managed in Supabase" />
          </div>

          {twoFactorEnabled && (
            <div className="space-y-2 max-w-md">
              <Label>{t("settings.authMethod")}</Label>
              <Select value={twoFactorMethod} onValueChange={setTwoFactorMethod} disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="app">{t("settings.authenticatorApp")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {t("settings.securityPolicies")}
          </CardTitle>
          <CardDescription>These account-wide policies are managed in Supabase Auth settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("settings.sessionTimeoutMinutes")}</Label>
              <Select value={sessionTimeout} onValueChange={setSessionTimeout} disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 {t("settings.minutes")}</SelectItem>
                  <SelectItem value="30">30 {t("settings.minutes")}</SelectItem>
                  <SelectItem value="60">1 {t("settings.hour")}</SelectItem>
                  <SelectItem value="120">2 {t("settings.hours")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("settings.minPasswordLength")}</Label>
              <Select value={passwordMinLength} onValueChange={setPasswordMinLength} disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 {t("settings.characters")}</SelectItem>
                  <SelectItem value="8">8 {t("settings.characters")}</SelectItem>
                  <SelectItem value="10">10 {t("settings.characters")}</SelectItem>
                  <SelectItem value="12">12 {t("settings.characters")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div>
              <h4 className="font-medium">{t("settings.requireSpecialChars")}</h4>
              <p className="text-sm text-muted-foreground">{t("settings.passwordsMustInclude")}</p>
            </div>
            <Switch checked={requireSpecialChars} disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  );


  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return renderProfileSettings();
      case "company":
        return renderCompanySettings();
      case "notifications":
        return renderNotificationSettings();
      case "team":
        return renderTeamSettings();
      case "security":
        return renderSecuritySettings();
      case "automations":
        return <AutomationsTab />;
      case "integrations":
        return <IntegrationsTab />;
      case "audit":
        return <AuditTab />;
      default:
        return renderProfileSettings();
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t("settings.title")}</h1>
              <p className="text-muted-foreground">{t("settings.description")}</p>
            </div>

            {/* Horizontal Tabs */}
            <div className="flex items-center gap-2 border-b border-border pb-4 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearchParams({ tab: tab.id }, { replace: true });
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div>
              {renderContent()}
            </div>
          </div>
        </main>
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
    </div>
  );
}
