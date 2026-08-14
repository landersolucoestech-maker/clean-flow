import fs from "node:fs";

const file = "apps/web/src/modules/settings/SettingsPage.tsx";
let source = fs.readFileSync(file, "utf8");

const importAnchor = 'import { SecuritySettingsSection } from "./components/SecuritySettingsSection";';
if (!source.includes(importAnchor)) throw new Error("Settings component import anchor missing");
source = source.replace(
  importAnchor,
  `${importAnchor}\nimport { ProfileSettingsSection } from "./components/ProfileSettingsSection";\nimport { SettingsTabsNavigation } from "./components/SettingsTabsNavigation";`,
);

const profileStart = source.indexOf("  const renderProfileSettings = () => (");
const companyStart = source.indexOf("  const renderCompanySettings = () => (", profileStart);
if (profileStart < 0 || companyStart < 0) throw new Error("Profile render block not found");
source = source.slice(0, profileStart) + source.slice(companyStart);

const profileCase = '      case "profile":\n        return renderProfileSettings();';
if (!source.includes(profileCase)) throw new Error("Profile render case missing");
source = source.replace(
  profileCase,
  `      case "profile":\n        return (\n          <ProfileSettingsSection\n            t={t}\n            fullName={fullName}\n            setFullName={setFullName}\n            userEmail={userEmail}\n            userPhone={userPhone}\n            setUserPhone={setUserPhone}\n            onSave={handleSaveProfile}\n          />\n        );`,
);

const defaultCase = '      default:\n        return renderProfileSettings();';
if (!source.includes(defaultCase)) throw new Error("Default profile case missing");
source = source.replace(
  defaultCase,
  `      default:\n        return (\n          <ProfileSettingsSection\n            t={t}\n            fullName={fullName}\n            setFullName={setFullName}\n            userEmail={userEmail}\n            userPhone={userPhone}\n            setUserPhone={setUserPhone}\n            onSave={handleSaveProfile}\n          />\n        );`,
);

const tabsComment = "            {/* Horizontal Tabs */}";
const contentComment = "            {/* Content Area */}";
const tabsStart = source.indexOf(tabsComment);
const contentStart = source.indexOf(contentComment, tabsStart);
if (tabsStart < 0 || contentStart < 0) throw new Error("Settings tabs JSX block not found");
const tabsReplacement = `${tabsComment}\n            <SettingsTabsNavigation\n              tabs={tabs}\n              activeTab={activeTab}\n              onChange={(tab) => {\n                setActiveTab(tab);\n                setSearchParams({ tab }, { replace: true });\n              }}\n            />\n\n`;
source = source.slice(0, tabsStart) + tabsReplacement + source.slice(contentStart);

if (source.includes("renderProfileSettings")) throw new Error("Profile render function remains");
fs.writeFileSync(file, source);
