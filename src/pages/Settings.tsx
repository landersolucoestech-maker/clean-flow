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
import { ViewPermissionsModal } from "@/components/settings/ViewPermissionsModal";
import { CreateRoleModal } from "@/components/settings/CreateRoleModal";
import { EditRoleModal } from "@/components/settings/EditRoleModal";
import { DeleteRoleDialog } from "@/components/settings/DeleteRoleDialog";
import { TeamUserModal } from "@/components/settings/TeamUserModal";
import { AutomationsTab } from "@/components/settings/AutomationsTab";
import { IntegrationsTab } from "@/components/settings/IntegrationsTab";
import { TemplatesTab } from "@/components/settings/TemplatesTab";
import { AuditTab } from "@/components/settings/AuditTab";
import { useLanguage } from "@/contexts/LanguageContext";
import { PricingPlansCard } from "@/components/settings/PricingPlansCard";
import { useStaff, useDeleteStaff, Staff } from "@/hooks/useStaff";
import { useRoles, useDeleteRole, Role } from "@/hooks/useRoles";
import { useCompanySettings, useUpdateCompanySettings, BusinessHours } from "@/hooks/useCompanySettings";
import {
  User,
  Building2,
  Bell,
  CreditCard,
  Users,
  Shield,
  Globe,
  Smartphone,
  Mail,
  Key,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  Clock,
  Phone,
  MapPin,
  Upload,
  Plus,
  Landmark,
  UserPlus,
  AlertTriangle,
  Zap,
  Link2,
  FileText,
  ClipboardList,
  Star,
  Wallet,
  DollarSign,
} from "lucide-react";

type SettingsTab = "profile" | "company" | "notifications" | "billing" | "team" | "security" | "automations" | "integrations" | "templates" | "audit";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "pending" | "inactive";
}

interface PaymentMethod {
  id: string;
  type: "credit_card" | "bank_account";
  last4: string;
  expiryDate?: string;
  isDefault: boolean;
  bankName?: string;
}



