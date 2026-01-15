import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Shield,
  Key,
  Mail,
  Phone,
  Lock,
  UserPlus,
  Users,
} from "lucide-react";

export function AdminAuthSettings() {
  const { t } = useLanguage();
  const { admins, isLoadingAdmins } = usePlatformAdmin();

  const authProviders = [
    { id: "email", name: "Email/Password", icon: Mail, enabled: true },
    { id: "phone", name: "Phone (SMS)", icon: Phone, enabled: false },
    { id: "google", name: "Google OAuth", icon: Key, enabled: false },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("admin.auth.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin.auth.description")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Auth Providers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                {t("admin.auth.providers")}
              </CardTitle>
              <CardDescription>
                {t("admin.auth.providers_description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {authProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-accent/50 border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-background">
                      <provider.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{provider.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {provider.enabled ? t("admin.auth.enabled") : t("admin.auth.disabled")}
                      </p>
                    </div>
                  </div>
                  <Switch checked={provider.enabled} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Lock className="w-5 h-5 text-secondary" />
                </div>
                {t("admin.auth.security_settings")}
              </CardTitle>
              <CardDescription>
                {t("admin.auth.security_description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-xl bg-accent/50 border border-border">
                <div>
                  <p className="font-medium text-foreground">{t("admin.auth.email_confirmation")}</p>
                  <p className="text-sm text-muted-foreground">{t("admin.auth.email_confirmation_desc")}</p>
                </div>
                <Switch checked={true} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-accent/50 border border-border">
                <div>
                  <p className="font-medium text-foreground">{t("admin.auth.mfa")}</p>
                  <p className="text-sm text-muted-foreground">{t("admin.auth.mfa_desc")}</p>
                </div>
                <Switch checked={false} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-accent/50 border border-border">
                <div>
                  <p className="font-medium text-foreground">{t("admin.auth.session_timeout")}</p>
                  <p className="text-sm text-muted-foreground">{t("admin.auth.session_timeout_desc")}</p>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30">24h</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Admins */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-border">
            <div>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Users className="w-5 h-5 text-success" />
                </div>
                {t("admin.auth.platform_admins")}
              </CardTitle>
              <CardDescription className="mt-1">
                {t("admin.auth.platform_admins_desc")}
              </CardDescription>
            </div>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              {t("admin.auth.add_admin")}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingAdmins ? (
              <div className="text-center text-muted-foreground py-8">
                {t("common.loading")}...
              </div>
            ) : admins.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>{t("admin.auth.no_admins")}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg">
                        <span className="text-primary-foreground font-medium">
                          {admin.name?.[0] || admin.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{admin.name || admin.email}</p>
                        <p className="text-sm text-muted-foreground">{admin.email}</p>
                      </div>
                    </div>
                    <Badge className={admin.is_active 
                      ? "bg-success/10 text-success border border-success/20" 
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                    }>
                      {admin.is_active ? t("admin.auth.active") : t("admin.auth.inactive")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}