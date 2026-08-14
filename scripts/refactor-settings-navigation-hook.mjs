import fs from "node:fs";

const file = "apps/web/src/modules/settings/SettingsPage.tsx";
let source = fs.readFileSync(file, "utf8");

const componentAnchor = 'import { SettingsTabsNavigation } from "./components/SettingsTabsNavigation";';
if (!source.includes(componentAnchor)) throw new Error("Settings tabs component import missing");
source = source.replace(componentAnchor, `${componentAnchor}\nimport { useSettingsNavigation } from "./hooks/useSettingsNavigation";`);
source = source.replace('import { useLocation, useSearchParams } from "react-router-dom";\n', "");

const typeStart = source.indexOf('type SettingsTab = "profile"');
const componentStart = source.indexOf("export function Settings()", typeStart);
if (typeStart < 0 || componentStart < 0) throw new Error("Inline settings navigation types not found");
source = source.slice(0, typeStart) + source.slice(componentStart);

const routeState = '  const location = useLocation();\n  const [searchParams, setSearchParams] = useSearchParams();\n  const requestedTab = searchParams.get("tab");\n  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");\n';
if (!source.includes(routeState)) throw new Error("Inline settings route state not found");
source = source.replace(routeState, "");

const roleStart = source.indexOf("  const currentRole = currentStaff?.staff_roles?.role;");
const companyMarker = "  // Company settings from database";
const roleEnd = source.indexOf(companyMarker, roleStart);
if (roleStart < 0 || roleEnd < 0) throw new Error("Settings role navigation block not found");
const currentRoleBlock = `  const currentRole = currentStaff?.staff_roles?.role;\n  const { activeTab, tabs, selectTab, canManageTeam, canManageAutomations } = useSettingsNavigation(currentRole, t);\n\n`;
source = source.slice(0, roleStart) + currentRoleBlock + source.slice(roleEnd);

const tabsStart = source.indexOf("  const tabs = [");
const renderCompanyStart = source.indexOf("  const renderCompanySettings = () => (", tabsStart);
if (tabsStart < 0 || renderCompanyStart < 0) throw new Error("Inline Settings tabs catalog not found");
source = source.slice(0, tabsStart) + source.slice(renderCompanyStart);

const navCallback = `              onChange={(tab) => {\n                setActiveTab(tab);\n                setSearchParams({ tab }, { replace: true });\n              }}`;
if (!source.includes(navCallback)) throw new Error("Settings navigation callback not found");
source = source.replace(navCallback, "              onChange={selectTab}");

if (source.includes("useSearchParams") || source.includes("setSearchParams") || source.includes("const tabs = [")) {
  throw new Error("Inline settings navigation remains");
}

fs.writeFileSync(file, source);
