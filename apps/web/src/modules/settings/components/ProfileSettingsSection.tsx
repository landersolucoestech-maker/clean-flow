import { T } from "@/shared/components/i18n/T";
import type { Dispatch, SetStateAction } from "react";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Translate = (key: string) => string;

interface ProfileSettingsSectionProps {
  t: Translate;
  fullName: string;
  setFullName: Dispatch<SetStateAction<string>>;
  userEmail: string;
  userPhone: string;
  setUserPhone: Dispatch<SetStateAction<string>>;
  onSave: () => void;
}

export function ProfileSettingsSection({
  t,
  fullName,
  setFullName,
  userEmail,
  userPhone,
  setUserPhone,
  onSave,
}: ProfileSettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {t("settings.personalInfo")}
        </CardTitle>
        <CardDescription>{t("settings.updateProfileInfo")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl font-semibold text-foreground">
            {fullName.charAt(0)}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("settings.fullName")}</Label>
            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder={t("settings.enterFullName")} />
          </div>
          <div className="space-y-2">
            <Label>{t("common.email")}</Label>
            <Input type="email" value={userEmail} readOnly aria-readonly="true" placeholder={t("settings.enterEmail")} />
            <p className="text-xs text-muted-foreground"><T k="literal.settings.login_email_changes_are_managed_by_an_admini.cb097ac5" /></p>
          </div>
        </div>

        <div className="max-w-md space-y-2">
          <Label>{t("common.phone")}</Label>
          <Input value={userPhone} onChange={(event) => setUserPhone(event.target.value)} placeholder="(00) 00000-0000" />
        </div>

        <Button onClick={onSave} variant="hero">
          {t("settings.saveChanges")}
        </Button>
      </CardContent>
    </Card>
  );
}
