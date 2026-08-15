import { T } from "@/shared/components/i18n/T";
import type { Dispatch, SetStateAction } from "react";
import { AlertTriangle, Eye, EyeOff, Key, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type Translate = (key: string) => string;

interface SecuritySettingsSectionProps {
  t: Translate;
  showCurrentPassword: boolean;
  setShowCurrentPassword: Dispatch<SetStateAction<boolean>>;
  showNewPassword: boolean;
  setShowNewPassword: Dispatch<SetStateAction<boolean>>;
  showConfirmPassword: boolean;
  setShowConfirmPassword: Dispatch<SetStateAction<boolean>>;
  currentPassword: string;
  setCurrentPassword: Dispatch<SetStateAction<string>>;
  newPassword: string;
  setNewPassword: Dispatch<SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: Dispatch<SetStateAction<string>>;
  onChangePassword: () => void;
  twoFactorEnabled: boolean;
  twoFactorMethod: string;
  setTwoFactorMethod: Dispatch<SetStateAction<string>>;
  sessionTimeout: string;
  setSessionTimeout: Dispatch<SetStateAction<string>>;
  passwordMinLength: string;
  setPasswordMinLength: Dispatch<SetStateAction<string>>;
  requireSpecialChars: boolean;
}

export function SecuritySettingsSection(props: SecuritySettingsSectionProps) {
  const {
    t,
    showCurrentPassword,
    setShowCurrentPassword,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    onChangePassword,
    twoFactorEnabled,
    twoFactorMethod,
    setTwoFactorMethod,
    sessionTimeout,
    setSessionTimeout,
    passwordMinLength,
    setPasswordMinLength,
    requireSpecialChars,
  } = props;

  const passwordFields = [
    {
      key: "current",
      label: t("settings.currentPassword"),
      placeholder: t("settings.enterCurrentPassword"),
      value: currentPassword,
      setValue: setCurrentPassword,
      visible: showCurrentPassword,
      setVisible: setShowCurrentPassword,
    },
    {
      key: "new",
      label: t("settings.newPassword"),
      placeholder: t("settings.enterNewPassword"),
      value: newPassword,
      setValue: setNewPassword,
      visible: showNewPassword,
      setVisible: setShowNewPassword,
    },
    {
      key: "confirm",
      label: t("settings.confirmPassword"),
      placeholder: t("settings.confirmNewPassword"),
      value: confirmPassword,
      setValue: setConfirmPassword,
      visible: showConfirmPassword,
      setVisible: setShowConfirmPassword,
    },
  ];

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t("settings.changePassword")}
          </CardTitle>
          <CardDescription>{t("settings.updateAccountPassword")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordFields.map((field) => (
            <div key={field.key} className="max-w-md space-y-2">
              <Label>{field.label}</Label>
              <div className="relative">
                <Input
                  type={field.visible ? "text" : "password"}
                  value={field.value}
                  onChange={(event) => field.setValue(event.target.value)}
                  placeholder={field.placeholder}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => field.setVisible(!field.visible)}
                  aria-label={field.visible ? "Hide password" : "Show password"}
                >
                  {field.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}

          <Button onClick={onChangePassword} variant="hero">
            {t("settings.changePassword")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("settings.twoFactor")}
          </CardTitle>
          <CardDescription>{t("settings.addExtraSecurity")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${twoFactorEnabled ? "bg-success/10" : "bg-muted"}`}>
                <Lock className={`h-5 w-5 ${twoFactorEnabled ? "text-success" : "text-muted-foreground"}`} />
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
            <div className="max-w-md space-y-2">
              <Label>{t("settings.authMethod")}</Label>
              <Select value={twoFactorMethod} onValueChange={setTwoFactorMethod} disabled>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <AlertTriangle className="h-5 w-5" />
            {t("settings.securityPolicies")}
          </CardTitle>
          <CardDescription><T k="literal.settings.these_account_wide_policies_are_managed_in_s.253ddc4a" /></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("settings.sessionTimeoutMinutes")}</Label>
              <Select value={sessionTimeout} onValueChange={setSessionTimeout} disabled>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 {t("settings.characters")}</SelectItem>
                  <SelectItem value="8">8 {t("settings.characters")}</SelectItem>
                  <SelectItem value="10">10 {t("settings.characters")}</SelectItem>
                  <SelectItem value="12">12 {t("settings.characters")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
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
}