export function Settings() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  
  // Fetch staff and roles from database
  const { data: staffMembers = [], isLoading: isLoadingStaff } = useStaff();
  const deleteStaff = useDeleteStaff();
  const { data: roles = [], isLoading: isLoadingRoles } = useRoles();
  const deleteRoleMutation = useDeleteRole();
  
  // Company settings from database
  const { data: companySettings, isLoading: isLoadingCompany } = useCompanySettings();
  const updateCompanySettings = useUpdateCompanySettings();
  
  // Profile Settings
  const [profileImage, setProfileImage] = useState("");
  const [fullName, setFullName] = useState("Deyvisson Lander");
  const [userEmail, setUserEmail] = useState("deyvisson@cleanpro.com");
  const [userPhone, setUserPhone] = useState("(00) 00000-0000");

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

  // Email Notification Settings
  const [jobUpdatesEmail, setJobUpdatesEmail] = useState(true);
  const [paymentNotificationsEmail, setPaymentNotificationsEmail] = useState(true);
  const [weeklyReportsEmail, setWeeklyReportsEmail] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  // SMS & Push Notification Settings
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [jobRemindersSms, setJobRemindersSms] = useState(true);
  const [paymentAlertsSms, setPaymentAlertsSms] = useState(true);
  const [customerFeedbackSms, setCustomerFeedbackSms] = useState(true);
  const [systemAlertsSms, setSystemAlertsSms] = useState(true);

  // Billing Settings - empty by default, will be populated when integrated with payment provider
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Team Settings - teamMembers kept for backwards compatibility but staff is primary
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  
  // Map display names to database values for filtering
  const roleNameToDbValue: Record<string, string> = {
    "admin": "admin",
    "cleaner": "cleaner",
    "cleaning manager team": "cleaning_manager",
    "driver": "driver",
    "office manager": "office_manager",
    "virtual assistant": "virtual_assistant",
  };
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("all");
  const [viewPermissionsModalOpen, setViewPermissionsModalOpen] = useState(false);
  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
  const [deleteRoleDialogOpen, setDeleteRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [teamUserModalOpen, setTeamUserModalOpen] = useState(false);
  const [teamUserModalMode, setTeamUserModalMode] = useState<"create" | "edit">("create");
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [useDatabase, setUseDatabase] = useState(false);

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


  const handleSaveProfile = () => {
    toast.success("Profile saved successfully!");
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

  const handleSaveNotifications = () => {
    toast.success("Notification preferences saved!");
  };

  // Removed handleInviteTeamMember - now using Add Team Member button directly

  const handleRemoveTeamMember = (id: string) => {
    setTeamMembers(teamMembers.filter((m) => m.id !== id));
    toast.success("Team member removed");
  };

  const handleOpenCreateUser = () => {
    setTeamUserModalMode("create");
    setSelectedTeamMember(null);
    setSelectedStaff(null);
    setUseDatabase(true);
    setTeamUserModalOpen(true);
  };

  const handleOpenEditUser = (member: TeamMember) => {
    setTeamUserModalMode("edit");
    setSelectedTeamMember(member);
    setSelectedStaff(null);
    setUseDatabase(false);
    setTeamUserModalOpen(true);
  };

  const handleOpenEditStaff = (staff: Staff) => {
    setTeamUserModalMode("edit");
    setSelectedTeamMember(null);
    setSelectedStaff(staff);
    setUseDatabase(true);
    setTeamUserModalOpen(true);
  };

  const handleSaveTeamUser = (user: TeamMember) => {
    if (teamUserModalMode === "create") {
      setTeamMembers([...teamMembers, user]);
    } else {
      setTeamMembers(teamMembers.map((m) => m.id === user.id ? user : m));
    }
  };

  const handleDeleteTeamUser = (userId: string) => {
    setTeamMembers(teamMembers.filter((m) => m.id !== userId));
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < parseInt(passwordMinLength)) {
      toast.error(`Password must be at least ${passwordMinLength} characters`);
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

  const handleRemovePaymentMethod = (id: string) => {
    setPaymentMethods(paymentMethods.filter((m) => m.id !== id));
    toast.success("Payment method removed");
  };

  const handleSetDefaultPaymentMethod = (id: string) => {
    setPaymentMethods(paymentMethods.map((m) => ({ ...m, isDefault: m.id === id })));
    toast.success("Default payment method updated");
  };


  const tabs = [
    { id: "profile" as SettingsTab, label: t("settings.profile"), icon: User },
    { id: "company" as SettingsTab, label: t("settings.company"), icon: Building2 },
    { id: "notifications" as SettingsTab, label: t("settings.notifications"), icon: Bell },
    { id: "billing" as SettingsTab, label: t("settings.billing"), icon: CreditCard },
    { id: "team" as SettingsTab, label: t("settings.team"), icon: Users },
    { id: "security" as SettingsTab, label: t("settings.security"), icon: Shield },
    { id: "automations" as SettingsTab, label: "Automations", icon: Zap },
    { id: "integrations" as SettingsTab, label: t("settings.integrations"), icon: Link2 },
    { id: "templates" as SettingsTab, label: "Templates", icon: FileText },
    { id: "audit" as SettingsTab, label: t("audit.title"), icon: ClipboardList },
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
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="w-4 h-4" />
            {t("settings.changePhoto")}
          </Button>
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
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder={t("settings.enterEmail")}
            />
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

  const renderBillingSettings = () => (
    <div className="space-y-6">
      {/* Pricing Plans */}
      <PricingPlansCard />

      {/* Payment Methods & Invoice History - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {t("settings.paymentMethods")}
            </CardTitle>
            <CardDescription>{t("settings.managePaymentMethods")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentMethods.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">{t("settings.noPaymentMethods")}</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => toast.info(t("settings.featureInDevelopment"))}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    {t("settings.addCard")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toast.info(t("settings.featureInDevelopment"))}>
                    <Landmark className="w-4 h-4 mr-2" />
                    {t("settings.addBankAccount")}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {method.type === "credit_card" ? (
                          <CreditCard className="w-5 h-5 text-primary" />
                        ) : (
                          <Landmark className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {method.type === "credit_card" ? t("settings.creditDebitCard") : t("settings.bankAccount")} {t("settings.ending")} {method.last4}
                        </h4>
                        {method.expiryDate && (
                          <p className="text-sm text-muted-foreground">{t("settings.expiresOn")} {method.expiryDate}</p>
                        )}
                        {method.bankName && (
                          <p className="text-sm text-muted-foreground">{method.bankName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {method.isDefault ? (
                        <Badge variant="default">{t("settings.default")}</Badge>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => handleSetDefaultPaymentMethod(method.id)}>
                          {t("settings.setAsDefault")}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => toast.info(t("settings.featureInDevelopment"))}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRemovePaymentMethod(method.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => toast.info(t("settings.featureInDevelopment"))}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    {t("settings.addCard")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toast.info(t("settings.featureInDevelopment"))}>
                    <Landmark className="w-4 h-4 mr-2" />
                    {t("settings.addBankAccount")}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Invoice & Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t("settings.invoicePaymentHistory")}
            </CardTitle>
            <CardDescription>{t("settings.viewBillingHistory")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">{t("settings.noBillingHistory")}</p>
              <p className="text-sm">{t("settings.billingHistoryDescription")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
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
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.name.toLowerCase()}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleOpenCreateUser} variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              {t("settings.addTeamMember")}
            </Button>
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
                  
                  // Convert display role name to database value for comparison
                  const selectedRoleDbValue = roleNameToDbValue[newMemberRole.toLowerCase()] || newMemberRole.toLowerCase();
                  const matchesRole = staffRole === selectedRoleDbValue;
                  
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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setSelectedStaff(staff);
                        setSelectedTeamMember(null);
                        setTeamUserModalMode("edit");
                        setUseDatabase(true);
                        setTeamUserModalOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => deleteStaff.mutate(staff.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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
          <CardDescription>{t("settings.createEditRoles")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingRoles ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("settings.loadingRoles")}
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">{t("settings.noRolesConfigured")}</p>
              <p className="text-sm mb-4">{t("settings.createFirstRole")}</p>
              <Button variant="outline" onClick={() => setCreateRoleModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t("settings.createNewRole")}
              </Button>
            </div>
          ) : (
            <>
              {roles.map((role) => (
                <div key={role.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{role.name}</h4>
                      {role.is_system && (
                        <Badge variant="secondary" className="text-xs">System</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {role.permissions.includes("*") ? t("settings.fullAccess") : `${role.permissions.length} ${t("settings.xPermissions")}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setSelectedRole(role);
                      setViewPermissionsModalOpen(true);
                    }}>
                      {t("settings.viewPermissions")}
                    </Button>
                    {!role.is_system && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedRole(role);
                          setEditRoleModalOpen(true);
                        }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedRole(role);
                          setDeleteRoleDialogOpen(true);
                        }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={() => setCreateRoleModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t("settings.createNewRole")}
              </Button>
            </>
          )}
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
            <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
          </div>

          {twoFactorEnabled && (
            <div className="space-y-2 max-w-md">
              <Label>{t("settings.authMethod")}</Label>
              <Select value={twoFactorMethod} onValueChange={setTwoFactorMethod}>
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
          <CardDescription>{t("settings.configureSecurityReqs")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("settings.sessionTimeoutMinutes")}</Label>
              <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
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
              <Select value={passwordMinLength} onValueChange={setPasswordMinLength}>
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
            <Switch checked={requireSpecialChars} onCheckedChange={setRequireSpecialChars} />
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
      case "billing":
        return renderBillingSettings();
      case "team":
        return renderTeamSettings();
      case "security":
        return renderSecuritySettings();
      case "automations":
        return <AutomationsTab />;
      case "integrations":
        return <IntegrationsTab />;
      case "templates":
        return <TemplatesTab />;
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
                    onClick={() => setActiveTab(tab.id)}
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

      {/* Modals */}
      <ViewPermissionsModal
        open={viewPermissionsModalOpen}
        onOpenChange={setViewPermissionsModalOpen}
        role={selectedRole}
      />
      <CreateRoleModal
        open={createRoleModalOpen}
        onOpenChange={setCreateRoleModalOpen}
      />
      <EditRoleModal
        open={editRoleModalOpen}
        onOpenChange={setEditRoleModalOpen}
        role={selectedRole}
      />
      <DeleteRoleDialog
        open={deleteRoleDialogOpen}
        onOpenChange={setDeleteRoleDialogOpen}
        role={selectedRole}
      />
      <TeamUserModal
        open={teamUserModalOpen}
        onOpenChange={(open) => {
          setTeamUserModalOpen(open);
          if (!open) {
            setUseDatabase(false);
            setSelectedStaff(null);
          }
        }}
        mode={teamUserModalMode}
        user={selectedTeamMember}
        roles={roles}
        onSave={handleSaveTeamUser}
        onDelete={handleDeleteTeamUser}
        useDatabase={useDatabase}
        staff={selectedStaff}
      />
    </div>
  );
}
