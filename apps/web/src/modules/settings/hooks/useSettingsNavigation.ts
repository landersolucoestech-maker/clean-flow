import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Bell, Building2, ClipboardList, Link2, Shield, User, Users, Zap } from "lucide-react";

export type SettingsTab = "profile" | "company" | "notifications" | "team" | "security" | "automations" | "integrations" | "audit";

const SETTINGS_TABS: SettingsTab[] = ["profile", "company", "notifications", "team", "security", "automations", "integrations", "audit"];

function isSettingsTab(value: string | null): value is SettingsTab {
  return value !== null && SETTINGS_TABS.includes(value as SettingsTab);
}

type Translate = (key: string) => string;

export function useSettingsNavigation(currentRole: string | null | undefined, t: Translate) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

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

  const tabs = useMemo(() => [
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
      { id: "integrations" as SettingsTab, label: "Integrations", icon: Link2 },
      { id: "audit" as SettingsTab, label: "Audit", icon: ClipboardList },
    ] : []),
  ], [canManageAutomations, canManageTeam, t]);

  const selectTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  return { activeTab, tabs, selectTab, canManageTeam, canManageAutomations };
}
