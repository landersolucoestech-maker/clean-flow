import { Leads as LeadsPageContent } from "./pages/LeadsPageContent";
import { CrmLegacyPageBridge } from "../components/CrmLegacyPageBridge";

export function Leads() {
  return (
    <CrmLegacyPageBridge>
      <LeadsPageContent />
    </CrmLegacyPageBridge>
  );
}
