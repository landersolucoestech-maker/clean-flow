import fs from "node:fs";

const file = "apps/web/src/modules/settings/SettingsPage.tsx";
let source = fs.readFileSync(file, "utf8");

const importAnchor = 'import { AuditTab } from "@/components/settings/AuditTab";';
if (!source.includes(importAnchor)) throw new Error("Settings import anchor missing");
source = source.replace(
  importAnchor,
  `${importAnchor}\nimport { NotificationSettingsSection } from "./components/NotificationSettingsSection";\nimport { TeamSettingsSection } from "./components/TeamSettingsSection";\nimport { SecuritySettingsSection } from "./components/SecuritySettingsSection";`,
);

const roleStart = source.indexOf("const STAFF_ROLE_OPTIONS = [");
const settingsStart = source.indexOf("export function Settings()", roleStart);
if (roleStart < 0 || settingsStart < 0) throw new Error("Settings role options block missing");
source = source.slice(0, roleStart) + source.slice(settingsStart);

function removeRenderBlock(startMarker, nextMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(nextMarker, start);
  if (start < 0 || end < 0) throw new Error(`Could not isolate ${startMarker}`);
  source = source.slice(0, start) + source.slice(end);
}

removeRenderBlock("  const renderNotificationSettings = () => (", "  const renderTeamSettings = () => (");
removeRenderBlock("  const renderTeamSettings = () => (", "  const renderSecuritySettings = () => (");
removeRenderBlock("  const renderSecuritySettings = () => (", "\n\n  const renderContent = () => {");

const notificationsCase = '      case "notifications":\n        return renderNotificationSettings();';
if (!source.includes(notificationsCase)) throw new Error("Notifications render case missing");
source = source.replace(
  notificationsCase,
  `      case "notifications":\n        return (\n          <NotificationSettingsSection\n            t={t}\n            jobUpdatesEmail={jobUpdatesEmail}\n            setJobUpdatesEmail={setJobUpdatesEmail}\n            jobRemindersSms={jobRemindersSms}\n            setJobRemindersSms={setJobRemindersSms}\n            paymentNotificationsEmail={paymentNotificationsEmail}\n            setPaymentNotificationsEmail={setPaymentNotificationsEmail}\n            paymentAlertsSms={paymentAlertsSms}\n            setPaymentAlertsSms={setPaymentAlertsSms}\n            customerFeedbackSms={customerFeedbackSms}\n            setCustomerFeedbackSms={setCustomerFeedbackSms}\n            systemAlertsSms={systemAlertsSms}\n            setSystemAlertsSms={setSystemAlertsSms}\n            weeklyReportsEmail={weeklyReportsEmail}\n            setWeeklyReportsEmail={setWeeklyReportsEmail}\n            onSave={handleSaveNotifications}\n          />\n        );`,
);

const teamCase = '      case "team":\n        return renderTeamSettings();';
if (!source.includes(teamCase)) throw new Error("Team render case missing");
source = source.replace(
  teamCase,
  `      case "team":\n        return (\n          <TeamSettingsSection\n            t={t}\n            staffMembers={staffMembers}\n            isLoadingStaff={isLoadingStaff}\n            teamSearchQuery={teamSearchQuery}\n            setTeamSearchQuery={setTeamSearchQuery}\n            newMemberRole={newMemberRole}\n            setNewMemberRole={setNewMemberRole}\n            canManageTeam={canManageTeam}\n            onCreateUser={handleOpenCreateUser}\n            onEditStaff={(staff) => {\n              setSelectedStaff(staff);\n              setTeamUserModalMode("edit");\n              setTeamUserModalOpen(true);\n            }}\n          />\n        );`,
);

const securityCase = '      case "security":\n        return renderSecuritySettings();';
if (!source.includes(securityCase)) throw new Error("Security render case missing");
source = source.replace(
  securityCase,
  `      case "security":\n        return (\n          <SecuritySettingsSection\n            t={t}\n            showCurrentPassword={showCurrentPassword}\n            setShowCurrentPassword={setShowCurrentPassword}\n            showNewPassword={showNewPassword}\n            setShowNewPassword={setShowNewPassword}\n            showConfirmPassword={showConfirmPassword}\n            setShowConfirmPassword={setShowConfirmPassword}\n            currentPassword={currentPassword}\n            setCurrentPassword={setCurrentPassword}\n            newPassword={newPassword}\n            setNewPassword={setNewPassword}\n            confirmPassword={confirmPassword}\n            setConfirmPassword={setConfirmPassword}\n            onChangePassword={handleChangePassword}\n            twoFactorEnabled={twoFactorEnabled}\n            twoFactorMethod={twoFactorMethod}\n            setTwoFactorMethod={setTwoFactorMethod}\n            sessionTimeout={sessionTimeout}\n            setSessionTimeout={setSessionTimeout}\n            passwordMinLength={passwordMinLength}\n            setPasswordMinLength={setPasswordMinLength}\n            requireSpecialChars={requireSpecialChars}\n          />\n        );`,
);

if (source.includes("renderNotificationSettings") || source.includes("renderTeamSettings") || source.includes("renderSecuritySettings")) {
  throw new Error("Extracted Settings render functions remain");
}

fs.writeFileSync(file, source);
